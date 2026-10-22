(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Garden=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const clone=s=>JSON.parse(JSON.stringify(s));
 const counts=[3,6,9],sizes=[2,3,4];
 function scale(level=0,odd=1){return {level,odd,sides:Array(counts[level]).fill(0),log:[],result:null,won:false};}
 function place(s,id,side){
  if(s.won||!Number.isInteger(id)||id<1||id>s.sides.length||![-1,0,1].includes(side))return {error:'再選一顆寶石'};
  const next=clone(s);next.sides[id-1]=side;next.result=null;return {state:next};
 }
 function weigh(s){
  if(s.won)return {error:'這題完成了'};
  const left=[],right=[];s.sides.forEach((side,i)=>{if(side===-1)left.push(i+1);if(side===1)right.push(i+1);});
  if(!left.length&&!right.length)return {error:'先把寶石放上天平'};
  if(left.length!==right.length)return {error:'兩邊放一樣多顆'};
  const result=(left.includes(s.odd)?1:0)-(right.includes(s.odd)?1:0);
  const next=clone(s);next.result=result;next.log.push({left,right,result});return {state:next};
 }
 const target=n=>[...Array(n).fill(-1),0,...Array(n).fill(1)];
 function frogs(level=0){const n=sizes[level];return {level,board:[...Array(n).fill(1),0,...Array(n).fill(-1)],history:[]};}
 function destination(board,index){
  const direction=board[index];if(direction!==1&&direction!==-1)return -1;
  const near=index+direction,far=index+direction*2;
  if(board[near]===0)return near;
  if(board[near]===-direction&&board[far]===0)return far;
  return -1;
 }
 function solved(s){return s.board.every((v,i)=>v===target(sizes[s.level])[i]);}
 function moves(s){return s.board.map((_,i)=>i).filter(i=>destination(s.board,i)>=0);}
 function jump(s,index){
  const to=destination(s.board,index);if(to<0)return {error:'前面沒有空位'};
  const next=clone(s);next.history.push(s.board.slice());[next.board[index],next.board[to]]=[0,next.board[index]];
  return {state:next,from:index,to};
 }
 function undo(s){
  if(!s.history.length)return {error:'還沒跳過'};
  const next=clone(s);next.board=next.history.pop();return {state:next};
 }
 function validScale(s){
  if(!s||!Number.isInteger(s.level)||s.level<0||s.level>2)return false;
  const n=counts[s.level];
  if(!Number.isInteger(s.odd)||s.odd<1||s.odd>n||!Array.isArray(s.sides)||s.sides.length!==n||!s.sides.every(v=>[-1,0,1].includes(v))||typeof s.won!=='boolean'||![null,-1,0,1].includes(s.result)||!Array.isArray(s.log))return false;
  return s.log.every(l=>l&&Array.isArray(l.left)&&Array.isArray(l.right)&&l.left.length>0&&l.left.length===l.right.length&&new Set([...l.left,...l.right]).size===l.left.length+l.right.length&&[...l.left,...l.right].every(i=>Number.isInteger(i)&&i>=1&&i<=n)&&l.result===(l.left.includes(s.odd)?1:0)-(l.right.includes(s.odd)?1:0));
 }
 function validFrogs(s){
  if(!s||!Number.isInteger(s.level)||s.level<0||s.level>2||!Array.isArray(s.history))return false;
  const n=sizes[s.level],valid=b=>Array.isArray(b)&&b.length===n*2+1&&b.filter(v=>v===1).length===n&&b.filter(v=>v===-1).length===n&&b.filter(v=>v===0).length===1;
  if(!valid(s.board)||!s.history.every(valid))return false;
  const boards=[...s.history,s.board];
  if(JSON.stringify(boards[0])!==JSON.stringify(frogs(s.level).board))return false;
  return boards.slice(1).every((b,j)=>{
   const before=boards[j],from=before.findIndex((v,i)=>v!==0&&b[i]===0),to=destination(before,from);
   if(to<0)return false;const expected=before.slice();[expected[from],expected[to]]=[0,expected[from]];
   return expected.every((v,i)=>v===b[i]);
  });
 }
 return {clone,counts,sizes,scale,place,weigh,frogs,destination,solved,moves,jump,undo,validScale,validFrogs};
});
