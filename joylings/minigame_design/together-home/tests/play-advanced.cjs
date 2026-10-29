const G=require('../core.js');
async function playAdvanced(d,l){
 const read=d.read,tick=d.tick,routeId=l.cargoRoute??l.legacyId??l.id;
 async function wait(n=240){await tick(n,[{},{}]);}
 async function move(i,x,y=400){
  for(let t=0;t<900;t++){
   const s=await read(),p=s.players[i],q=s.players[1-i],dx=x-p.x,feet=p.y+44;
   if(p.exited&&x>=l.door.x)return; if(p.exited)throw Error(`early exit ${l.id+1}/${i}`);
   if(Math.abs(dx)<3&&Math.abs(feet-y)<3&&p.grounded)return;
   const dir=Math.abs(dx)<2?0:Math.sign(dx),obstacles=[...s.boxes,...(!q.exited?[{...q,w:38,h:44}]:[])];
   const crossing=obstacles.some(o=>Math.abs(o.x-p.x)<90&&Math.abs(o.y+o.h-feet)<50&&((dir>0&&x>o.x+o.w-1&&o.x>p.x)||(dir<0&&x+38<o.x+2&&o.x<p.x)));
   const a=[{},{}];a[i]={axis:dir,jump:p.grounded&&(feet>y+3||crossing)};
   if(l.tether&&Math.abs(x-q.x)>145&&Math.abs(p.x-q.x)>120){const follow=Math.sign(p.x-q.x);a[1-i]={axis:follow,jump:q.grounded&&s.boxes.some(b=>Math.abs(b.x-q.x)<90)};}
   await tick(Math.abs(dx)>45?12:2,a);
  }
  throw Error(`move stalled L${l.id+1} actor${i} ->${x},${y}: ${JSON.stringify(await read())}`);
 }
 async function push(bi,target,actor=0){
  let s=await read(),b=s.boxes[bi],dir=Math.sign(target-b.x),surface=b.y+b.h;
  await move(actor,dir>0?b.x-39:b.x+b.w+1,surface);
  if(b.heavy)await move(1-actor,dir>0?b.x-80:b.x+b.w+42,surface);
  for(let t=0;t<600;t++){
   s=await read();b=s.boxes[bi];if(Math.abs(target-b.x)<3)return;
   const a=[{},{}];a[actor]={axis:dir};if(b.heavy||l.tether&&Math.abs(s.players[actor].x-s.players[1-actor].x)>120)a[1-actor]={axis:dir};await tick(Math.abs(target-b.x)>30?10:1,a);
  }
  throw Error(`push stalled L${l.id+1} box${bi}->${target}: ${JSON.stringify(await read())}`);
 }
 async function stack(ki,surface=400,base,climber=1){
  const k=l.keys[ki];base??=k.x-30;
  const baseActor=1-climber,commands=a=>climber===1?[{},a]:[a,{}];
  await move(climber,base+40,surface);await move(baseActor,base,surface);
  await tick(18,commands({jump:true}));await tick(16,commands({axis:-1}));await wait(90);
  if((await read()).players[climber].support!==baseActor)throw Error(`stack L${l.id+1}: ${JSON.stringify(await read())}`);
  await tick(100,commands({jump:true}));if(!(await read()).collected[ki])throw Error(`key missed L${l.id+1}/${ki}`);
 }
 async function lowKey(actor,ki,surface){await move(actor,l.keys[ki].x-19,surface);await tick(100,actor===0?[{jump:true},{}]:[{}, {jump:true}]);if(!(await read()).collected[ki])throw Error('low key missed');}
 async function mode(value,si,fromRight=false,hold=false){
  const b=l.switches[si];
  if(!hold&&(await read()).mode===value)return;
  const off=fromRight?b.x+b.w+15:b.x-55;
  await move(0,off,b.y);await move(0,b.x+7,b.y);await wait(10);
  if((await read()).mode!==value){await move(0,off,b.y);await move(0,b.x+7,b.y);}
 }
 async function liftRelay({cargo=-1,liftIndex=0,holder=1,rider=0,park,boxTarget,off}={}){
  const f=l.lifts[liftIndex],bottom=f.buttons[0],top=f.buttons[1];
  await move(holder,off??bottom.x-65,bottom.y);await wait();
  if(cargo>=0){
   // Park on the ledge and release the lower pad before loading the next lift.
   if(f.bottom<400&&(await read()).boxes[cargo].x<f.x-30){await push(cargo,f.x-30,rider);await wait(260);}
   await push(cargo,f.x+50,rider);await move(rider,f.x+10,f.bottom);
  }
  else await move(rider,f.x+55,f.bottom);
  await wait(260);await move(holder,bottom.x+10,bottom.y);await wait(260);
  if(cargo>=0){await push(cargo,boxTarget,rider);await move(rider,park,f.top);}
  else await move(rider,park,f.top);
  await move(holder,bottom.x+90,bottom.y);await wait(260);
  await move(holder,f.x+55,f.bottom);
  await move(rider,top.x+8,f.top);await wait(260);
  await move(holder,f.x+f.w+2,f.top);
 }
 if(routeId===2){await push(1,510);await push(0,410);await move(1,760);await move(0,710);await stack(0);}
 if(routeId===3){await push(0,400);await stack(0,358,390);await move(1,300);await move(0,350);await push(0,640);}
 if(routeId===4){await liftRelay({rider:1,holder:0,park:630});await lowKey(0,0,248);await lowKey(1,1,248);}
 if(routeId===5){await mode(0,0);await move(1,410);await move(0,400);await stack(0);await mode(1,1);await move(1,740);await move(0,730);await stack(1);}
 if(routeId===6){await push(0,400);await stack(0,358,390);await move(1,660,352);await move(0,660,352);await move(1,770,304);await move(0,770,304);await stack(1,304,770);}
 if(routeId===7){await liftRelay({cargo:0,boxTarget:740,park:790});await lowKey(0,0,240);}
 if(routeId===8){await push(2,570);await move(1,80);await push(1,440);await push(0,310);await move(1,750);await move(0,730);await stack(0);}
 if(routeId===9){await stack(0);await move(1,50);await push(0,250);await move(1,390);await liftRelay({cargo:1,boxTarget:760,park:710,off:100});await mode(1,0);await lowKey(0,1,240);}
 if(routeId===10){await push(0,340);await stack(0,358,330);await move(1,260);await move(0,290);await push(0,580);await stack(1,358,570);await move(1,500);await move(0,530);await push(0,730);}
 if(routeId===11){await move(1,420);await push(1,560,1);await move(0,201);await move(1,250,358);await push(0,450);await move(1,760);await move(0,740);await stack(0);}
 if(routeId===12){
  await move(1,70);await push(1,520);await move(0,480);await move(1,150);await wait(260);
  await push(1,820);await move(0,770,240);await move(1,70);await wait(260);
  await push(0,520,1);await move(1,480);await move(0,648,240);await wait(260);
  await push(0,600,1);await move(0,780,240);await push(0,710,1);await lowKey(1,0,240);
 }
 if(routeId===13){await liftRelay({park:550});await lowKey(0,0,240);await liftRelay({liftIndex:1,rider:1,holder:0,park:800});await lowKey(1,1,80);}
 if(routeId===14){await move(1,290);await move(0,150);if((await read()).mode!==0){await move(0,80);await move(0,150);}await push(0,590,1);await move(0,390);await stack(0);await liftRelay({cargo:0,rider:1,holder:0,boxTarget:770,park:710,off:380});await mode(1,1);await lowKey(0,1,240);}
 if(routeId===15){await push(0,400);await push(1,600,1);await move(1,300);await stack(0,358,390,0);await move(0,460);await move(1,710);await stack(1,358,590);}
 if(routeId===16){await liftRelay({park:560});await push(0,660);await stack(0,198,650);await move(1,560,240);await move(0,600,240);await push(0,790);await lowKey(0,1,240);}
 if(routeId===17){await liftRelay({cargo:0,boxTarget:480,park:590});await lowKey(1,0,240);await liftRelay({cargo:0,liftIndex:1,boxTarget:860,park:910,off:400});await lowKey(0,1,80);}
 if(routeId===18){
  await mode(0,0,false,true);await move(1,350);await move(0,330);await stack(0);
  await mode(1,1,false,true);await move(1,620);await move(0,600);await stack(1);
  await mode(0,2,false,true);await move(1,880);await move(0,860);await stack(2);
  await move(1,760);await move(0,750);await mode(1,2,false,true);await move(1,500);await move(0,490);
  await mode(0,1,false,true);await move(1,200);await move(0,190);
 }
 if(routeId===19){
  await stack(0,358,110);await move(1,20);await move(0,60);await push(0,185);
  await liftRelay({cargo:1,boxTarget:580,park:450,off:100});await lowKey(0,1,198);await mode(1,0,true);
  await liftRelay({cargo:1,liftIndex:1,boxTarget:860,park:910,off:440});await lowKey(1,2,80);await move(1,962,80);
 }
 await move(0,l.door.x+25,l.door.y+l.door.h);await move(1,l.door.x+25,l.door.y+l.door.h);await wait(5);if((await read()).won)return;
 throw Error(`no win L${l.id+1}: ${JSON.stringify(await read())}`);
}
module.exports={playAdvanced};
