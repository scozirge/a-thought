const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const R = require('../web/rules.js');

test('四十關均固定四組各一次，拒絕不完整與多餘設定',()=>{
 const {games}=require('../web/catalog.js');
 for(const [game,info]of Object.entries(games)){
  assert.deepEqual(info.levels.map(l=>R.optionsFor(game,l).length),Array(20).fill(4));
  for(const l of info.levels){
   const options=R.optionsFor(game,l),choices=options.map(v=>v[0]);
   assert.throws(()=>R.run(game,l,choices.slice(0,-1)),/設定/);
   assert.throws(()=>R.run(game,l,[...choices,choices[0]]),/設定/);
   choices[choices.length-1]=null;assert.throws(()=>R.run(game,l,choices),/設定/);
   assert.deepEqual(Array.from(new Set(options.map((_,i)=>R.groupFor(i)))),R.groups);
   options.forEach((v,i)=>{assert.ok(v.length>=2);assert.equal(R.groupFor(i),R.groups[i]);assert.equal(R.attemptFor(i),1);});
  }
 }
});
test('新增企鵝需指定的最短步數，兩側單獨多解、同步唯一，沒有共同空等',()=>{
 const levels=require('../web/catalog.js').games.penguin.levels.slice(10),dirs=Object.keys(R.penguin.directions);
 function countPaths(boards,depth){
  const key=pos=>pos.map(p=>p.join(',')).join(';'),goal=key(boards.map(b=>b.goal));
  let states=new Map([[key(boards.map(b=>b.start)),{positions:boards.map(b=>b.start),ways:1}]]),first=null;
  for(let step=0;step<=depth;step++){
   if(states.has(goal)&&first===null)first=step;if(step===depth)return {ways:states.get(goal)?.ways||0,first};
   const next=new Map();
   for(const item of states.values())for(const d of dirs){const positions=boards.map((b,i)=>R.penguin.slide(b,item.positions[i],d).position),k=key(positions);
    if(next.has(k))next.get(k).ways+=item.ways;else next.set(k,{positions,ways:item.ways});
   }
   states=next;
  }
 }
 for(const l of levels){
  const both=countPaths(l.boards,l.steps);assert.equal(both.ways,1,l.id);assert.equal(both.first,l.steps,l.id+' 不能用短路線完成');
  for(const b of l.boards)assert.ok(countPaths([b],l.steps).ways>1,l.id+' 需要兩側線索');
  const solution=R.solutions('penguin',l)[0],before=JSON.stringify(l),result=R.run('penguin',l,solution);
  assert.equal(result.frames.length,l.steps);assert.equal(JSON.stringify(l),before);
  result.frames.forEach(f=>assert.ok(f.slides.some(s=>s.distance>0),l.id+' 不應兩隻都空等'));
  if(l.id.endsWith('-19')||l.id.endsWith('-20'))assert.ok(result.frames.slice(1).some((f,i)=>f.slides.some((s,b)=>result.frames[i].slides[b].atHome&&!s.atHome)));
 }
});


