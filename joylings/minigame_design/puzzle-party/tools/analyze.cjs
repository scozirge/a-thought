// 可重現的結構分析。指標描述關卡負荷，不代表兒童實測成功率。
const fs = require('node:fs');
const path = require('node:path');
const R = require('../rules/rules.js');
const {games} = require('../rules/catalog.js');
function analyze(game, level) {
  const options = R.optionsFor(game, level), solutions = R.solutions(game, level);
  if (solutions.length !== 1) throw new Error(`${level.id} 的通關設定有 ${solutions.length} 組`);
  const solution = solutions[0], result = R.run(game, level, solution);
  const row = { id: level.id, title: level.title, stage: level.stage, decisions: options.length,
    choices: options.map(v => v.length), combinations: options.reduce((n, v) => n * v.length, 1), solutions: solutions.length };
  if (game === 'sticker') {
    let depth = Array(level.cols * level.rows).fill(0);
    result.frames.forEach(f => {if(f.type==='rotate')depth=R.rotateBoard(depth,level.cols,level.rows);else f.mask.forEach(c => depth[c]++);});
    Object.assign(row, {cells: depth.length, systemRotationAfter:level.rotateAfter||null, rotationCount:result.frames.filter(f=>f.type==='rotate').length,
      overpaint: depth.reduce((n,d)=>n+Math.max(0,d-1),0), maxDepth: Math.max(...depth),
      visiblePerLayer: level.masks.map((_,i)=>result.owners.filter(owner=>owner===i).length)});
  } else if (game === 'animal') {
    Object.assign(row,{animals:level.lineup.length,steps:4,actions:Object.keys(R.animal.actions).length,
      movedPerStep:result.frames.map(f=>f.board.filter((id,i)=>id!==f.before[i]).length)});
  } else if (game === 'hero') {
    let deferredWrong = 0, maxFailureLag = 0;
    solution.forEach((correct, i) => options[i].filter(v => v !== correct).forEach(v => {
      const changed = solution.slice(); changed[i] = v;
      const failed = R.run(game, level, changed), last = failed.frames[failed.frames.length - 1];
      const lag = last.index - level.editable[i];
      if (lag > 0) deferredWrong++;
      maxFailureLag = Math.max(lag, maxFailureLag);
    }));
    const moves = result.frames.filter(f => R.hero.COMMANDS[f.command].kind === 'move');
    const seen = new Set([level.start.join(',')]); let revisits = 0;
    moves.forEach(f => {const p=f.robot.position.join(',');if(seen.has(p))revisits++;seen.add(p);});
    Object.assign(row, {steps:level.steps, fixed:level.steps-4, turns:moves.slice(1).filter((f,i)=>f.command!==moves[i].command).length,
      revisits, portalUses:result.frames.filter(f=>f.teleport).length, deferredWrongChoices:deferredWrong, maxFailureLag,
      monsterMoves:(level.events||[]).filter(e=>e.move).map(e=>e.after),fireSteps:(level.events||[]).filter(e=>e.fire).map(e=>e.after),
      actualFireCount:result.frames.flatMap(f=>f.effects||[]).filter(e=>e.kind==='fire').length,
      cancelledEvents:result.frames.flatMap(f=>f.effects||[]).filter(e=>e.kind==='cancel').length,
      solutionsWithoutEvents:level.events?.length?R.solutions('hero',{...level,events:[]}).length:null});
  } else {
    Object.assign(row, {steps:level.steps, boards:level.boards.length,
      soloSolutions:level.boards.map(board=>R.solutions('penguin',{steps:level.steps,directions:level.directions,boards:[board]}).length),
      blockedActions:result.frames.reduce((n,f)=>n+f.slides.filter(s=>!s.distance).length,0),
      differentDistances:result.frames.filter(f=>f.slides.length>1&&f.slides[0].distance!==f.slides[1].distance).length,
      homeDepartures:result.frames.slice(1).reduce((n,f,i)=>n+f.slides.filter((s,j)=>result.frames[i].slides[j].atHome&&!s.atHome).length,0),
      playbackMs:result.frames.reduce((n,f)=>n+180+110*Math.max(1,...f.slides.map(s=>s.distance))+260,0)});
  }
  return row;
}
function report() { return { method:'分析目前開放的 40 關；完整列舉設定，各指標分開呈現，不合成未經實測的難度分數。', games:Object.fromEntries(Object.entries(games).map(([g, info])=>[g,info.levels.map(l=>analyze(g,l))])) }; }
if (require.main === module) {
  const result=report(), dest=path.resolve(__dirname,'../Builds/difficulty-analysis.json');
  fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
  for(const [game,rows] of Object.entries(result.games)) {
    console.log(game);
    for(const r of rows) console.log(JSON.stringify(r));
  }
  console.log('分析已寫入 '+dest);
}
module.exports = {analyze, report};
