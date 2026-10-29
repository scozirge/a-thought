const G=require('../core.js');
async function playAscent(driver,l){
 const read=driver.read;
 async function tick(n,a=[{},{}]){await driver.tick(n,a.map((c,i)=>({...c,jump:!!a[1-i].jump})));const s=await read();if(s.failed)throw Error('Ascent fell '+JSON.stringify(s));}
 const wait=(n=100)=>tick(n);
 async function jump(i,axis=0,n=100){const a=[{},{}];a[i]={axis,jump:true};await tick(n,a);}
 async function move(i,x,y=400){
  for(let t=0;t<650;t++){
   const s=await read(),p=s.players[i],q=s.players[1-i],floor=typeof y==='function'?y(s):y,dx=x-p.x,ice=G.isIce(p,l);
   if(p.exited||Math.abs(dx)<3&&p.grounded&&Math.abs(p.y+44-floor)<3&&Math.abs(p.vx||0)<8)return;
   const desired=Math.sign(dx)*Math.min(200,Math.sqrt(1000*Math.abs(dx))),axis=ice?Math.sign(desired-(p.vx||0)):Math.abs(dx)<1?0:Math.sign(dx);
   const crossing=p.x>1000&&!q.exited&&Math.abs(p.y-q.y)<45&&Math.abs(p.x-q.x)<80&&(axis>0?x>q.x+38&&p.x<q.x:x+38<q.x&&p.x>q.x);
   const a=[{},{}];a[i]={axis,jump:p.grounded&&(p.y+44>floor+3||crossing)};await tick(Math.abs(dx)>30?6:2,a);
  }throw Error(`Ascent move ${i} ${x}/${y}: `+JSON.stringify(await read()));
 }
 if(!l.towerOnly){
  await require('./play-cooperation.cjs').playCooperation({...driver,sectionOnly:true},{...l,ice:true,coop:'moving-relay'});
  await driver.mark?.('ice');await tick(120,[{axis:1},{axis:1}]);
 }
 await move(0,1510);await move(1,1100,344);await move(1,1190,288);await move(1,1230,240);await move(1,1310,s=>s.balances[0][0]);
 for(let i=0;i<10&&(await read()).balances[0][1]>240.1;i++)await jump(0,0,110);
 await move(0,1562,240);await jump(0,1,70);await move(0,1740,240);await wait(200);
 await move(1,1382,240);await jump(1,1,70);await move(1,1562,240);await jump(1,1,70);await move(1,1690,240);
 await driver.mark?.('balance');
 // Board before pressing; release the lower pad to bring the empty lift back.
 await move(0,1980,240);await move(1,1850,240);await wait(420);await move(0,2220,-40);
 await move(1,1920,240);await wait(420);await move(1,1980,240);await move(0,2130,-40);await wait(420);await move(1,2320,-40);
 await move(0,2180,-40);await wait(60);await move(1,2400,-40);await move(0,2270,-40);await wait(420);await move(1,2610,-320);
 await move(0,2320,-40);await wait(420);await move(0,2400,-40);await move(1,2560,-320);await wait(420);await move(0,2620,-320);
 await driver.mark?.('lifts');
 async function phaseSun(i){if(l.phaseOnJump&&(await read()).mode!==0)await jump(i);}
 async function stairs(i){
  await phaseSun(i);await move(i,2635,-320);
  for(const [x,y] of [[2712,-376],[2792,-432],[2872,-488],[2952,-544],[3040,-600]]){await jump(i,1,48);await move(i,x,y);}
 }
 await stairs(0);await move(0,l.roof?3160:3240,-600);await stairs(1);await move(1,3100,-600);await driver.mark?.('summit');
 if(l.roof){
  const local=o=>({...o,x:o.x-3020,y:o.y+1000,pads:o.pads?.map(b=>({...b,x:b.x-3020,y:b.y+1000}))});
  const roofLevel={...l,ice:true,world:undefined,extension:undefined,coop:'moving-relay',movers:l.movers.slice(2).map(local),gates:l.gates.slice(2).map(local),keys:l.keys.map(local),door:local(l.door)};
  const readLocal=async()=>{const s=await read();return {...s,players:s.players.map(local)};};
  await require('./play-cooperation.cjs').playCooperation({...driver,read:readLocal,sectionOnly:true},roofLevel);
  await driver.mark?.('roof');await move(1,3970,-600);await move(1,4105,-600);await move(0,4105,-600);await wait(10);
  if(!(await read()).won)throw Error('Roof no win '+JSON.stringify(await read()));return;
 }
 await move(1,3235,-600);await move(0,3235,-600);await wait(10);if(!(await read()).won)throw Error('Ascent no win '+JSON.stringify(await read()));
}
module.exports={playAscent};
