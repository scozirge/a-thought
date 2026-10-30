const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),H=require('./unity-helpers.cjs');
(async()=>{const browser=await H.launch(),players=[],report=[];const note=text=>{report.push(text);console.log('PASS Photon '+text);};try{
 const host=await H.open(browser,'?level=0&tip=true'),guest=await H.open(browser,'?level=0',true);players.push(host,guest);
 for(const [player,name]of [[host,'貓咪測試'],[guest,'狗狗手機']]){await player.page.locator('#room-open').click();await player.page.locator('#player-name').fill(name);}
 await host.page.locator('#create').click();await H.wait(host,()=>window.togetherUnityState.room.connected||(!window.togetherUnityState.room.busy&&!!window.togetherUnityState.room.error),null,65000);
 let room=(await H.state(host)).room;assert.ok(room.connected,room.error);const code=room.code;
 await guest.page.locator('#room-code').fill(code);await guest.page.locator('#join').click();await H.wait(guest,()=>window.togetherUnityState.room.connected||(!window.togetherUnityState.room.busy&&!!window.togetherUnityState.room.error),null,65000);
 room=(await H.state(guest)).room;assert.ok(room.connected,room.error);await H.wait(host,()=>window.togetherUnityState.room.guest&&!window.togetherUnityState.waiting);await H.wait(guest,()=>!window.togetherUnityState.waiting);
 assert.ok(host.sockets.some(url=>url.startsWith('wss:')));assert.ok(guest.sockets.some(url=>url.startsWith('wss:')));note('兩個隔離瀏覽器透過真正 Photon WSS 開房／加入');
 assert.equal((await H.state(host)).room.isHost,true);assert.equal((await H.state(guest)).room.isHost,false);assert.ok(await guest.page.locator('#levels').isDisabled());
 const initial=(await H.state(host)).state.level;await guest.page.evaluate(()=>window.unityInstance.SendMessage('TogetherHome','GameAction','level:20'));await guest.page.waitForTimeout(500);assert.equal((await H.state(host)).state.level,initial);note('角色固定、加入者無法繞過選關權限');
 // Dog holds the blue pad; cat then collects the key with a real jump.
 const dogStart=(await H.state(host)).state.players[1].x,stick=await H.point(guest,'#stick',30);
 await H.touch(guest,'touchStart',[{id:1,...stick}]);await H.wait(host,()=>window.togetherUnityState.state.players[1].x>=295);await H.touch(guest,'touchEnd',[]);await host.page.waitForTimeout(400);
 assert.ok((await H.state(host)).state.players[1].x>dogStart);assert.ok(Math.abs((await H.state(host)).state.players[1].x-(await H.state(guest)).state.players[1].x)<4);note('手機搖桿推動狗狗，房主與加入者位置同步');
 await host.page.keyboard.down('d');await H.wait(host,()=>window.togetherUnityState.state.players[0].x>=505);await host.page.keyboard.press('w');await H.wait(host,()=>window.togetherUnityState.state.collected[0]);await host.page.keyboard.up('d');
 await H.wait(guest,()=>window.togetherUnityState.state.collected[0]);assert.equal((await H.state(guest)).state.collectedBy[0],0);note('壓板開門、真人跳躍取鑰匙與持有者同步');
 await host.page.keyboard.down('d');await H.wait(host,()=>window.togetherUnityState.state.players[0].exited);await host.page.keyboard.up('d');
 await H.touch(guest,'touchStart',[{id:2,...stick}]);await H.wait(host,()=>window.togetherUnityState.state.won);await H.touch(guest,'touchEnd',[]);await H.wait(guest,()=>window.togetherUnityState.state.won);note('一人鍵盤、一人手機搖桿共同完成暖身，兩端都通關');
 await host.page.locator('#next').click();await H.wait(guest,()=>window.togetherUnityState.state.level===1&&!window.togetherUnityState.state.won);
 // Jump swap: cat's jump button must make the remote dog jump.
 await host.page.keyboard.press('w');await H.wait(host,()=>window.togetherUnityState.state.players[1].y<340);assert.equal((await H.state(host)).state.players[0].y,356);note('幫朋友跳維持正確角色控制');
 await host.page.locator('#restart').click();await H.wait(guest,()=>window.togetherUnityState.state.players[1].grounded);
 await host.page.locator('#demo').click();await H.wait(guest,()=>window.togetherUnityState.demo);await H.wait(guest,()=>window.togetherUnityState.state.won,null,45000);assert.deepEqual((await H.state(host)).completed,[]);assert.deepEqual((await H.state(guest)).completed,[]);note('老師按鍵示範同步，兩位都不寫入通關');
 await H.level(host,5);await H.wait(guest,()=>window.togetherUnityState.state.level===5);const flip=await H.point(guest,'#flip');
 await H.touch(guest,'touchStart',[{id:5,...flip}]);await H.wait(host,()=>window.togetherUnityState.state.gravity[0]===-1);await guest.page.waitForTimeout(500);assert.equal((await H.state(host)).state.gravity[0],-1);await H.touch(guest,'touchEnd',[]);note('手機長按翻重力只觸發一次');
 await guest.page.locator('#room-open').click();await H.wait(host,()=>window.togetherUnityState.waiting);const paused=(await H.state(host)).state.clock;await host.page.waitForTimeout(400);assert.equal((await H.state(host)).state.clock,paused);await guest.page.locator('#room-close').click();await H.wait(host,()=>!window.togetherUnityState.waiting);note('離開操作畫面暫停，回來可繼續');
 await guest.page.locator('#room-open').click();await guest.page.locator('#leave').click();await H.wait(host,()=>!window.togetherUnityState.room.guest);assert.ok((await H.state(host)).waiting);note('朋友離房清除輸入並等待');
 await host.page.locator('#room-open').click();await host.page.locator('#leave').click();await H.wait(host,()=>!window.togetherUnityState.room.connected&&!window.togetherUnityState.room.busy);note('房主離房可回到同機遊玩');
 await H.level(guest,0);await guest.page.locator('#room-open').click();await guest.page.locator('#create').click();await H.wait(guest,()=>window.togetherUnityState.room.connected,null,65000);
 await host.page.locator('#room-open').click();await host.page.locator('#room-code').fill((await H.state(guest)).room.code);await host.page.locator('#join').click();await H.wait(host,()=>window.togetherUnityState.room.connected,null,65000);await H.wait(guest,()=>window.togetherUnityState.room.guest&&!window.togetherUnityState.waiting);
 assert.equal((await H.state(guest)).room.isHost,true);assert.equal((await H.state(host)).room.isHost,false);note('手機也能開房當貓咪，電腦加入當狗狗');
 await guest.page.locator('#skip').click();await H.wait(host,()=>window.togetherUnityState.phase==='game');
 const mobileStart=(await H.state(host)).state.players[0].x,newStick=await H.point(guest,'#stick',30);await H.touch(guest,'touchStart',[{id:9,...newStick}]);await H.wait(host,x=>window.togetherUnityState.state.players[0].x>x+10,mobileStart);await H.touch(guest,'touchEnd',[]);
 await guest.page.locator('#room-open').click();await guest.page.locator('#leave').click();await H.wait(host,()=>!window.togetherUnityState.room.connected,null,65000);assert.ok((await H.state(host)).room.error);note('房主關房，加入者收到斷線通知並可重新連線');
 for(const player of players){assert.deepEqual(player.errors,[]);await player.page.screenshot({path:path.join(H.output,player===host?'online-host.png':'online-phone.png')});}
 fs.writeFileSync(path.join(H.output,'photon-report.json'),JSON.stringify({report,sockets:players.map(p=>p.sockets),logs:players.map(p=>p.logs)},null,2));
}catch(error){fs.writeFileSync(path.join(H.output,'photon-failure.json'),JSON.stringify({error:String(error),states:await Promise.all(players.map(H.state)),logs:players.map(p=>p.logs)},null,2));throw error;}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
