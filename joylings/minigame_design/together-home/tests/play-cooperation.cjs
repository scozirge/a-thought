async function playCooperation(driver,l){
 const read=driver.read;
 async function tick(n,a=[{},{}]){
  await driver.tick(n,l.jumpSwap?a.map((c,i)=>({...c,jump:!!a[1-i].jump})):a);
  const s=await read();if(s.failed)throw Error(`${l.name} fell ${JSON.stringify(s)}`);
 }
 const wait=(n=80)=>tick(n);
 if(l.coop==='cargo-jump')return require('./play-advanced.cjs').playAdvanced({read,tick},l);
 async function action(i){const a=[{},{}];a[i].special=true;await tick(1,a);}
 async function stop(i){
  if(!l.ice)return;
  for(let t=0;t<100;t++){const p=(await read()).players[i];if(p.exited)return;if(Math.abs(p.vx||0)<6){await wait(30);return;}const a=[{},{}];a[i].axis=-Math.sign(p.vx);await tick(1,a);}
  throw Error('Cannot stop');
 }
 async function move(i,x,surface=400){
  for(let t=0;t<750;t++){
   const s=await read(),p=s.players[i],q=s.players[1-i],dx=x-p.x,contact=s.gravity[i]===-1?p.y:p.y+p.h,floor=typeof surface==='function'?surface(s):surface;
   if(p.exited)return;
   if(Math.abs(dx)<(l.ice?4:2.5)&&p.grounded&&Math.abs(contact-floor)<3){await stop(i);return;}
   const desired=Math.sign(dx)*Math.min(200,Math.sqrt(1000*Math.abs(dx)));
   const axis=l.ice?Math.sign(desired-(p.vx||0)):Math.abs(dx)<1?0:Math.sign(dx);
   const crossing=!l.phaseOnJump&&!q.exited&&Math.abs(p.y-q.y)<45&&Math.abs(p.x-q.x)<75&&(axis>0?x>q.x+q.w&&p.x<q.x:x+p.w<q.x&&p.x>q.x);
   const a=[{},{}];a[i]={axis,jump:p.grounded&&s.gravity[i]!==-1&&(contact>floor+3||crossing)};
   await tick(l.ice?(Math.abs(dx)>35?5:1):(Math.abs(dx)>35?10:1),a);
  }throw Error(`${l.name} move ${i}->${x}: ${JSON.stringify(await read())}`);
 }
 async function jump(i,axis=0,n=100){const a=[{},{}];a[i]={jump:true,axis};await tick(n,a);}
 async function mode(value,i){if((await read()).mode!==value)await jump(i);}
 async function cross(i,edge,surface=400,front=false){
  if(!front){await move(i,edge-(l.ice?80:28),surface);if(l.ice)for(let t=0;t<160;t++){const p=(await read()).players[i];if(p.x>=edge-44)break;const a=[{},{}];a[i].axis=1;await tick(1,a);}}
  await jump(i,1,68);await stop(i);
 }
 async function finish(floor=400){const k=l.keys.findIndex(k=>k.owner===1);if(k>=0&&!(await read()).collected[k])await move(1,l.keys[k].x-19,floor);await move(1,l.door.x+25,floor);await move(0,l.door.x+25,floor);await wait(10);if(!(await read()).won)throw Error('No win '+JSON.stringify(await read()));}
 async function lastLift(){
  const {x,bottom,top,lower,upper}=l.extension;
  await move(0,x+40,bottom);await move(1,lower+8,bottom);await wait(400);await move(0,upper+100,top);
  await move(1,x-35,bottom);await wait(400);await move(1,x+40,bottom);await move(0,upper+8,top);await wait(400);
  await move(1,upper+140,top);await finish(top);
 }
 if(['bridge-relay','phase-relay','moving-relay'].includes(l.coop)){
  const surfaces=[0,1].map(i=>s=>l.movers?.[i]?l.movers[i].y+l.movers[i].range*Math.cos(s.clock*1.2+l.movers[i].phase):400);
  async function span(i,index,front=false){
   if(l.phaseOnJump)await mode(index===0?0:1,i);
   if(l.movers?.length){
    await move(i,index===0?204:584);
    const bridge=l.movers[index];
    for(let t=0;t<140&&bridge.y+bridge.range*Math.cos(((await read()).clock+.4)*1.2+bridge.phase)<378;t++)await wait(5);
    front=true;
   }
   await cross(i,index===0?220:600,400,front);
   await cross(i,index===0?380:760,surfaces[index]);
  }
  await move(0,200);await move(1,140);await span(0,0,true);await move(0,450);
  await span(1,0);await move(1,l.ice?575:590);await move(0,550);
  await span(1,1,true);await move(1,850);
  await span(0,1);if(driver.sectionOnly)return;
  if(l.extension?.type==='bridge'){
   await move(0,984);await move(1,940);
   async function lastSpan(i){
    await mode(0,i);await move(i,984);
    if(l.extension.moving){const bridge=l.movers[2];for(let t=0;t<160&&bridge.y+bridge.range*Math.cos(((await read()).clock+.4)*1.2+bridge.phase)<378;t++)await wait(5);}
    await cross(i,1000,400,true);const surface=s=>l.extension.moving?l.movers[2].y+l.movers[2].range*Math.cos(s.clock*1.2+l.movers[2].phase):400;await cross(i,1180,surface);
   }
   await lastSpan(0);await move(0,1265);await lastSpan(1);
  }
  await finish();return;
 }
 if(l.coop==='ice-lifts'){
  await cross(0,230);await move(0,310);
  await move(1,140);await wait(250);await move(0,560,240);
  await move(1,200);await wait(250);await cross(1,230,400,l.ice);await move(1,310);
  await move(0,450,240);await wait(250);
  await move(1,580,240);await move(0,410,240);await wait(250);await move(1,680,240);
  await move(0,550,240);await wait(250);await move(1,800,80);
  await move(0,450,240);await wait(250);await move(0,610,240);await wait(250);await move(0,680,240);
  await move(1,850,80);await wait(250);
  await move(0,930,80);if(l.extension?.type==='lift'){await lastLift();return;}await finish(80);return;
 }
 if(l.coop==='nearby-ice'){
  const shores=l.floor;
  // Both players gather at each island. The leader leaves room for the landing.
  await move(0,200);await move(1,160);
  for(let k=0;k<shores.length-1;k++){
   const edge=shores[k].x+shores[k].w,next=shores[k+1];
   const receiving=l.gates.flatMap(g=>g.pads||[]).find(p=>p.owner===0&&p.x>=next.x&&p.x<next.x+next.w);
   await cross(0,edge,400,true);await move(0,receiving?receiving.x+receiving.w-20:next.x+Math.min(next.w,160)-42);
   await move(1,edge-16);await cross(1,edge,400,true);
   if(k<shores.length-2){await move(1,next.x+12);await move(0,next.x+next.w-16);await move(1,next.x+next.w-54);}
  }
  if(l.extension?.type==='lift'){await lastLift();return;}await finish();return;
 }
 if(l.coop==='gravity-phase-relay'||l.coop==='gravity-ice-relay'){
  async function flight(i,start,ceilingEnd,landing){
   if(start===580&&i===0){
    await move(i,495);await action(1-i);const a=[{},{}];a[i].axis=1;await tick(l.ice?75:62,a);await stop(i);await wait(30);
   }else{await move(i,start);await action(1-i);await wait(95);}
   await move(i,ceilingEnd,100);
   if(l.phaseOnJump)await mode(start<300?1:0,i);
   await action(1-i);const a=[{},{}];a[i].axis=1;await tick(l.ice?86:70,a);await stop(i);await move(i,landing);
  }
  await move(1,140);await flight(0,200,330,450);
  await flight(1,200,330,540);
  if(l.phaseOnJump)await mode(0,0);
  await flight(0,580,710,840);
  await flight(1,580,710,900);
  if(l.extension?.type==='gravity'){
   await move(1,940);await move(0,880);await action(1);const a=[{axis:1},{}];await tick(l.ice?95:85,a);await stop(0);await wait(40);
   await move(0,1130,100);if(l.phaseOnJump)await mode(1,0);await action(1);await tick(l.ice?86:70,a);await stop(0);await move(0,1265);
   await move(1,1020);await action(0);await wait(95);await move(1,1130,100);if(l.phaseOnJump)await mode(1,1);await action(0);await tick(l.ice?86:70,[{},{axis:1}]);await stop(1);await move(1,1380);
  }
  await finish();return;
 }
 throw Error('Missing cooperation route '+l.coop);
}
module.exports={playCooperation};
