// Read-only clients use the existing Codex daemon; this never starts an agent turn.
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');

class RpcClient {
  constructor({ command = 'codex', args = ['app-server', 'proxy'], timeout = 15000 } = {}) {
    this.command = command;
    this.args = args;
    this.timeout = timeout;
    this.pending = new Map();
    this.nextId = 0;
  }

  async connect() {
    if (this.process) throw new Error('RPC client is already connected');
    const child = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.process = child;
    this.stderr = '';
    child.stderr.on('data', chunk => { this.stderr = (this.stderr + chunk).slice(-2000); });
    child.stdin.on('error', error => this.fail(error));
    child.on('error', error => this.fail(error));
    child.on('exit', () => this.fail(new Error('Codex app-server disconnected' + (this.stderr ? ': ' + this.stderr.trim() : ''))));
    this.lines = createInterface({ input: child.stdout });
    this.lines.on('line', line => {
      let message;
      try { message = JSON.parse(line); } catch { return; }
      // Server requests (approval/questions) belong to the owning client. A monitor
      // must never answer them or silently approve work in another session.
      if (message.method || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
    try {
      await this.request('initialize', {
        clientInfo: { name: 'super_app_workflow', title: 'Super App workflow', version: '1.0.0' },
        capabilities: { experimentalApi: true },
      });
      this.process.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
      return this;
    } catch (error) { this.close(); throw error; }
  }

  request(method, params = {}) {
    if (!this.process || this.process.exitCode !== null) return Promise.reject(new Error('Codex RPC is not connected'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex RPC timeout: ${method}`));
      }, this.timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.process.stdin.write(JSON.stringify({ id, method, params }) + '\n');
    });
  }

  fail(error) {
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }

  close() {
    this.fail(new Error('Codex RPC client closed'));
    this.lines?.close();
    this.process?.stdin.end();
    this.process?.kill(); // Only our proxy process, never the shared daemon.
    this.process = null;
  }
}

module.exports = { RpcClient };
