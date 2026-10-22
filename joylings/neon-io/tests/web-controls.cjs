// Real browser pointer gestures against the actual Unity canvas, using QA bounds only for targeting.
const assert=require('node:assert/strict');
const sessions=new WeakMap();
async function cssRect(page,b){const r=await page.locator('canvas').boundingBox(),d=await page.locator('canvas').evaluate(c=>({w:c.width,h:c.height}));return{x:r.x+b.x*r.width/d.w,y:r.y+b.y*r.height/d.h,w:b.w*r.width/d.w,h:b.h*r.height/d.h,clipX:r.x+(b.clipX||0)*r.width/d.w,clipY:r.y+(b.clipY||0)*r.height/d.h,clipW:(b.clipW||d.w)*r.width/d.w,clipH:(b.clipH||d.h)*r.height/d.h};}
async function touch(page,type,points){let session=sessions.get(page);if(!session){session=await page.context().newCDPSession(page);sessions.set(page,session);}await session.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({radiusX:6,radiusY:6,force:1,...p}))});}
async function drag(page,x,y,endX,endY,mobile=true){
 if(mobile){await touch(page,'touchStart',[{id:1,x,y}]);for(let i=1;i<=10;i++){await touch(page,'touchMove',[{id:1,x:x+(endX-x)*i/10,y:y+(endY-y)*i/10}]);await page.waitForTimeout(25);}await touch(page,'touchEnd',[]);}
 else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(endX,endY,{steps:10});await page.mouse.up();}
}
async function control(page,name){await page.waitForFunction(n=>window.neonState?.controls?.some(c=>c.name===n&&c.enabled),name,{timeout:90000});return page.evaluate(n=>neonState.controls.find(c=>c.name===n&&c.enabled),name);}
async function click(page,name,mobile=true){
 let b=await control(page,name);await page.waitForTimeout(180);
 for(let attempt=0;attempt<14;attempt++){
  b=await control(page,name);const r=await cssRect(page,b);
  const top=Math.max(r.y,r.clipY),bottom=Math.min(r.y+r.h,r.clipY+r.clipH);
  if(!b.scroll || bottom-top>=Math.min(44,r.h)-1){
   const x=Math.min(r.clipX+r.clipW-2,Math.max(r.clipX+2,r.x+r.w/2)),y=(top+bottom)/2;
   if(mobile){await touch(page,'touchStart',[{id:1,x,y}]);await page.waitForTimeout(80);await touch(page,'touchEnd',[]);}else await page.mouse.click(x,y);
   await page.waitForTimeout(650);return;
  }
  const down=r.y+r.h>r.clipY+r.clipH;
  // Use the scroll gutter: dragging through an InputField selects text instead
  // of scrolling its parent (the compact lobby places the name field here).
  const x=r.clipX+1.5,startY=r.clipY+r.clipH*(down ? .82 : .18),endY=r.clipY+r.clipH*(down ? .18 : .82);
  // Wait for inertia and the 500 ms QA snapshot before targeting the moved row.
  await drag(page,x,startY,x,endY,mobile);await page.waitForTimeout(1100);
 }
 assert.fail('Could not scroll into view: '+name);
}
module.exports={cssRect,touch,drag,control,click};
