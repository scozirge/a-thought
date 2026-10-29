async function playTrials(driver,l){
 const read=driver.read;
 async function tick(n,a=[{},{}]){await driver.tick(n,a);const s=await read();if(s.failed)throw Error(`${l.name} failed: ${JSON.stringify(s)}`);}
 const wait=(n=100)=>tick(n);
 async function move(i,x,floor=400){
  for(let t=0;t<600;t++){
   const s=await read(),p=s.players[i],q=s.players[1-i],y=typeof floor==='function'?floor(s):floor,dx=x-p.x;
   if(p.exited||Math.abs(dx)<2.5&&p.grounded&&Math.abs(p.y+44-y)<3)return;
   const axis=Math.sign(dx),crossing=!q.exited&&Math.abs(p.x-q.x)<80&&Math.abs(p.y-q.y)<45&&(axis>0?x>q.x+38&&p.x<q.x:x+38<q.x&&p.x>q.x);
   const obstacle=s.boxes.some(b=>Math.abs(p.y+44-b.y-b.h)<3&&Math.abs(p.x-b.x)<80&&(axis>0?x>b.x+b.w&&p.x<b.x:x+38<b.x&&p.x>b.x));
   const a=[{},{}];a[i]={axis,jump:p.grounded&&(p.y+44>y+3||crossing||obstacle)};await tick(Math.abs(dx)>30?6:1,a);
  }throw Error(`Move ${i} ${x}: ${JSON.stringify(await read())}`);
 }
 async function jump(i,axis=0,n=100){const a=[{},{}];a[i]={jump:true,axis};await tick(n,a);}
 async function finish(floor=400){await move(1,955,floor);await move(0,955,floor);await wait(10);if(!(await read()).won)throw Error('No win '+JSON.stringify(await read()));}
 if(l.preview==='balance'){
  await move(0,510);await move(1,100,344);await move(1,190,288);await move(1,230,240);await move(1,310,s=>s.balances[0][0]);
  for(let i=0;i<10&&(await read()).balances[0][1]>240.1;i++)await jump(0,0,110);
  await move(0,562,240);await jump(0,1,70);await move(0,730,240);await wait(200);
  await move(1,382,240);await jump(1,1,70);await move(1,562,240);await jump(1,1,70);await finish(240);return;
 }
 throw Error('Unknown trial '+l.preview);
}
module.exports={playTrials};
