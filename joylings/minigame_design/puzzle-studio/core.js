(function(root,f){const api=f();if(typeof module==='object'&&module.exports)module.exports=api;else root.Studio=api;})(globalThis,()=>{
'use strict';const clone=s=>JSON.parse(JSON.stringify(s));
const levels={
pancake:[[3,1,2],[2,4,1,3],[3,5,1,4,2]],
boxes:[['######','#  . #','# $  #','# @  #','######'],['######','# . .#','# $$ #','#  @ #','#    #','######'],['#######','#  .  #','# #$  #','#  $ .#','# @   #','#######']],
rooms:[{w:4,h:4,clues:[[0,4],[4,6],[7,3],[12,3]]},{w:5,h:5,clues:[[1,6],[4,4],[12,5],[15,6],[24,4]]},{w:5,h:6,clues:[[0,4],[3,6],[11,6],[14,4],[21,4],[28,6]]}],
bridges:[[[0,0,1],[4,0,2],[4,4,1]],[[0,0,4],[4,0,3],[0,4,3],[4,4,2]],[[0,0,2],[2,0,3],[4,0,3],[0,2,4],[4,2,2],[0,4,3],[2,4,3],[4,4,2]]]};
function edges(nodes){const result=[];for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++){const [x,y]=nodes[a],[u,v]=nodes[b];if(x!==u&&y!==v)continue;if(nodes.some(([p,q],i)=>i!==a&&i!==b&&(x===u?p===x&&q>Math.min(y,v)&&q<Math.max(y,v):q===y&&p>Math.min(x,u)&&p<Math.max(x,u))))continue;result.push([a,b]);}return result;}
function fresh(game,level=0){if(!Object.hasOwn(levels,game)||!Number.isInteger(level)||level<0||level>2)throw Error('Invalid level');const l=levels[game][level],s={game,level};
if(game==='pancake')s.stack=l.slice();
if(game==='boxes'){s.w=l[0].length;s.h=l.length;s.walls=[];s.goals=[];s.boxes=[];l.join('').split('').forEach((c,i)=>{if(c==='#')s.walls.push(i);if(c==='.')s.goals.push(i);if(c==='$')s.boxes.push(i);if(c==='@')s.player=i;});}
if(game==='rooms')Object.assign(s,clone(l),{rects:[]});
if(game==='bridges'){Object.assign(s,{nodes:clone(l),edges:edges(l)});s.links=s.edges.map(()=>0);}return s;}
function cells(s,a,b){if(![a,b].every(i=>Number.isInteger(i)&&i>=0&&i<s.w*s.h))return [];const x1=Math.min(a%s.w,b%s.w),x2=Math.max(a%s.w,b%s.w),y1=Math.min(Math.floor(a/s.w),Math.floor(b/s.w)),y2=Math.max(Math.floor(a/s.w),Math.floor(b/s.w)),out=[];for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)out.push(y*s.w+x);return out;}
function totals(s){const n=s.nodes.map(()=>0);s.edges.forEach(([a,b],i)=>{n[a]+=s.links[i];n[b]+=s.links[i];});return n;}
function connected(s){const seen=new Set([0]),todo=[0];while(todo.length){const n=todo.pop();s.edges.forEach(([a,b],i)=>{if(s.links[i]&&(a===n||b===n)){const j=a===n?b:a;if(!seen.has(j)){seen.add(j);todo.push(j);}}});}return seen.size===s.nodes.length;}
function crossing(s,e,f){const [a,b]=e.map(i=>s.nodes[i]),[c,d]=f.map(i=>s.nodes[i]);if(a[0]===b[0]&&c[1]===d[1])return a[0]>Math.min(c[0],d[0])&&a[0]<Math.max(c[0],d[0])&&c[1]>Math.min(a[1],b[1])&&c[1]<Math.max(a[1],b[1]);if(a[1]===b[1]&&c[0]===d[0])return crossing(s,f,e);return false;}
function won(s){if(s.game==='pancake')return s.stack.every((v,i)=>v===i+1);if(s.game==='boxes')return s.boxes.every(i=>s.goals.includes(i));if(s.game==='rooms')return s.rects.flatMap(r=>cells(s,r[0],r[1])).length===s.w*s.h;return totals(s).every((v,i)=>v===s.nodes[i][2])&&connected(s);}
function neighbor(s,p,dx,dy){const x=p%s.w+dx,y=Math.floor(p/s.w)+dy;return x<0||x>=s.w||y<0||y>=s.h?-1:y*s.w+x;}
function walkPath(s,target){const queue=[[s.player]],seen=new Set([s.player]);for(let j=0;j<queue.length;j++){const path=queue[j],p=path.at(-1);if(p===target)return path.slice(1);for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const n=neighbor(s,p,dx,dy);if(n>=0&&!seen.has(n)&&!s.walls.includes(n)&&!s.boxes.includes(n)){seen.add(n);queue.push([...path,n]);}}}return null;}
function act(old,a){const s=clone(old),bad=error=>({error});if(!a||typeof a!=='object')return bad('再試一次');
if(s.game==='pancake'){if(a.type!=='flip'||!Number.isInteger(a.n)||a.n<2||a.n>s.stack.length)return bad('選第二片以下');s.stack=[...s.stack.slice(0,a.n).reverse(),...s.stack.slice(a.n)];}
else if(s.game==='boxes'){if(a.type==='walk'){if(!Number.isInteger(a.to)||a.to===s.player)return bad('選旁邊的地板');const path=walkPath(s,a.to);if(!path)return bad('這裡走不到');s.player=a.to;return {state:s,path};}
if(a.type!=='move'||![[0,1],[1,0],[0,-1],[-1,0]].some(d=>d[0]===a.dx&&d[1]===a.dy))return bad('再試一次');const n=neighbor(s,s.player,a.dx,a.dy);if(n<0||s.walls.includes(n))return bad('這裡是牆');if(s.boxes.includes(n)){const t=neighbor(s,n,a.dx,a.dy);if(t<0||s.walls.includes(t)||s.boxes.includes(t))return bad('推不動');s.boxes[s.boxes.indexOf(n)]=t;}s.player=n;}
else if(s.game==='rooms'){if(a.type==='remove'){const index=s.rects.findIndex(r=>cells(s,...r).includes(a.cell));if(index<0)return bad('這裡還沒有房子');s.rects.splice(index,1);return {state:s};}
if(a.type!=='rect')return bad('再試一次');const region=cells(s,a.a,a.b);if(!region.length)return bad('在格子裡拉出房子');const clues=s.clues.filter(([i])=>region.includes(i));if(clues.length!==1)return bad('每間房子只放一個數字');if(clues[0][1]!==region.length)return bad('要 '+clues[0][1]+' 格，現在 '+region.length+' 格');if(s.rects.some(r=>cells(s,...r).some(i=>region.includes(i))))return bad('房子重疊了');s.rects.push([a.a,a.b]);}
else{if(a.type!=='link'||!Number.isInteger(a.a)||!Number.isInteger(a.b))return bad('選兩座島');const i=s.edges.findIndex(([x,y])=>x===a.a&&y===a.b||x===a.b&&y===a.a);if(i<0)return bad('只能連到正對面的島');s.links[i]=(s.links[i]+1)%3;if(s.links[i]&&s.edges.some((e,j)=>s.links[j]&&crossing(s,s.edges[i],e)))return bad('橋不能交叉');}
return {state:s};}
function replay(game,entry){let s=fresh(game,entry.level);if(!Array.isArray(entry.actions)||entry.actions.length>10000)throw Error('Invalid save');for(const a of entry.actions){const r=act(s,a);if(r.error)throw Error('Invalid action');s=r.state;}return s;}
return {levels,fresh,clone,edges,cells,totals,connected,crossing,won,neighbor,walkPath,act,replay};});