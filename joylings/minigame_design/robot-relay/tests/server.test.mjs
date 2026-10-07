import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';
import { solveLevel } from '../public/game.js';

async function until(check, timeout = 2500) {
  const end = Date.now() + timeout;
  do { const result = await check(); if (result) return result; await new Promise(r => setTimeout(r, 25)); } while (Date.now() < end);
  assert.fail('等待同步狀態逾時');
}

async function fixture(t) {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (action, data) => { const r = await fetch(`${base}/api/${action}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); return {status:r.status,...await r.json()}; };
  const host = await post('create', {name:'老師'}), code = host.state.code;
  const auth = player => ({code,token:player.token});
  const controllers = [], consumers = [];
  async function listen(player) {
    const controller = new AbortController(); controllers.push(controller);
    const response = await fetch(`${base}/api/events?room=${code}&token=${player.token}`, {signal:controller.signal});
    assert.equal(response.status,200);
    const events = [], reader = response.body.getReader(), decoder = new TextDecoder();
    let text = '';
    const consume = (async()=>{try{while(true){const {value,done}=await reader.read();if(done)break;text+=decoder.decode(value,{stream:true});let pos;while((pos=text.indexOf('\n\n'))>=0){const event=text.slice(0,pos);text=text.slice(pos+2);if(event.startsWith('data: '))events.push({type:'state',...JSON.parse(event.slice(6))});else if(event.startsWith('event: removed'))events.push({type:'removed'});}}}catch(error){if(error.name!=='AbortError')throw error;}})();
    consumers.push(consume);
    await until(()=>events.length);
    return {events, close:()=>controller.abort()};
  }
  t.after(async()=>{
    await post('round',auth(host));
    controllers.forEach(c=>c.abort());
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    await Promise.all(consumers);
  });
  const current = async()=> (await post('session',auth(host))).state;
  const start = async()=>post('start',{...auth(host),roundId:(await current()).round.roundId});
  const join = name=>post('join',{code,name});
  const submit = (player, round, solution)=>post('submit',{...auth(player),roundId:round.roundId,commands:round.owners.flatMap((id,i)=>id===player.playerId?[solution[i]]:[])});
  return {base,post,host,auth,current,start,join,listen,submit};
}

test('連線版只有房主時可以開始、送交並實際播放通關', async t => {
  const f = await fixture(t);
  assert.equal(f.host.state.round.phase,'lobby');
  assert.deepEqual(f.host.state.round.owners,[]);
  const stream = await f.listen(f.host);
  const started = await f.start();
  assert.equal(started.status,200);
  assert.equal(started.state.round.participants.length,1);
  assert.ok(started.state.round.owners.every(id=>id===f.host.playerId));
  const round=started.state.round;
  assert.equal((await f.submit(f.host,round,solveLevel(round.level))).state.round.phase,'playing');
  const final=await until(async()=>{const state=await f.current();return state.round.phase==='result'&&state;},12000);
  assert.equal(final.round.success,true);
  await until(()=>stream.events.at(-1)?.round?.success===true);
});

test('只在開始瞬間計算在線人數；晚加入不清答案、不參與本題送交門檻', async t => {
  const f = await fixture(t), lobbyId=f.host.state.round.roundId;
  const first=await f.join('小橘'), offline=await f.join('離線隊員');
  assert.equal(first.state.round.roundId,lobbyId);
  assert.deepEqual(first.state.round.owners,[]);
  assert.ok(first.state.members.every(m=>!('token' in m)));
  await f.listen(f.host); const firstStream=await f.listen(first);
  assert.equal((await f.post('start',{...f.auth(first),roundId:lobbyId})).status,403);
  const started=await f.start(), round=started.state.round, solution=solveLevel(round.level);
  assert.equal(round.participants.length,2);
  assert.equal(round.owners.filter(id=>id===first.playerId).length,2);
  assert.ok(!round.owners.includes(offline.playerId));
  assert.equal((await f.start()).status,400);
  assert.equal((await f.post('submit',{...f.auth(f.host),roundId:lobbyId,commands:Array(6).fill('wait')})).status,400);
  assert.equal((await f.submit(first,round,solution)).state.round.phase,'editing');
  const late=await f.join('晚到的隊員'); await f.listen(late);
  const state=await f.current();
  assert.equal(state.round.roundId,round.roundId);
  assert.deepEqual(state.round.owners,round.owners);
  assert.deepEqual(state.round.submitted,[first.playerId]);
  assert.equal((await f.submit(late,round,solution)).status,400);
  assert.equal((await f.submit(first,round,solution)).status,400);
  assert.equal((await f.submit(f.host,round,solution)).state.round.phase,'playing');
  assert.equal((await f.post('pause',f.auth(f.host))).state.round.paused,true);
  await new Promise(r=>setTimeout(r,1100));
  assert.equal((await f.current()).round.playIndex,-1);
  const kicked=await f.post('remove',{...f.auth(f.host),playerId:first.playerId});
  assert.equal(kicked.state.round.phase,'playing');
  assert.equal(kicked.state.round.paused,true);
  assert.deepEqual(kicked.state.round.owners,round.owners);
  await until(()=>firstStream.events.some(e=>e.type==='removed'));
  assert.equal((await f.post('session',f.auth(first))).status,400);
  await f.post('round',{...f.auth(f.host),keepCommands:true});
  const next=await f.start();
  assert.equal(next.state.round.participants.length,2);
  assert.ok(next.state.round.owners.includes(late.playerId));
  assert.ok(!next.state.round.owners.includes(first.playerId));
  assert.equal(next.state.round.seedCommands,undefined);
  assert.ok(next.state.round.commands.every(c=>c===null));
  assert.equal((await fetch(`${f.base}/server.mjs`)).status,404);
});

test('作答中踢人由房主接手；其他隊員的答案保留，舊身分不能再操作', async t => {
  const f=await fixture(t), a=await f.join('小橘'), b=await f.join('小藍');
  await f.listen(f.host); await f.listen(a); const bStream=await f.listen(b);
  const {state:{round}}=await f.start(), solution=solveLevel(round.level);
  await f.submit(b,round,solution);await f.submit(f.host,round,solution);
  assert.equal((await f.post('remove',{...f.auth(b),playerId:a.playerId})).status,403);
  assert.equal((await f.post('remove',{...f.auth(f.host),playerId:f.host.playerId})).status,400);
  const kicked=await f.post('remove',{...f.auth(f.host),playerId:a.playerId});
  assert.equal(kicked.state.round.roundId,round.roundId);
  assert.equal(kicked.state.round.assignmentVersion,1);
  assert.deepEqual(kicked.state.round.submitted,[b.playerId]);
  assert.equal(kicked.state.round.owners.filter(id=>id===f.host.playerId).length,round.owners.length-2);
  assert.deepEqual(kicked.state.round.commands.slice(2,4),solution.slice(2,4));
  assert.equal((await f.post('message',{...f.auth(a),text:'不應送出'})).status,400);
  assert.equal((await f.submit(f.host,kicked.state.round,solution)).state.round.phase,'playing');
  await until(()=>bStream.events.at(-1)?.round?.phase==='playing');
});

test('離線名單不計入下一題；本題斷線重連不改已分配的步驟', async t => {
  const f=await fixture(t), child=await f.join('會重連的隊員');
  await f.listen(f.host); const first=await f.listen(child);
  const round=(await f.start()).state.round;
  first.close();
  await until(async()=>!(await f.current()).members.find(m=>m.id===child.playerId).online);
  assert.deepEqual((await f.current()).round.owners,round.owners);
  const reconnected=await f.listen(child);
  assert.deepEqual((await f.current()).round.owners,round.owners);
  reconnected.close();
  await until(async()=>!(await f.current()).members.find(m=>m.id===child.playerId).online);
  await f.post('round',f.auth(f.host));
  const solo=(await f.start()).state.round;
  assert.equal(solo.participants.length,1);
  assert.ok(solo.owners.every(id=>id===f.host.playerId));
});

test('連線失敗清空答案，不能重播失敗；重試才重新計算參與者', async t => {
  const f=await fixture(t);await f.listen(f.host);
  const round=(await f.start()).state.round;
  const startTime=Date.now();
  await f.submit(f.host,round,Array(round.owners.length).fill('left'));
  const late=await f.join('下一題隊員');await f.listen(late);
  const result=await until(async()=>{const state=await f.current();return state.round.phase==='result'&&state;});
  assert.ok(Date.now()-startTime<1800,'失敗指令應以半秒節奏執行');
  assert.equal(result.round.success,false);
  assert.ok(result.round.commands.every(c=>c===null));
  assert.deepEqual(result.round.submitted,[]);
  assert.equal(result.round.participants.length,1);
  assert.equal((await f.post('replay',f.auth(f.host))).status,400);
  assert.equal((await f.post('retry',{...f.auth(late),roundId:round.roundId})).status,403);
  assert.equal((await f.post('retry',{...f.auth(f.host),roundId:round.roundId-1})).status,400);
  const next=await f.post('retry',{...f.auth(f.host),roundId:round.roundId});
  assert.equal(next.state.round.phase,'editing');
  assert.equal(next.state.round.participants.length,2);
  assert.equal(next.state.round.owners.filter(id=>id===late.playerId).length,2);
  assert.ok(next.state.round.commands.every(c=>c===null));
  assert.equal(next.state.round.seedCommands,undefined);
  assert.equal(next.state.round.robot.hasSword,false);
  assert.deepEqual(next.state.round.robot.position,next.state.round.level.start);
});
