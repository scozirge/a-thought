const {playLab}=require('./play-lab.cjs');
async function playPuzzles(driver,l){
 const read=driver.read;
 async function tick(n,a=[{},{}]){await driver.tick(n,a);if((await read()).failed)throw Error(l.name+' 掉落 '+JSON.stringify(await read()));}
 const wait=(n=230)=>tick(n);
 async function jump(i,axis=0,n=70){const a=[{},{}];a[i]={axis,jump:true};await tick(n,a);}
 async function move(i,x,y=400,avoid=true){
  for(let t=0;t<1600;t++){
   const s=await read(),p=s.players[i],q=s.players[1-i],dx=x-p.x;
   if(p.exited||Math.abs(dx)<2&&p.grounded&&Math.abs(p.y+p.h-y)<3)return;
   const axis=Math.abs(dx)<1?0:Math.sign(dx),obstacles=[...s.boxes,...(!q.exited?[q]:[])];
   const crossing=avoid&&obstacles.some(b=>Math.abs(b.x-p.x)<75&&Math.abs(b.y+b.h-p.y-p.h)<50&&(axis>0?x>b.x+b.w&&p.x<b.x:x+p.w<b.x&&p.x>b.x));
   const a=[{},{}];a[i]={axis,jump:p.grounded&&(p.y+p.h>y+3||crossing)};await tick(Math.abs(dx)>24?4:1,a);
  }throw Error(`${l.name}: move ${i} ${x}/${y}: `+JSON.stringify(await read()));
 }
 async function push(index,x,actor=0){
  const b=(await read()).boxes[index],dir=Math.sign(x-b.x);
  await move(actor,dir>0?b.x-39:b.x+b.w+1,b.y+b.h);
  for(let t=0;t<1200;t++){
   const s=await read(),box=s.boxes[index];if(Math.abs(box.x-x)<2)return;
   const a=[{},{}];a[actor]={axis:dir};await tick(Math.abs(box.x-x)>25?4:1,a);
  }throw Error(`${l.name}: push ${index} ${x}: `+JSON.stringify(await read()));
 }
 async function cargo(dx=0){
  const ci=l.cargoBox;
  // Retrieve the right-shore cargo after its gate has been unlocked by a key.
  await move(1,dx+1450,350);await move(0,dx+1350);await push(ci,dx+1970,0);
  await move(0,dx+1930);await move(1,dx+1785);await wait();await push(ci,dx+2260,0);await move(0,dx+2370,240);
  await move(1,dx+1840);await wait();await move(1,dx+1940);await move(0,dx+2105,240);await wait();
  await move(1,dx+2160,240);
  // The star is on its own ledge: walking with cargo never changes the mode.
  if((await read()).mode!==1){await move(0,dx+2200,188);await move(0,dx+2105,240);}
  await push(ci,dx+2510,1);await move(1,dx+2470,240);await move(0,dx+2325,240);await wait();
  await push(ci,dx+2820,1);await move(1,dx+2740,80);
  await move(0,dx+2380,240);await wait();await move(0,dx+2480,240);await move(1,dx+2645,80);await wait();
  await move(0,dx+2740,80);await driver.mark?.('cargo-summit');
  await move(1,dx+2980,80);await move(1,l.door.x+25,80);await move(0,l.door.x+25,80);
 }
 if(l.puzzle==='ferry'||l.puzzle==='linked')return playLab(driver,{...l,id:l.puzzle==='ferry'?0:2});
 if(l.puzzle==='linked-tower'){
  await playLab({...driver,keysOnly:true},{...l,id:2});
  await push(1,1260,1);
  await move(0,1640);await push(1,1180,1);await wait();await move(0,1880,220);
  await push(1,1260,1);await wait();await move(1,1640);await move(0,1805,220);await wait();
  await move(1,1850,220);await move(0,2015,220);await driver.mark?.('first-tower-key');
  await move(1,1510);await push(1,1390,1);await move(1,1640);await move(0,1805,220);await wait();
  await move(1,2105,220);await move(0,2270,220);await driver.mark?.('second-tower-key');
  await move(0,l.door.x+25,220);await move(1,l.door.x+25,220);
 }else if(l.puzzle==='ferry-tower'){
  await playLab({...driver,sectionOnly:true},{...l,id:0});await driver.mark?.('river');await cargo();
 }else if(l.puzzle==='freight-final'){
  await playLab({...driver,sectionOnly:true},{...l,id:2});await driver.mark?.('linked-factory');
  const dx=l.ferryOffset;
  await move(1,dx+170);await move(0,dx+20);
  const localRead=async()=>{const s=await read();return {...s,players:s.players.map(p=>({...p,x:p.x-dx})),boxes:s.boxes.slice(2).map(b=>({...b,x:b.x-dx})),rafts:s.rafts.map(x=>x-dx)};};
  await playLab({...driver,read:localRead,sectionOnly:true},{...l,id:0});await driver.mark?.('river');await cargo(dx);
 }
 await wait(10);if(!(await read()).won)throw Error('尚未通關 '+JSON.stringify(await read()));
}
module.exports={playPuzzles};
