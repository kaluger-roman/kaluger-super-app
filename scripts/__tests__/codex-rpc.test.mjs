import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocketServer } from 'ws';
const require = createRequire(import.meta.url);
const { RpcClient, proxySocketPath } = require('../codex-rpc.cjs');
const server = `const readline=require('node:readline');const lines=readline.createInterface({input:process.stdin});
lines.on('line',line=>{const m=JSON.parse(line);if(!m.id)return;
if(m.method==='never')return;
if(m.method==='disconnect'){process.exit(0);return;}
if(m.method==='failure'){console.log(JSON.stringify({id:m.id,error:{code:-1,message:'fixture denied'}}));return;}
console.log('non-json diagnostic');console.log(JSON.stringify({method:'notification',params:{}}));
console.log(JSON.stringify({id:m.id,result:{method:m.method,params:m.params}}));});`;
const client = () => new RpcClient({command:process.execPath,args:['-e',server],timeout:2000});

test('RPC initializes and matches concurrent responses while ignoring notifications',async()=>{
 const rpc=client();try{await rpc.connect();const results=await Promise.all([rpc.request('first',{n:1}),rpc.request('second',{n:2})]);assert.deepEqual(results.map(r=>r.params.n),[1,2]);}finally{rpc.close()}
});
test('RPC errors, timeout and disconnect reject without orphaned requests',async()=>{
 const rpc=client();try{await rpc.connect();await assert.rejects(rpc.request('failure'),/fixture denied/);rpc.timeout=50;await assert.rejects(rpc.request('never'),/timeout/);assert.equal(rpc.pending.size,0);await assert.rejects(rpc.request('disconnect'),/disconnected/);}finally{rpc.close()}
});
test('closing proxy rejects pending requests and does not spawn a replacement',async()=>{
 const rpc=client();await rpc.connect();const pending=rpc.request('never');rpc.close();await assert.rejects(pending,/closed/);assert.equal(rpc.process,null);await assert.rejects(rpc.request('later'),/not connected/);
});

test('daemon socket selection respects CODEX_HOME and explicit paths without swallowing invalid flags',()=>{
 const previous=process.env.CODEX_HOME;
 try{
  process.env.CODEX_HOME='/tmp/codex custom home';
  assert.equal(proxySocketPath(['app-server','proxy']),'/tmp/codex custom home/app-server-control/app-server-control.sock');
  assert.equal(proxySocketPath(['app-server','proxy','--sock','/tmp/custom.sock']),'/tmp/custom.sock');
  assert.equal(proxySocketPath(['app-server','proxy','--sock=/tmp/equal.sock']),'/tmp/equal.sock');
  assert.equal(proxySocketPath(['app-server','--listen','stdio://']),null);
  for(const extra of [['--sock'],['--sock',''],['--sock='],['--unknown']])assert.throws(()=>proxySocketPath(['app-server','proxy',...extra]),/supports/);
 }finally{if(previous===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=previous}
});

const socketFixture = async (t, handler) => {
 const directory=mkdtempSync(join(tmpdir(),'codex-rpc-'));
 const socketPath=join(directory,'app.sock');
 const server=createServer();
 const sockets=new WebSocketServer({server,perMessageDeflate:false});
 const messages=[];
 sockets.on('connection',socket=>socket.on('message',data=>{
  const message=JSON.parse(data.toString());messages.push(message);handler(message,socket);
 }));
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(socketPath,resolve)});
 t.after(async()=>{
  for(const socket of sockets.clients)socket.terminate();
  await new Promise(resolve=>sockets.close(resolve));
  await new Promise(resolve=>server.close(resolve));
  rmSync(directory,{recursive:true,force:true});
 });
 return {socketPath,messages,server};
};
const daemonClient = socketPath => new RpcClient({command:'codex-must-not-be-spawned',args:['app-server','proxy','--sock',socketPath],timeout:1000});

test('daemon proxy performs WebSocket handshake on Unix socket and never answers server requests',async t=>{
 const fixture=await socketFixture(t,(message,socket)=>{
  if(!message.id)return;
  socket.send('non-json diagnostic');
  socket.send(JSON.stringify(null));
  socket.send(JSON.stringify({method:'notification',params:{}}));
  socket.send(JSON.stringify({id:message.id,method:'item/commandExecution/requestApproval',params:{}}));
  setTimeout(()=>socket.send(JSON.stringify({id:message.id,result:{method:message.method,params:message.params}})),message.method==='first'?20:0);
 });
 const rpc=daemonClient(fixture.socketPath);
 try{
  await rpc.connect();assert.equal(rpc.process,null);
  const results=await Promise.all([rpc.request('first',{n:1}),rpc.request('second',{n:2})]);
  assert.deepEqual(results.map(result=>result.params.n),[1,2]);
  assert.deepEqual(fixture.messages.map(message=>message.method),['initialize','initialized','first','second']);
 }finally{rpc.close()}
 assert.equal(fixture.server.listening,true);
 const another=daemonClient(fixture.socketPath);
 try{await another.connect()}finally{another.close()}
});

test('WebSocket RPC errors, timeout and disconnect reject and clear pending requests',async t=>{
 const fixture=await socketFixture(t,(message,socket)=>{
  if(!message.id||message.method==='never')return;
  if(message.method==='disconnect'){socket.terminate();return}
  socket.send(JSON.stringify(message.method==='failure'?{id:message.id,error:{message:'fixture denied'}}:{id:message.id,result:{}}));
 });
 const rpc=daemonClient(fixture.socketPath);
 try{
  await rpc.connect();
  await assert.rejects(rpc.request('failure'),/fixture denied/);
  rpc.timeout=50;await assert.rejects(rpc.request('never'),/timeout/);assert.equal(rpc.pending.size,0);
  const waiting=rpc.request('never');
  await assert.rejects(rpc.request('disconnect'),/disconnected/);
  await assert.rejects(waiting,/disconnected/);assert.equal(rpc.pending.size,0);
  await assert.rejects(rpc.request('later'),/not connected/);
 }finally{rpc.close()}
});

test('closing WebSocket client rejects pending reads and leaves the daemon running',async t=>{
 const fixture=await socketFixture(t,(message,socket)=>{
  if(message.method==='initialize')socket.send(JSON.stringify({id:message.id,result:{}}));
 });
 const rpc=daemonClient(fixture.socketPath);
 await rpc.connect();const waiting=rpc.request('never');rpc.close();
 await assert.rejects(waiting,/closed/);assert.equal(rpc.pending.size,0);assert.equal(rpc.socket,null);
 assert.equal(fixture.server.listening,true);
 await assert.rejects(rpc.request('later'),/not connected/);
});

test('Unix WebSocket handshake is bounded when a listener never upgrades',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'codex-rpc-'));
 const socketPath=join(directory,'app.sock');
 const connections=new Set();
 const server=createNetServer(socket=>{connections.add(socket);socket.on('close',()=>connections.delete(socket));socket.resume()});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(socketPath,resolve)});
 t.after(async()=>{for(const socket of connections)socket.destroy();await new Promise(resolve=>server.close(resolve));rmSync(directory,{recursive:true,force:true})});
 const rpc=daemonClient(socketPath);rpc.timeout=100;
 await assert.rejects(rpc.connect(),/handshake.*timed out/);
 assert.equal(rpc.socket,null);assert.equal(rpc.pending.size,0);
});
