const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const G=require('../core.js'),Input=require('../input.js'),solutions=require('../solutions.js'),warmup=require('../warmup.js');
const target=path.resolve(__dirname,'../unity-game/Assets'),levels=[warmup.level,...G.levels];
fs.mkdirSync(target+'/Resources',{recursive:true});fs.mkdirSync(target+'/TogetherHome/Editor',{recursive:true});
fs.writeFileSync(target+'/Resources/levels.json',JSON.stringify(levels.map(l=>({...l,boxes:(l.boxes||[]).map(b=>({...b,y:b.y??400-b.h}))}))));
const tapes=levels.map(l=>l.tutorial?warmup.tape:solutions.levels[l.saveKey]);
fs.writeFileSync(target+'/Resources/solutions.json',JSON.stringify(tapes));
const checkpoints=[];
levels.forEach((l,index)=>{
 const engine=l.tutorial?G.create([l]):G,keyboard=Input.create(),checks=[];let state=engine.fresh(l.tutorial?0:l.id),frame=0;
 for(const [count,mask]of tapes[index].actions)for(let i=0;i<count;i++){
  keyboard.setMask(mask);state=engine.step(state,keyboard.read());keyboard.consume();frame++;
  if(frame%60===0||state.won)checks.push({frame,state});
 }
 assert.ok(state.won&&!state.failed,`Level ${index} solution must win`);checkpoints.push(checks);
});
fs.writeFileSync(target+'/TogetherHome/Editor/parity.json',JSON.stringify(checkpoints));
console.log('Exported 20 levels + warmup, input tapes and '+checkpoints.flat().length+' physics checkpoints.');
