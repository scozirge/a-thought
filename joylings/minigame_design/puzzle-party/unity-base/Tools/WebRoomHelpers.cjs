const roomTitles=new Map();
async function enterRoom(page,{room,name='測試貓貓',create=true}={}) {
 if(create)roomTitles.set(room,name+'的房間');
 await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy,null,{timeout:90000});
 await page.locator('#player-name').fill(name);
 if(create){await page.locator('#create-room').click();}
 else {const title=roomTitles.get(room)||room;const row=page.locator('.room-row').filter({has:page.getByText(title,{exact:true})});await row.getByRole('button',{name:'加入房間',exact:true}).click({timeout:30000});}
 await page.waitForFunction(()=>!window.rivalsLobbyState?.visible&&window.rivalsDiagnostics?.phase===2,null,{timeout:90000});
}
module.exports={enterRoom};