test('歷史題庫三款各 10 關，名稱與暖身順序正確', () => {
  assert.deepEqual(Object.keys(R.games), ['sticker', 'hero', 'penguin']);
  Object.values(R.games).forEach(info=>{
    assert.equal(info.levels.length,10);
    info.levels.slice(0,3).forEach(l=>assert.equal(l.stage,'暖身'));
  });
  assert.equal(R.games.penguin.name,'帶企鵝回家');
});
test('目前選單：兩款各二十題，每關四個有效選擇', () => {
  const {games}=require('../web/catalog.js');
  assert.deepEqual(Object.keys(games),['sticker','penguin']);
  assert.equal(games.sticker.levels.length,20);
  assert.equal(games.penguin.levels.length,20);
  assert.ok(!games.animal);
  for(const [game,info] of Object.entries(games)) for(const l of info.levels) {
    const count=R.optionsFor(game,l).length;assert.equal(count,4);
    assert.equal(R.solutions(game,l).length,1);
    if(game==='sticker') assert.ok(!R.run(game,l,R.solutions(game,l)[0]).frames.some(f=>f.type==='rotate'));
  }
});
test('四次作答新題保留前十關；後段用形狀與地形遞進，不增加規則',()=>{
  const {games}=require('../web/catalog.js');
  assert.deepEqual(games.sticker.levels.slice(0,10),[...R.games.sticker.levels.slice(0,4),...require('../web/sticker-more.js')]);
  assert.deepEqual(games.penguin.levels.slice(0,10),R.games.penguin.levels);
  const adjacent=(c,n)=>[c%n?c-1:-1,c%n<n-1?c+1:-1,c>=n?c-n:-1,c<n*(n-1)?c+n:-1].filter(v=>v>=0);
  for(const [k,l]of games.sticker.levels.slice(10).entries()){
    assert.equal(l.id,'sticker-v10-'+(k+11));assert.ok(!l.rotateAfter);
    assert.equal(l.masks.reduce((sum,m)=>sum+m.length,0)-l.cols*l.rows,24+k);
    for(const mask of l.masks){
      const seen=new Set([mask[0]]),queue=[mask[0]];
      for(const c of queue)for(const next of adjacent(c,l.cols))if(mask.includes(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
      assert.equal(seen.size,mask.length,l.id+' 貼紙形狀必須連通');
    }
    const result=R.run('sticker',l,R.solutions('sticker',l)[0]),visible=l.masks.map((_,i)=>result.owners.filter(v=>v===i).length);
    assert.ok(visible.every(n=>n>0));
    if(k<4)assert.ok(visible.slice(0,3).every(n=>n>=2&&n<=4));
    else if(k<8)assert.ok(visible.slice(0,3).every(n=>n>=1&&n<=2));
    else assert.deepEqual(visible.slice(0,3),[1,1,1]);
    assert.equal(new Set(l.target).size,k<4?4:k<8?3:2);
  }
  for(const [k,l]of games.penguin.levels.slice(10).entries()){
    assert.equal(l.id,'penguin-v10-'+(k+11));assert.equal(l.steps,4);
    assert.ok(l.boards.every(b=>b.size===5&&b.walls.length===(k<4?5:k<8?6:7)));
    for(const b of l.boards){
      const walls=new Set(b.walls.map(([x,y])=>y*b.size+x)),start=b.start[1]*b.size+b.start[0],seen=new Set([start]),queue=[start];
      for(const c of queue)for(const next of adjacent(c,b.size))if(!walls.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
      assert.equal(seen.size,b.size*b.size-walls.size,l.id+' 冰場不可有隔離區');
    }
    const result=R.run('penguin',l,R.solutions('penguin',l)[0]);
    const blocked=result.frames.reduce((sum,f)=>sum+f.slides.filter(s=>s.distance===0).length,0);
    if(k<4)assert.equal(blocked,2);else if(k<8)assert.ok(blocked>=3);else assert.ok(blocked>=2);
  }
});
test('新增貼紙的四組都留下線索，單改一組會改變最終結果',()=>{
  const levels=require('../web/catalog.js').games.sticker.levels;
  assert.deepEqual(levels.slice(0,3),R.games.sticker.levels.slice(0,3));
  let previous=0;
  for(const l of levels.slice(4)){
    const solution=R.solutions('sticker',l)[0],result=R.run('sticker',l,solution);
    const depth=Array(l.rows*l.cols).fill(0);l.masks.forEach(m=>m.forEach(c=>depth[c]++));
    const overpaint=depth.reduce((s,v)=>s+Math.max(0,v-1),0);
    assert.ok(overpaint>=previous);previous=overpaint;
    assert.ok(result.board.every(Boolean));assert.ok(depth.every(v=>v>0));
    for(let i=0;i<solution.length;i++){
      assert.ok(result.owners.includes(i),l.id+' 第 '+i+' 組必須有可見線索');
      for(const c of l.palette.filter(c=>c!==solution[i])){
        const changed=solution.slice();changed[i]=c;const r=R.run('sticker',l,changed);
        assert.equal(r.success,false);assert.ok(r.wrong.length>0);
      }
    }
  }
});
test('動物交換與走到隊尾的逐步結果，輸入與每幀互不修改',()=>{
  const l=R.animal.levels[0],settings=['swap','cycle','cycle','swap'],original=JSON.stringify(l);
  const r=R.run('animal',l,settings);
  assert.deepEqual(r.frames.map(f=>f.board),[
    ['dog','cat','rabbit','bear'],['cat','rabbit','bear','dog'],
    ['rabbit','bear','dog','cat'],['bear','rabbit','dog','cat']
  ]);
  assert.equal(r.success,true);assert.equal(JSON.stringify(l),original);
  assert.deepEqual(settings,['swap','cycle','cycle','swap']);
  assert.deepEqual(r.frames[1].before,r.frames[0].board);
  r.frames[1].before[0]='panda';assert.equal(r.frames[0].board[0],'dog');
  assert.deepEqual(R.animal.move(R.animal.move(l.lineup,'swap'),'swap'),l.lineup);
  assert.deepEqual(R.run('animal',l,Array(4).fill('cycle')).board,l.lineup);
  assert.throws(()=>R.run('animal',l,['swap',null,'cycle','swap']));
  assert.throws(()=>R.animal.move(l.lineup,'wait'));
});
test('歷史四個動物試玩題均唯一解，所有角色有效，播放完整四步才比對照片',()=>{
  for(const l of R.animal.levels){
    const original=JSON.stringify(l),[solution]=R.solutions('animal',l);
    assert.equal(R.solutions('animal',l).length,1);
    assert.deepEqual([...l.lineup].sort(),[...l.target].sort());
    assert.equal(new Set(l.lineup).size,l.lineup.length);
    assert.ok(l.lineup.length<=5);
    for(let bits=0;bits<16;bits++){
      const setting=Array.from({length:4},(_,i)=>bits>>i&1?'cycle':'swap'),r=R.run('animal',l,setting);
      assert.equal(r.frames.length,4);
      r.frames.forEach(f=>{assert.deepEqual([...f.board].sort(),[...l.lineup].sort());assert.notDeepEqual(f.board,f.before);});
      assert.equal(r.success,setting.join(',')===solution.join(','));
    }
    assert.equal(JSON.stringify(l),original);
  }
});
for (const [game, info] of Object.entries(R.games)) for (const l of info.levels) {
  test(`${l.id}：可解、唯一解、輸入不可變`, () => {
    const snapshot = JSON.stringify(l);
    assert.equal(R.optionsFor(game,l).length,4,'每關都有三組學生與老師組');
    R.optionsFor(game,l).forEach(v=>assert.ok(v.length>=2,'每組都要有有效選擇'));
    const solutions = R.solutions(game, l);
    assert.equal(solutions.length, 1);
    if (game === 'hero') {
      assert.equal(R.optionsFor(game, l).length, 4);
      assert.ok(l.steps >= 6 && l.steps <= 8);
      assert.equal(l.program.length, l.steps);
      assert.deepEqual(l.program.flatMap((v,i)=>v===null?[i]:[]), l.editable);
      const expanded = R.expandHero(l, solutions[0]);
      l.program.forEach((v,i)=>{if(v!==null)assert.equal(expanded[i],v,'固定指令必須保持');});
      assert.equal(R.hero.simulate(l, expanded).success, true);
    }
    const solution = solutions[0], original = solution.slice();
    assert.equal(R.run(game, l, solution).success, true);
    assert.deepEqual(solution, original);
    assert.equal(JSON.stringify(l), snapshot);
    solution.forEach((_, index) => {
      const wrong = solution.slice();
      wrong[index] = R.optionsFor(game, l)[index].find(v => v !== solution[index]);
      assert.equal(R.run(game, l, wrong).success, false);
    });
  });
}
test('貼紙逐層覆蓋，保留每幀', () => {
  const result = R.run('sticker', R.games.sticker.levels[1], ['red', 'blue','red','blue']);
  assert.deepEqual(result.frames.map(f => f.board), [
    ['red','red',null,null],['red','blue',null,null],['red','blue','red',null],['red','blue','red','blue']
  ]);
  assert.notEqual(result.frames[0].board, result.frames[1].board);
});
test('沿用原勇者判定：所有新地圖可達狀態 × 七指令，逐一與原版比較', async () => {
  const original = await import(pathToFileURL(path.resolve(__dirname, '../../robot-relay/public/game.js')).href);
  assert.deepEqual(R.hero.COMMANDS, original.COMMANDS);
  for (const source of R.games.hero.levels) {
    const {portals,events,...l}=source;
    const queue = [R.hero.initialRobot(l)], visited = new Set();
    for (let i = 0; i < queue.length; i++) {
      const bot = queue[i], key = `${bot.position}:${bot.hasSword}:${bot.monsterDefeated}`;
      if (visited.has(key)) continue;
      visited.add(key);
      for (const command of Object.keys(original.COMMANDS)) {
        const expected = original.stepRobot(l, bot, command);
        assert.deepEqual(R.hero.stepRobot(l, bot, command), expected, `${l.id} ${key} ${command}`);
        if (expected.ok) queue.push(expected.robot);
      }
    }
    const actual=R.hero.solveLevel(l),expected=original.solveLevel(l);
    assert.deepEqual(actual,expected);
    if(actual)assert.deepEqual(R.hero.simulate(l,actual),original.simulate(l,expected));
  }
});
test('拿劍、攻擊、出口與等待規則不變', () => {
  const l = {name:'測試',size:4,start:[0,3],sword:[1,3],monster:[2,2],goal:[2,1],walls:[[0,2]]};
  const H = R.hero, bot = H.initialRobot(l);
  for (const action of ['attack','take','left','down','up']) assert.equal(H.stepRobot(l, bot, action).ok, false);
  assert.equal(H.stepRobot(l, bot, 'wait').ok, true);
  const onSword = {...bot, position:[1,3]};
  const armed = H.stepRobot(l, onSword, 'take').robot;
  assert.equal(armed.hasSword, true);
  assert.equal(H.stepRobot(l, armed, 'take').ok, false);
  assert.equal(H.stepRobot(l, armed, 'attack').ok, false, '不能斜角攻擊');
  const adjacent = {...armed,position:[1,2]};
  assert.equal(H.stepRobot(l, adjacent, 'right').ok, false, '怪物擋路');
  const victory = H.stepRobot(l, adjacent, 'attack').robot;
  assert.equal(victory.monsterDefeated,true);
  assert.equal(H.stepRobot(l,{...armed,position:[1,1]},'right').ok,false,'出口仍關閉');
  assert.equal(H.stepRobot(l,{...victory,position:[1,1]},'right').robot.escaped,true);
});
test('失敗停在出錯處，保留傳入的指令以供修改', () => {
  const l=R.games.hero.levels[0], program=R.solutions('hero', l)[0];
  program[0]='attack';
  const snapshot=program.slice(), result=R.run('hero',l,program);
  assert.equal(result.frames.length,1);
  assert.equal(result.robot.failed,true);
  assert.deepEqual(result.robot.position,l.start);
  assert.deepEqual(program,snapshot);
});
test('尚未到出口、錯誤設定不可通關', () => {
  for (const [game, info] of Object.entries(R.games)) {
    const l=info.levels[0];
    assert.throws(()=>R.run(game,l,R.defaults(game,l)),/設定/);
    assert.throws(()=>R.run(game,l,[]),/設定/);
    assert.throws(()=>R.run(game,l,R.optionsFor(game,l).map(()=>'__invalid__')),/設定/);
  }
  const l=R.games.hero.levels[0];
  assert.equal(R.run('hero',l,Array(4).fill('attack')).success,false);
  assert.equal(R.hero.simulate(l,R.hero.solveLevel(l).slice(0,-1)).success,false);
});
test('求解器能辨認原版的多解，而非固定回傳唯一解', async () => {
  const original=await import(pathToFileURL(path.resolve(__dirname,'../../robot-relay/public/game.js')).href);
  assert.ok(R.hero.analyzeLevel(original.LEVELS[0]).count>1);
});

test('系統在第三張後轉整張作品，再貼第四張；玩家只選顏色', () => {
  assert.deepEqual(R.rotateMask([0,1],3,3,1),[2,5]);
  assert.deepEqual(R.rotateMask([0,1],3,3,2),[7,8]);
  assert.deepEqual(R.rotateMask([0,1],3,3,4),[0,1]);
  const l=R.games.sticker.levels[4], snapshot=JSON.stringify(l);
  const result=R.run('sticker',l,['red','blue','blue','red']);
  assert.equal(result.success,true);
  assert.deepEqual(result.frames.map(f=>f.type),['stamp','stamp','stamp','rotate','stamp']);
  assert.deepEqual(result.frames[2].board,['red','blue','blue',null]);
  assert.deepEqual(result.frames[3].board,['blue','red',null,'blue']);
  assert.deepEqual(result.frames[4].board,['blue','red','red','blue']);
  assert.deepEqual(result.owners,[2,0,3,1]);
  assert.throws(()=>R.run('sticker',l,[0,1,0,1]),/設定/);
  assert.equal(JSON.stringify(l),snapshot);
});

test('企鵝滑到冰塊前或邊界才停，經過家不會自行煞車', () => {
  const P=R.penguin, board={size:4,start:[0,1],goal:[1,1],walls:[[3,1]]};
  const slide=P.slide(board,board.start,'right');
  assert.deepEqual(slide.path,[[0,1],[1,1],[2,1]]);
  assert.equal(slide.atHome,false);
  assert.deepEqual(P.slide(board,slide.position,'down').position,[2,3]);
  assert.equal(P.slide(board,slide.position,'right').distance,0);
});

test('兩隻同步讀方向：一隻擋住，另一隻仍前進；在家仍繼續讀指令', () => {
  const l={boards:[{size:4,start:[0,0],goal:[0,1],walls:[[1,0]]},{size:4,start:[0,0],goal:[3,0],walls:[]}]};
  const result=R.penguin.run(l,['right','down']);
  assert.deepEqual(result.frames[0].slides.map(s=>s.distance),[0,3]);
  assert.equal(result.frames[0].slides[1].atHome,true);
  assert.deepEqual(result.frames[1].positions,[[0,3],[3,3]]);
  assert.equal(result.success,false);
  assert.deepEqual(l.boards[0].start,[0,0]);
});

test('勇者錯誤可在固定指令發生，仍保留學生設定並回報整段步號', () => {
  const l=R.games.hero.levels[4], settings=['wait','left','left','right'];
  const result=R.run('hero',l,settings);
  assert.equal(result.frames.length,2);
  assert.equal(result.frames[1].index,1);
  assert.equal(result.frames[1].command,'take');
  assert.equal(result.robot.failed,true);
  assert.deepEqual(settings,['wait','left','left','right']);
});

test('前三關降低選項負荷，四組決策仍完整；旋轉全部由系統安排', () => {
  R.games.sticker.levels.slice(0,3).forEach(l=>{
    assert.equal(l.masks.length,4);assert.equal(l.palette.length,2);assert.ok(l.cols*l.rows<=4);assert.ok(!l.rotateAfter);
  });
  R.games.sticker.levels.forEach(l=>{
    R.optionsFor('sticker',l).forEach(v=>assert.deepEqual(v,l.palette));
    const frames=R.run('sticker',l,R.solutions('sticker',l)[0]).frames;
    assert.equal(frames.filter(f=>f.type==='rotate').length,l.rotateAfter?1:0);
  });
  R.games.hero.levels.slice(0,3).forEach(l=>{assert.equal(l.steps,6);assert.ok(l.commands.length<=4);assert.ok(!l.portals);});
  R.games.penguin.levels.slice(0,3).forEach(l=>{assert.equal(l.steps,4);assert.equal(l.boards.length,1);assert.ok(l.directions.length<=3);});
});

test('企鵝後五關必須考慮兩邊，且不靠多排無用步數加難', () => {
  R.games.penguin.levels.slice(5).forEach(l=>{
    l.boards.forEach(b=>assert.ok(R.solutions('penguin',{steps:l.steps,boards:[b]}).length>1));
    for(let steps=1;steps<l.steps;steps++)assert.equal(R.solutions('penguin',{...l,steps}).length,0);
  });
});

test('傳送門踩入只傳一次，等待不再傳，走回去才傳回來', () => {
  const l=R.games.hero.levels[8], H=R.hero;
  const first=H.stepRobot(l,H.initialRobot(l),'right');
  assert.deepEqual(first.teleport,{from:[1,3],to:[2,0]});
  assert.deepEqual(first.robot.position,[2,0]);
  const waiting=H.stepRobot(l,first.robot,'wait');assert.ok(!waiting.teleport);assert.deepEqual(waiting.robot.position,[2,0]);
  const out=H.stepRobot(l,first.robot,'right');
  const back=H.stepRobot(l,out.robot,'left');assert.deepEqual(back.robot.position,[1,3]);assert.ok(back.teleport);
  assert.throws(()=>H.validateLevel({...l,portals:[[1,3],[1,3]]}),/傳送門/);
  assert.throws(()=>H.validateLevel({...l,portals:[l.start,[1,3]]}),/傳送門/);
});

test('後兩關保留傳送往返；四個空格結合時序推理', () => {
  const uses=R.games.hero.levels.slice(8).map(l=>R.run('hero',l,R.solutions('hero',l)[0]).frames.filter(f=>f.teleport).length);
  assert.deepEqual(uses,[2,3]);
});

test('必須等第二步噴火結束，第三步可走入剛才的範圍', () => {
  const l=R.games.hero.levels[5],solution=R.solutions('hero',l)[0];
  assert.equal(solution[0],'wait');
  const good=R.run('hero',l,solution);assert.equal(good.frames[1].effects[0].kind,'fire');assert.equal(good.frames[2].ok,true);
  const bad=solution.slice();bad[0]='right';
  const failed=R.run('hero',l,bad);assert.equal(failed.frames.length,2);assert.equal(failed.frames[1].effects[0].hit,true);
  assert.ok(R.solutions('hero',{...l,events:[]}).length>1,'噴火必須實際限制解法');
});

test('怪物先留在原位等勇者走完，移動後再使用新位置判定攻擊', () => {
  const l=R.games.hero.levels[6],solution=R.solutions('hero',l)[0];
  const bad=solution.slice();bad[2]='up';
  const result=R.run('hero',l,bad);
  assert.equal(result.frames.length,3);assert.deepEqual(result.robot.monsterPosition,[1,2]);
  assert.equal(result.frames[2].effects.length,0,'走進當下的怪物格已失敗，不再移動怪物');
  const good=R.run('hero',l,solution);assert.deepEqual(good.frames[3].robot.monsterPosition,[2,1]);assert.equal(good.frames[4].robot.monsterDefeated,true);
});

test('怪物移入勇者的位置會失敗，火會被石牆擋住', () => {
  const l={name:'碰撞',size:4,start:[0,2],sword:[3,3],monster:[1,1],goal:[3,0],walls:[],steps:6,events:[{after:1,move:'left'}]};
  const f=R.hero.stepRobot(l,R.hero.initialRobot(l),'up');assert.equal(f.ok,false);assert.equal(f.effects[0].hit,true);
  assert.deepEqual(R.hero.fireCells({...l,walls:[[1,2]]},[1,0],'down',3),[[1,1]]);
  assert.throws(()=>R.hero.validateLevel({...l,events:[{after:1,move:'nope'}]}),/方向/);
});

test('第六步先攻擊會阻止噴火，等待則被火燒到；取消必須有明確紀錄', () => {
  const l=R.games.hero.levels[9],solution=R.solutions('hero',l)[0];
  const good=R.run('hero',l,solution);assert.equal(good.frames[5].effects[0].kind,'cancel');assert.match(good.frames[5].message,/取消/);
  const bad=solution.slice();bad[3]='wait';const fail=R.run('hero',l,bad);
  assert.equal(fail.frames.length,6);assert.equal(fail.frames[5].effects[0].kind,'fire');assert.equal(fail.frames[5].effects[0].hit,true);
});
