import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { RpcClient } = require('../codex-rpc.cjs');
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
