(function(root,f){const api=f();if(typeof module==='object'&&module.exports)module.exports=api;else root.Ferry=api;})(globalThis,()=>{
 'use strict';
 const actors={
  fire:{name:'火怪',weight:2},fuzz:{name:'毛球',weight:2},cake:{name:'點心',weight:1},ice:{name:'冰怪',weight:2},stone:{name:'守護石',weight:1}
 };
 const basic=[['fire','fuzz','嚇跑'],['fuzz','cake','偷吃']];
 const levels=[
  {name:'點心郊遊',ids:['fire','fuzz','cake'],edges:basic,seats:2,limit:null,theme:'day'},
  {name:'小船來了',ids:['fire','fuzz','cake'],edges:basic,seats:1,limit:null,theme:'sunset'},
  {name:'小心超重',ids:['fire','fuzz','cake','ice'],edges:[...basic,['fire','ice','融化']],seats:2,limit:3,theme:'ice'},
  {name:'守護石出動',ids:['fire','fuzz','cake','ice','stone'],edges:[...basic,['fire','ice','融化'],['ice','cake','凍住']],seats:2,limit:null,theme:'magic'},
  {name:'月光渡口',ids:['fire','fuzz','cake','ice','stone'],edges:[...basic,['fire','ice','融化'],['ice','cake','凍住']],seats:2,limit:3,theme:'night'}
 ];
 const clone=s=>JSON.parse(JSON.stringify(s));
 const fresh=(level=0)=>({level,positions:Array(levels[level].ids.length).fill(0),bank:0,cargo:[],history:[]});
 const won=s=>s.positions.every(v=>v===1);
 const weight=s=>s.cargo.reduce((sum,i)=>sum+actors[levels[s.level].ids[i]].weight,0);
 function load(s,index){
  if(!Number.isInteger(index)||index<0||index>=s.positions.length||won(s))return {error:'這一趟結束了'};
  if(s.positions[index]!==s.bank)return {error:'船還沒到那一邊'};
  const next=clone(s),at=next.cargo.indexOf(index);
  if(at>=0)next.cargo.splice(at,1);
  else{
   if(next.cargo.length>=levels[s.level].seats)return {error:'船坐滿了'};
   next.cargo.push(index);
  }
  return {state:next};
 }
 function conflict(s){
  const level=levels[s.level],other=1-s.bank,stone=level.ids.indexOf('stone');
  if(stone>=0&&s.positions[stone]===other)return null;
  const edge=level.edges.find(([a,b])=>s.positions[level.ids.indexOf(a)]===other&&s.positions[level.ids.indexOf(b)]===other);
  return edge?{a:edge[0],b:edge[1],verb:edge[2],bank:other}:null;
 }
 function cross(s){
  if(won(s))return {error:'大家都到了'};
  const level=levels[s.level];
  if(level.limit!==null&&weight(s)>level.limit)return {error:`太重了，最多 ${level.limit}`};
  const next=clone(s);next.bank=1-s.bank;for(const i of next.cargo)next.positions[i]=next.bank;
  const danger=conflict(next);
  if(danger)return {error:`${actors[danger.a].name}會${danger.verb}${actors[danger.b].name}！`,conflict:danger};
  next.history.push({positions:s.positions.slice(),bank:s.bank});next.cargo=[];
  return {state:next};
 }
 function undo(s){
  if(!s.history.length)return {error:'還沒出發'};
  const next=clone(s),old=next.history.pop();next.positions=old.positions;next.bank=old.bank;next.cargo=[];return {state:next};
 }
 function valid(s){
  if(!s||!Number.isInteger(s.level)||s.level<0||s.level>=levels.length)return false;
  const l=levels[s.level],positions=p=>Array.isArray(p)&&p.length===l.ids.length&&p.every(v=>v===0||v===1);
  if(!positions(s.positions)||![0,1].includes(s.bank)||!Array.isArray(s.cargo)||s.cargo.length>l.seats||new Set(s.cargo).size!==s.cargo.length||!s.cargo.every(i=>Number.isInteger(i)&&i>=0&&i<l.ids.length&&s.positions[i]===s.bank)||!Array.isArray(s.history))return false;
  if(conflict(s))return false;
  return s.history.every(h=>h&&positions(h.positions)&&[0,1].includes(h.bank)&&!conflict({...s,positions:h.positions,bank:h.bank}));
 }
 return {actors,levels,clone,fresh,won,weight,load,conflict,cross,undo,valid};
});
