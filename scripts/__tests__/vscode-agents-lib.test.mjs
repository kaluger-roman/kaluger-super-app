import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { Store, threadView, stateOf, statusOf, issueTakeCommand, resumeCommand, rankIssues, IssueBoard, underRoots, FEED_MAX } = require('../vscode-agents/lib.js');
const now = Math.floor(Date.now()/1000);
const row = (id, extra = {}) => ({ id, cwd:'/work/app', updatedAt:now, createdAt:now, name:id, preview:'issue #12', status:{type:'idle'}, turns:[], ...extra });
const settings = () => ({ roots:['/work/app'], recentDays:3, historyFallback:false });

test('Codex approval and question flags take priority over busy; unknown is not busy', () => {
  assert.equal(statusOf({type:'active',activeFlags:['waitingOnApproval']}),'waiting');
  assert.equal(statusOf({type:'active',activeFlags:['waitingOnUserInput']}),'question');
  assert.equal(statusOf({type:'active',activeFlags:[]}),'busy');
  assert.equal(statusOf({type:'future'}),'unknown');
  assert.equal(underRoots(['/work/app'],'/work/application'),false);
});

test('feed shows actual failed command evidence and preserves first issue association', () => {
  const thread = row('parent',{ turns:[{startedAt:now,status:'completed',items:[
    {id:'u1',type:'userMessage',content:[{type:'text',text:'$auto-bug-fix --new issue #12'}]},
    {id:'c1',type:'commandExecution',command:'npm test',status:'completed',exitCode:1,aggregatedOutput:'regression failed'},
    {id:'a1',type:'agentMessage',text:'PR https://github.com/kaluger-roman/kaluger-super-app/pull/205'},
    {id:'u2',type:'userMessage',content:[{type:'text',text:'related issue #99'}]},
  ]}] });
  const view=threadView(thread,[row('child',{parentThreadId:'parent',agentRole:'review',status:{type:'active',activeFlags:[]}})]);
  assert.equal(view.issue,12); assert.equal(view.pr.num,205);
  assert.equal(view.feed[1].error,true); assert.match(view.feed[1].result,/regression failed/);
  assert.equal(view.lastPrompt,'related issue #99'); assert.equal(view.subagents()[0].type,'review');
});

test('feed bounded at 150 without dropping last user/answer metadata', () => {
  const view=threadView(row('a',{turns:[{status:'completed',items:Array.from({length:200},(_,i)=>({id:String(i),type:'agentMessage',text:`message ${i}`}))}]}));
  assert.equal(view.feed.length,FEED_MAX);assert.equal(view.lastText.text,'message 199');
});

test('store paginates and includes old loaded threads, filters unrelated paths, prioritizes attention',async()=>{
  const a=row('a'), b=row('b',{status:{type:'active',activeFlags:['waitingOnApproval']},updatedAt:now-500000}), other=row('other',{cwd:'/work/other'});
  const calls=[];
  const client={connect:async()=>{},close(){},request:async(method,args)=>{
    calls.push([method,args]);
    if(method==='thread/list') return args.cursor ? {data:[other],nextCursor:null} : {data:[a],nextCursor:'next'};
    if(method==='thread/loaded/list')return {data:['b'],nextCursor:null};
    if(method==='thread/read')return {thread:args.threadId==='a'?a:b};
    throw Error(method);
  }};
  const store=new Store({settings,createClient:()=>client});await store.refresh();
  assert.equal(calls.filter(([method])=>method==='thread/list').length,2);
  assert.deepEqual(store.liveSessions.map(s=>s.id),['b','a']); assert.equal(stateOf(store.liveSessions[0]),'waiting');
  assert.equal(store.byIssue.get(12).id,'b'); assert.equal(store.byId('other'),null);
});

test('loaded empty paginated thread retains its live status before the first user message and loads later history',async()=>{
  let materialized=false;
  const empty=row('empty',{historyMode:'paginated',preview:'',name:null});
  const archived=row('history',{status:{type:'notLoaded'},turns:[{status:'completed',items:[{id:'answer',type:'agentMessage',text:'saved answer'}]}]});
  const client={connect:async()=>{},close(){},request:async(method,args)=>{
    if(method==='thread/list')return {data:[archived],nextCursor:null};
    if(method==='thread/loaded/list')return {data:['empty'],nextCursor:null};
    if(method==='thread/read')return {thread:args.threadId==='empty'?{...empty,status:{type:materialized?'active':'idle',activeFlags:[]}}:archived};
    if(method==='thread/turns/list'){
      if(!materialized)throw Error('thread empty is not materialized yet; thread/turns/list is unavailable before first user message');
      return {data:[{status:'inProgress',items:[{id:'first',type:'userMessage',content:[{type:'text',text:'first prompt'}]}]}],nextCursor:null};
    }
    throw Error(method);
  }};
  const store=new Store({settings,createClient:()=>client});await store.refresh();
  assert.equal(store.agentsOk,true);assert.equal(store.error,null);
  assert.deepEqual(store.liveSessions.map(session=>[session.id,stateOf(session)]),[['empty','idle']]);
  assert.deepEqual(store.byId('empty').feed,[]);assert.equal(store.recentSessions[0].tr.lastText.text,'saved answer');
  materialized=true;await store.refresh();
  assert.equal(store.agentsOk,true);assert.equal(stateOf(store.liveSessions[0]),'busy');
  assert.equal(store.byId('empty').lastPrompt,'first prompt');assert.equal(store.byId('empty').feed[0].kind,'user');
});

