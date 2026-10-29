const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const G=require('../core.js'),Input=require('../input.js'),tapes=require('../solutions.js');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[],out=path.join(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});
  page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.clock.pauseAt(new Date());
  await page.goto(process.env.TOGETHER_URL||'http://127.0.0.1:18128/?level=1');
  // Render reachable snapshots on the canvas only, without assigning app state,
  // granting progress, changing the physics or touching a user's browser profile.
  await page.evaluate(()=>{const draw=CanvasRenderingContext2D.prototype.fillText;window.drawnLabels=[];CanvasRenderingContext2D.prototype.fillText=function(value,...args){window.drawnLabels.push(String(value));return draw.call(this,value,...args);};});
  for(const l of G.levels){
    const tape=tapes.levels[l.saveKey],keyboard=Input.create(),targets=[0,.25,.5,.85].map(v=>Math.floor(v*tape.frames));let state=G.fresh(l.id),frame=0,states=[structuredClone(state)];
    for(const [n,bits] of tape.actions)for(let t=0;t<n;t++){
      keyboard.setMask(bits);state=G.step(state,keyboard.read());keyboard.consume();frame++;
      if(targets.includes(frame))states.push(structuredClone(state));
    }
    assert.ok(state.won);
    for(const [stage,snapshot] of states.entries())for(const tips of [false,true]){
      const labels=await page.evaluate(({snapshot,tips})=>{
        const before=JSON.stringify(snapshot);window.drawnLabels=[];const canvas=document.getElementById('game');
        TogetherArt.scene(canvas.getContext('2d'),canvas,snapshot,Together,[],0,tips);
        if(JSON.stringify(snapshot)!==before)throw Error('畫面不可改動物理狀態');return window.drawnLabels;
      },{snapshot,tips});
      assert.ok(!labels.some(t=>/undefined|NaN|\bnull\b/.test(t)),`${l.name} 標籤`);
      if(!tips&&[1,8,12,15,16,18,19].includes(l.id))await page.locator('#game').screenshot({path:path.join(out,`links-${l.id+1}-state-${stage}.png`)});
    }
  }
  assert.deepEqual(errors,[]);console.log('20 關各 4 個正常按鍵快照，一般／老師版共 160 個機關畫面無錯誤且不修改狀態。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
