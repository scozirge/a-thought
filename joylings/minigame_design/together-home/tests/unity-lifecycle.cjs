const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),H=require('./unity-helpers.cjs');
(async()=>{const browser=await H.launch(),players=[],report=[];const note=text=>{report.push(text);console.log('PASS '+text);};try{
 const host=await H.open(browser,'?level=1&tip=true'),guest=await H.open(browser,'?level=1'),third=await H.open(browser,'?level=1');players.push(host,guest,third);
 const save=(await H.state(host)).levels[1].saveKey;
 await host.page.evaluate(value=>localStorage.setItem('together-home-curated-v4',JSON.stringify([value])),save);
 await host.page.reload();await H.wait(host,()=>window.togetherUnityState?.initialized,null,180000);
 assert.deepEqual((await H.state(host)).completed,[save]);note('Unity 初始化保留既有通關存檔');
 for(const [p,name]of [[host,'生命週期貓'],[guest,'生命週期狗'],[third,'第三位']]){await p.page.locator('#room-open').click();await p.page.locator('#player-name').fill(name);}
 await host.page.locator('#create').click();await H.wait(host,()=>window.togetherUnityState.room.connected,null,65000);const code=(await H.state(host)).room.code;
 await guest.page.locator('#room-code').fill(code);await guest.page.locator('#join').click();await H.wait(guest,()=>window.togetherUnityState.room.connected,null,65000);await H.wait(host,()=>window.togetherUnityState.room.guest);
 await third.page.locator('#room-code').fill(code);await third.page.locator('#join').click();await H.wait(third,()=>!window.togetherUnityState.room.busy&&!!window.togetherUnityState.room.error,null,65000);
 assert.equal((await H.state(third)).room.connected,false);assert.ok((await H.state(host)).room.guest);assert.ok((await H.state(guest)).room.connected);note('第三位加入被拒絕，原本兩位繼續留在房間');
 await third.page.locator('#create').click();await third.page.locator('#leave').click();await H.wait(third,()=>!window.togetherUnityState.room.busy&&!window.togetherUnityState.room.connected,null,65000);await third.page.waitForTimeout(2000);assert.equal((await H.state(third)).room.connected,false);note('連線中取消不會稍後偷偷加入房間');
 await guest.page.locator('#room-open').click();await guest.page.locator('#leave').click();await H.wait(host,()=>!window.togetherUnityState.room.guest);const epoch=(await H.state(host)).epoch;
 await third.page.locator('#room-open').click();await third.page.locator('#room-code').fill(code);await third.page.locator('#join').click();await H.wait(third,()=>window.togetherUnityState.room.connected,null,65000);await H.wait(host,e=>window.togetherUnityState.room.guest&&window.togetherUnityState.epoch>e,epoch);note('取消後可正常重新加入，重開本關並清掉前位輸入');
 await host.page.locator('#room-open').click();await host.page.locator('#leave').click();await H.wait(third,()=>!window.togetherUnityState.room.connected,null,65000);
 for(const p of players)assert.deepEqual(p.errors,[]);
 fs.writeFileSync(path.join(H.output,'lifecycle-report.json'),JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
