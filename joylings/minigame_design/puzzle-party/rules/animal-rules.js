(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AnimalRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const animals={cat:{name:'貓咪',color:'#efbb76'},dog:{name:'小狗',color:'#b99376'},rabbit:{name:'兔子',color:'#e8b6c0'},bear:{name:'小熊',color:'#bf977c'},panda:{name:'熊貓',color:'#d5dfe0'}};
 const actions={swap:{label:'前兩隻交換',short:'交換',icon:'↔'},cycle:{label:'隊長到最後',short:'到最後',icon:'↪'}};
 const levels=[
  {id:'animal-v8-1',title:'交換，再繞回來',stage:'暖身',note:'從左邊開始數。每次動作都看「當時」站在最前面的動物。',steps:4,lineup:['cat','dog','rabbit','bear'],target:['bear','rabbit','dog','cat']},
  {id:'animal-v8-2',title:'兔子當隊長',stage:'暖身',note:'先看目標裡誰在最前面，再想其他動物要怎麼跟上。',steps:4,lineup:['cat','dog','rabbit','bear'],target:['rabbit','cat','dog','bear']},
  {id:'animal-v8-3',title:'熊熊的合照',stage:'暖身',note:'交換的是最前面的位置，輪到下一組可能已經換成別隻。',steps:4,lineup:['cat','dog','rabbit','bear'],target:['bear','cat','rabbit','dog']},
  {id:'animal-v8-4',title:'熊貓也來拍照',stage:'進階',note:'多一位朋友，仍然只有兩種動作、四組各選一次。',steps:4,lineup:['cat','dog','rabbit','bear','panda'],target:['bear','rabbit','panda','dog','cat']}
 ];
 function move(order,command){
  const next=order.slice();
  if(command==='swap')[next[0],next[1]]=[next[1],next[0]];
  else if(command==='cycle')next.push(next.shift());
  else throw new Error('不認得這個換位動作');
  return next;
 }
 function run(level,settings){
  if(!Array.isArray(settings)||settings.length!==4||settings.some(s=>!Object.hasOwn(actions,s)))throw new Error('請先填好四組。');
  let board=level.lineup.slice();const frames=[];
  settings.forEach((command,index)=>{const before=board.slice();board=move(board,command);frames.push({type:'animal',index,command,before,board:board.slice()});});
  const wrong=board.flatMap((id,i)=>id===level.target[i]?[]:[i]);
  return {board,frames,wrong,success:wrong.length===0};
 }
 return {animals,actions,levels,move,run};
});