test('history errors other than the precise loaded-before-first-message case remain visible',async()=>{
  for(const [loaded,message] of [
    [true,'permission denied'],
    [true,'disconnected'],
    [true,'thread another is not materialized yet; thread/turns/list is unavailable before first user message'],
    [false,'thread target is not materialized yet; thread/turns/list is unavailable before first user message'],
  ]){
    const thread=row('target',{historyMode:'paginated'});
    const client={connect:async()=>{},close(){},request:async method=>{
      if(method==='thread/list')return {data:[thread],nextCursor:null};
      if(method==='thread/loaded/list')return {data:loaded?['target']:[],nextCursor:null};
      if(method==='thread/read')return {thread};
      throw Error(message);
    }};
    const store=new Store({settings,createClient:()=>client});await store.refresh();
    assert.equal(store.agentsOk,false);assert.equal(store.error,message);assert.equal(store.liveSessions.length,0);
  }
});

test('failed poll clears live status and retains known history with explicit error',async()=>{
  let fail=false;
  const client={connect:async()=>{},close(){},request:async method=>{
    if(fail)throw Error('disconnected');
    if(method==='thread/list')return {data:[row('a')],nextCursor:null};
    if(method==='thread/loaded/list')return {data:[],nextCursor:null};
    return {thread:row('a')};
  }};
  const store=new Store({settings,createClient:()=>client});await store.refresh();fail=true;await store.refresh();
  assert.equal(store.agentsOk,false);assert.match(store.error,/disconnected/);assert.equal(store.liveSessions.length,0);assert.equal(store.recentSessions.length,1);
});

test('fallback exposes history only, never fabricated live sessions',async()=>{
  let attempts=0;
  const store=new Store({settings:()=>({...settings(),historyFallback:true}),createClient:()=>{
    const first=attempts++===0;
    return {connect:async()=>{if(first)throw Error('no daemon')},close(){},request:async method=>method==='thread/list'?{data:[row('a')]}:{thread:row('a')}};
  }});
  await store.refresh();assert.equal(store.historyOnly,true);assert.equal(store.liveSessions.length,0);assert.equal(store.recentSessions.length,1);assert.match(store.error,/живой статус/);
  assert.equal(store.connectionError,'no daemon');assert.match(store.error,/Причина: no daemon/);
});

test('issue commands preserve literal quotes, dollar, backticks and newlines as one prompt',()=>{
  const dir=mkdtempSync(join(tmpdir(),'super-agents-command-'));
  try {
    const executable=join(dir,"codex with ' quote");writeFileSync(executable,'#!/usr/bin/env node\nconsole.log(JSON.stringify(process.argv.slice(2)))\n',{mode:0o755});
    const issue={number:9,url:'https://github.com/a/b/issues/9',title:"literal ' $(echo leaked) `echo leaked`\nline"};
    const args=JSON.parse(execFileSync('/bin/sh',['-c',issueTakeCommand(issue,'bug',executable)],{encoding:'utf8'}));
    assert.equal(args[0],'--worktree');assert.equal(args.length,2);assert.match(args[1],/^\$auto-bug-fix --new/);assert.match(args[1],/\$\(echo leaked\)/);assert.match(args[1],/`echo leaked`/);
    const resume=JSON.parse(execFileSync('/bin/sh',['-c',resumeCommand("session'$(echo leaked)",executable)],{encoding:'utf8'}));
    assert.deepEqual(resume,['resume',"session'$(echo leaked)"]);
  }finally{rmSync(dir,{recursive:true,force:true})}
});

test('priority board keeps impact score ordering and unscored count',()=>{
  const result=rankIssues([{number:1,title:'low',body:'Критичность: **20/100**'},{number:2,title:'high',body:'Критичность: **80/100**'},{number:3,body:''}],8);
  assert.deepEqual(result.top.map(i=>i.number),[2,1]);assert.equal(result.unscored,1);
});

test('priority board preserves last successful list when gh fails',async()=>{
  let command="printf '%s' '[{\"number\":1,\"body\":\"Критичность: 75/100\"}]'";
  const board=new IssueBoard({settings:()=>({command,limit:8})});await board.refresh();command='exit 2';await board.refresh();
  assert.equal(board.top[0].number,1);assert.ok(board.error);
});


test('feed version changes for streaming content within the same timestamp and remains stable otherwise',()=>{
 const thread=row('stream',{status:{type:'active',activeFlags:[]},turns:[{status:'inProgress',items:[{id:'a',type:'agentMessage',text:'first'}]}]});
 const before=threadView(thread);assert.equal(threadView(thread).version,before.version);
 thread.turns[0].items[0].text='first second';
 const after=threadView(thread);assert.notEqual(after.version,before.version);assert.equal(after.mtime,before.mtime);
});


test('declined operations and failed/interrupted turns never look successful',()=>{
 const view=threadView(row('errors',{turns:[
  {status:'failed',error:{message:'Model connection lost'},items:[{id:'cmd',type:'commandExecution',status:'declined',command:'deploy',exitCode:null},{id:'patch',type:'fileChange',status:'declined',changes:[]}]},
  {status:'interrupted',items:[]}
 ]}));
 assert.equal(view.feed[0].error,true);assert.match(view.feed[0].result,/отклонена/);assert.equal(view.feed[1].error,true);
 assert.equal(view.feed[2].status,'failed');assert.equal(view.feed[2].result,'Model connection lost');assert.equal(view.feed[3].status,'interrupted');assert.equal(view.feed[3].error,true);
});
