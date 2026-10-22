const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('../core.js'),{campaign}=require('./planner.cjs');
const go=(s,a)=>{const r=G.act(s,a);assert.equal(r.error,undefined);assert.ok(G.valid(r.state));return r.state;};
function fixture(stage=0,values=[2,4,6]){
  const s=G.fresh();s.stage=stage;s.enemyHp=G.monster(s).hp;
  s.dice=values.map((value,i)=>({id:i+1,value}));s.nextId=values.length+1;return s;
}
test('strict >, < and = card conditions; invalid actions preserve state',()=>{
  const s=fixture(0,[3,4,5]),copy=G.clone(s);
  assert.ok(G.preview(s,'fire',2).error);
  assert.equal(G.preview(s,'fire',3).damage,10);
  assert.equal(G.preview(s,'ice',1).damage,5);
  assert.ok(G.preview(s,'ice',2).error);
  assert.equal(G.preview(s,'heal',1).heal,0);
  assert.ok(G.preview(s,'heal',2).error);
  const invalid=G.act(s,{type:'cast',card:'fire',die:2});
  assert.ok(invalid.error);assert.strictEqual(invalid.state,s);assert.deepEqual(s,copy);
  go(s,{type:'cast',card:'fire',die:3});assert.deepEqual(s,copy);
});
test('cards and tools are once per turn and reset next turn',()=>{
  let s=fixture(0,[5,5,2]);s=go(s,{type:'cast',card:'fire',die:1});
  assert.ok(G.act(s,{type:'cast',card:'fire',die:2}).error);
  s=go(s,{type:'tool',id:'plus',die:3});
  assert.ok(G.act(s,{type:'tool',id:'plus',die:3}).error);
  s=go(s,{type:'end'});
  assert.deepEqual(s.used,[]);assert.deepEqual(s.tools,[]);assert.equal(s.round,2);
});
test('split and merge conserve points; plus changes eligibility',()=>{
  let s=fixture();s=go(s,{type:'tool',id:'split',die:3});
  assert.deepEqual(s.dice.map(d=>d.value),[2,4,3,3]);
  s=go(s,{type:'tool',id:'merge',die:1,other:2});
  assert.deepEqual(s.dice.map(d=>d.value),[3,3,6]);
  assert.equal(s.dice.reduce((n,d)=>n+d.value,0),12);
  const odd=fixture(0,[3]);assert.ok(G.act(odd,{type:'tool',id:'split',die:1}).error);
  assert.ok(G.act(odd,{type:'tool',id:'merge',die:1,other:1}).error);
  s=go(fixture(0,[4]),{type:'tool',id:'plus',die:1});
  assert.equal(G.preview(s,'fire',1).damage,10);
});
test('armor applies per hit; concentrated damage beats separate small hits',()=>{
  const s=fixture(1,[2,4,6]);
  assert.equal(G.preview(s,'ice',1).damage,1);
  assert.equal(G.preview(s,'blade',1).damage,0);
  const merged=go(s,{type:'tool',id:'merge',die:2,other:3});
  assert.equal(G.preview(merged,'fire',merged.dice.at(-1).id).damage,17);
  assert.equal(G.preview(s,'fire',3).damage+G.preview(s,'blade',2).damage,10);
});
test('ice and shield combine; heal caps; defenses expire',()=>{
  let s=fixture(0,[2,2,3]);s.hp=30;s.round=3;
  s=go(s,{type:'cast',card:'heal',die:3});assert.equal(s.hp,32);
  s=go(s,{type:'cast',card:'ice',die:1});assert.equal(G.intent(s).attack,7);
  s=go(s,{type:'cast',card:'shield',die:2});
  s=go(s,{type:'end'});assert.equal(s.hp,29);assert.equal(s.stats.blocked,4);
  assert.equal(s.shield,0);assert.equal(s.slow,0);
});
test('dragon reflects only above 12; lethal reflection takes precedence',()=>{
  let s=fixture(2,[6,7]);
  assert.equal(G.preview(s,'fire',1).reflect,0);
  assert.equal(G.preview(s,'fire',2).reflect,3);
  s.hp=3;s.enemyHp=1;
  s=go(s,{type:'cast',card:'fire',die:2});
  assert.equal(s.hp,0);assert.equal(s.enemyHp,0);assert.equal(s.phase,'lost');
  s=go(s,{type:'retry'});assert.equal(s.enemyHp,64);assert.equal(s.hp,32);
});
test('rewards heal and retry restores battle entry, retaining earned upgrades',()=>{
  let s=fixture(0,[6]);s.hp=10;s.enemyHp=1;
  s=go(s,{type:'cast',card:'fire',die:1});assert.equal(s.phase,'reward');
  assert.ok(G.act(s,{type:'reward',id:'extra'}).error);
  s=go(s,{type:'reward',id:'frost'});assert.equal(s.hp,18);assert.equal(s.stage,1);
  while(s.phase==='player')s=go(s,{type:'end'});
  s=go(s,{type:'retry'});assert.equal(s.hp,18);assert.equal(s.round,1);
  assert.deepEqual(s.upgrades,['frost']);
});
test('reject corrupt saves',()=>{
  assert.ok(G.valid(G.fresh()));assert.equal(G.valid(null),false);
  for(const modify of [s=>s.hp=-1,s=>s.stage=5,s=>s.dice.push(s.dice[0]),s=>s.used=['unknown'],s=>s.phase='won',s=>s.checkpoint=null]){
    const s=G.fresh();modify(s);assert.equal(G.valid(s),false);
  }
});
test('three battles are winnable with both upgrade paths',()=>{
  for(const rewards of [['flame','vitality'],['frost','extra']]){
    const {state,log}=campaign(rewards);
    assert.equal(state.phase,'won');assert.ok(G.valid(state));
    assert.equal(new Set(log.map(l=>l.stage)).size,3);
    assert.ok(log.length<20);
  }
});
