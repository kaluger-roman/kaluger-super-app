// Read-only clients use the existing Codex daemon; this never starts an agent turn.
const { spawn } = require('node:child_process');
const { createConnection } = require('node:net');
const { homedir } = require('node:os');
const { join } = require('node:path');
const { createInterface } = require('node:readline');

const proxySocketPath = args => {
  if (args[0] !== 'app-server' || args[1] !== 'proxy') return null;
  let socketPath = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'app-server-control', 'app-server-control.sock');
  for (let index = 2; index < args.length; index += 1) {
    if (args[index] === '--sock' && args[index + 1] && !args[index + 1].startsWith('--')) socketPath = args[++index];
    else if (args[index].startsWith('--sock=') && args[index].slice(7)) socketPath = args[index].slice(7);
    else throw new Error('Codex daemon monitoring supports app-server proxy [--sock PATH]');
  }
  return socketPath;
};

class RpcClient {
  constructor({ command = 'codex', args = ['app-server', 'proxy'], timeout = 15000 } = {}) {
    this.command = command;
    this.args = args;
    this.timeout = timeout;
    this.pending = new Map();
    this.nextId = 0;
    this.process = null;
    this.socket = null;
    this.connected = false;
    this.connecting = false;
  }

  async connect() {
    if (this.process || this.socket || this.connecting) throw new Error('RPC client is already connected');
    this.connecting = true;
    try {
      const socketPath = proxySocketPath(this.args);
      if (socketPath) await this.connectSocket(socketPath);
      else this.connectStdio();
      await this.request('initialize', {
        clientInfo: { name: 'super_app_workflow', title: 'Super App workflow', version: '1.0.0' },
        capabilities: { experimentalApi: true },
      });
      this.send({ method: 'initialized' });
      return this;
    } catch (error) { this.close(); throw error; }
    finally { this.connecting = false; }
  }

  connectSocket(socketPath) {
    // The CLI proxy copies raw bytes; unix:// listeners require an HTTP Upgrade
    // and WebSocket text frames, not JSONL written directly to that proxy.
    const WebSocket = require('ws');
    return new Promise((resolve, reject) => {
      const socket = new WebSocket('ws://localhost/', {
        createConnection: options => createConnection({ ...options, path: socketPath }),
        handshakeTimeout: this.timeout,
        perMessageDeflate: false,
      });
      this.socket = socket;
      socket.on('open', () => {
        if (this.socket !== socket) { socket.terminate(); reject(new Error('Codex RPC client closed')); return; }
        this.connected = true; resolve();
      });
      socket.on('message', data => { if (this.socket === socket) this.receive(data.toString()); });
      socket.on('error', error => { if (this.socket === socket) this.fail(error); reject(error); });
      socket.on('close', () => {
        const error = new Error('Codex app-server disconnected');
        if (this.socket === socket) this.fail(error);
        reject(error);
      });
    });
  }

  connectStdio() {
    const child = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.process = child;
    this.connected = true;
    this.stderr = '';
    child.stderr.on('data', chunk => { this.stderr = (this.stderr + chunk).slice(-2000); });
    child.stdin.on('error', error => { if (this.process === child) this.fail(error); });
    child.on('error', error => { if (this.process === child) this.fail(error); });
    child.on('exit', () => {
      if (this.process === child) this.fail(new Error('Codex app-server disconnected' + (this.stderr ? ': ' + this.stderr.trim() : '')));
    });
    this.lines = createInterface({ input: child.stdout });
    this.lines.on('line', line => { if (this.process === child) this.receive(line); });
  }

  receive(raw) {
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    // Server requests (approval/questions) belong to the owning client. A monitor
    // must never answer them or silently approve work in another session.
    if (!message || message.method || !this.pending.has(message.id)) return;
    const pending = this.pending.get(message.id);
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result);
  }

  send(message) {
    if (!this.connected) throw new Error('Codex RPC is not connected');
    const socket = this.socket;
    if (socket) socket.send(JSON.stringify(message), error => { if (error && this.socket === socket) this.fail(error); });
    else this.process.stdin.write(JSON.stringify(message) + '\n');
  }

  request(method, params = {}) {
    if (!this.connected) return Promise.reject(new Error('Codex RPC is not connected'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex RPC timeout: ${method}`));
      }, this.timeout);
      this.pending.set(id, { resolve, reject, timer });
      try { this.send({ id, method, params }); }
      catch (error) { this.fail(error); }
    });
  }

  fail(error) {
    this.connected = false;
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }

  close() {
    this.fail(new Error('Codex RPC client closed'));
    this.lines?.close();
    const child = this.process;
    const socket = this.socket;
    this.process = null;
    this.socket = null;
    child?.stdin.end();
    child?.kill(); // Only our standalone stdio process, never the shared daemon.
    socket?.terminate(); // Disconnect this monitor only.
  }
}

module.exports = { RpcClient, proxySocketPath };
