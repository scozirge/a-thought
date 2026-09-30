const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),template=path.join(root,'Assets/WebGLTemplates/Rivals');
const bank=JSON.parse(fs.readFileSync(path.join(root,'Assets/Rivals/Resources/WeaponQuestions.json'),'utf8'));
const lesson=path.resolve(root,'../../../hatchbeasts/app/classroom/red-blue-battle/weapon-questions.json');
assert.deepEqual(bank,JSON.parse(fs.readFileSync(lesson,'utf8')),'lesson and game share the exact question bank');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||path.join(root,'Logs/Learning'));fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true});let checks=0;
 try{
  for(const [width,height,touch] of [[1440,900,false],[844,390,true],[568,260,true],[390,844,true]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch}),page=await context.newPage();
   await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0}#stage{position:relative;width:100vw;height:100vh}button{cursor:pointer}</style><main id="stage"></main>');
   await page.addStyleTag({path:path.join(template,'learning.css')});
   await page.evaluate(touch=>{window.commands=[];window.resumeCount=0;window.rivalsLook={resume:()=>window.resumeCount++};window.rivalsTouch={mode:touch,playable:true,paused:false};window.rivalsLearningCommand=s=>window.commands.push(s);},touch);
   await page.addScriptTag({path:path.join(template,'learning.js')});
   assert.equal(await page.locator('#learning-leave,#learning-stage,#learning-progress,#learning-note').count(),0,'no secondary labels or room-exit action in the lesson');
   for(let i=0;i<15;i++){
    const stage=bank.stages[Math.floor(i/3)],q=stage.questions[i%3];
    const state={visible:true,state:1,life:i+1,question:i,progress:i,badges:i%3,selected:1,choice:-1,answer:-1,seconds:0,name:stage.name,reward:stage.reward,...q,answer:-1,explanation:'',weapons:[1],complete:false};
    await page.evaluate(s=>window.rivalsReceiveLearning(s),state);
    assert.equal(await page.locator('#learning-options button').count(),q.options.length);
    assert.equal(await page.locator('#learning-feedback').isVisible(),false);
    if(i===0)await page.locator('.learning-card').screenshot({path:path.join(output,`question-${width}-${height}.png`)});
    for(const button of await page.locator('#learning-options button').all()){
     await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,'option fits horizontally');
     assert.ok(await button.evaluate(b=>b.scrollWidth<=b.clientWidth+1),'option text wraps without horizontal clipping');
    }
    const option=page.locator(`[data-option="${q.answer}"]`);if(touch)await option.tap();else await option.click();
    assert.equal(await page.evaluate(()=>window.commands.at(-1)),`learning:answer:${i+1}:${i}:${q.answer}`);
    assert.equal(await page.locator('#learning-options button:not(:disabled)').count(),0,'one submission until host reply');
    state.state=2;state.progress=i+1;state.choice=q.answer;state.answer=q.answer;state.correct=true;state.unlocked=(i+1)%3===0;state.explanation=q.explanation;
    await page.evaluate(s=>window.rivalsReceiveLearning(s),state);
    assert.ok((await page.locator('#learning-feedback').textContent()).includes(q.explanation));
    assert.equal(await page.locator('#learning-options').isVisible(),false,'feedback shows only the result and one explanation');
    assert.equal(await page.locator('#learning-next').textContent(),'繼續');
    if(i===0){state.correct=false;await page.evaluate(s=>window.rivalsReceiveLearning(s),state);assert.equal(await page.locator('#learning-title').textContent(),'答錯了');state.correct=true;await page.evaluate(s=>window.rivalsReceiveLearning(s),state);}
    if(i===0||i===13)await page.screenshot({path:path.join(output,`lesson-${width}-${height}-${i}.png`)});
    if(touch)await page.locator('#learning-next').tap();else await page.locator('#learning-next').click();
    assert.equal(await page.evaluate(()=>window.commands.at(-1)),`learning:continue:${i+1}`);
    checks++;
   }
   await page.evaluate(()=>window.rivalsReceiveLearning({visible:true,state:3,life:20,question:15,progress:15,badges:0,selected:7,complete:true,seconds:3,weapons:[1,2,6,8,5,7]}));
   assert.equal(await page.locator('#learning-options').isVisible(),false);assert.equal(await page.locator('#learning-next').isVisible(),false);
   assert.equal(await page.locator('#learning-weapons button[aria-pressed=true]').textContent(),'核彈');
   if(touch)await page.locator('[data-weapon="2"]').tap();else await page.locator('[data-weapon="2"]').click();
   assert.equal(await page.evaluate(()=>window.commands.at(-1)),'learning:weapon:20:2');
   await page.screenshot({path:path.join(output,`respawn-${width}-${height}.png`)});
   await page.evaluate(()=>window.rivalsReceiveLearning({visible:false}));assert.equal(await page.locator('#learning-overlay').isVisible(),false);checks++;
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await page.evaluate(()=>window.resumeCount),touch?1:0,'mobile respawn resumes focus; keyboard still requires its gesture');checks++;
   await page.evaluate(()=>{window.rivalsTouch.playable=false;window.rivalsReceiveLearning({visible:true,state:3,life:21,question:15,progress:15,badges:0,selected:7,complete:true,seconds:1,weapons:[1,7]});window.rivalsReceiveLearning({visible:false});});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await page.evaluate(()=>window.resumeCount),touch?1:0,'leaving the room cannot resume gameplay focus');checks++;
   await context.close();
  }
  fs.writeFileSync(path.join(output,'menu-results.json'),JSON.stringify({checks,viewports:4,questions:15},null,2));console.log('LEARNING_MENU_OK checks='+checks);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
