const G=require('../core.js');
async function playLevel(driver,l){ if(l.ascent)return require('./play-ascent.cjs').playAscent(driver,l); if(l.trial)return require('./play-trials.cjs').playTrials(driver,l); if(l.coop)return require('./play-cooperation.cjs').playCooperation(driver,l); if(l.preview)return require('./play-previews.cjs').playPreviews(driver,l); if(!l.legacy)return require("./play-advanced.cjs").playAdvanced(driver,l);
 const read=driver.read,tick=driver.tick;
 async function move(i,target,surface=400){
  for(let attempt=0;attempt<600;attempt++){
   const s=await read(),p=s.players[i],q=s.players[1-i],dx=target-p.x,feet=p.y+G.C.h;
   if(p.exited)throw Error(`exited too early: ${l.id+1}`);
   if(Math.abs(dx)<3&&Math.abs(feet-surface)<2&&p.grounded)return;
   const axis=Math.abs(dx)<2?0:Math.sign(dx);
   const passing=!q.exited&&((axis>0&&target>q.x+G.C.w&&q.x>p.x)||(axis<0&&target+G.C.w<q.x&&q.x<p.x))&&Math.abs(p.x-q.x)<86;
   const jump=p.grounded&&(feet>surface+2||passing);
   const commands=[{},{}];commands[i]={axis,jump};await tick(Math.abs(dx)>45?12:2,commands);
  }
  throw Error(`level ${l.id+1} move ${i} to ${target}/${surface} stalled: ${JSON.stringify(await read())}`);
 }
 for(const task of l.route){
  if(task.key!==undefined){
   const k=l.keys[task.key],surface=k.y+134;
   for(const [x,y] of task.stairs||[])await move(1,x,y);
   await move(1,k.x+65,surface);
   for(const [x,y] of task.stairs||[])await move(0,x,y);
   await move(0,k.x-19,surface);await move(1,k.x+41,surface);
   await tick(24,[{}, {axis:-1,jump:true}]);await tick(72,[{},{}]);
   let s=await read();if(s.players[1].support!==0)throw Error(`level ${l.id+1}: failed stack ${JSON.stringify(s)}`);
   await tick(100,[{}, {jump:true}]);s=await read();if(!s.collected[task.key])throw Error(`level ${l.id+1}: missed key ${task.key}`);
  }else{
   const g=l.gates[task.gate],holder=task.holder,runner=1-holder;
   await move(holder,g.button.x+10);
   await move(runner,g.x+g.w+60);
   if(!(await read()).latched[task.gate])throw Error(`gate ${task.gate} did not latch`);
   await move(holder,g.x+g.w+5);
  }
 }
 for(let n=0;n<12;n++){if((await read()).won)return;await tick(120,[{axis:1},{axis:1}]);}
 throw Error(`level ${l.id+1} no win: ${JSON.stringify(await read())}`);
}
module.exports={playLevel};
