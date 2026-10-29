(function(root){
const puzzles=typeof module!=='undefined'?require('./puzzle-levels.js'):root.TogetherPuzzles;
const copy=value=>structuredClone(value);
const pad=(x,y,owner)=>({x,y,w:58,owner});
const crate=(x,y)=>({x,y,w:60,crateOnly:true});
const wall=(x,y=400)=>({x,y:-200,w:28,h:y+200});
const ledge=(x,y,w)=>({x,y,w,h:16});
const key=(x,y,owner)=>({x,y,r:12,owner});
const home=(x,y)=>({x,y:y-82,w:68,h:82});
function linkedTower(){
  const l=copy(puzzles.linked);
  Object.assign(l,{name:'雙城連動塔',puzzle:'linked-tower',saveKey:'campaign-linked-tower-1',viewHeight:480,
    world:{width:2440,top:-100,bottom:520},hint:'移動連動箱子，替樓上的朋友開路。'});
  l.lifts=[{x:1600,w:160,bottom:400,top:220,speed:110,buttons:[crate(1180,400),pad(1800,220,0)]}];
  l.platforms=[ledge(1760,220,680)];
  l.gates.push({...wall(1940,220),buttons:[crate(1260,400)],openAfterKey:2},
    {...wall(2180,220),buttons:[crate(1390,400),pad(2100,220,1)],openAfterKey:3});
  l.keys.push(key(2020,198,0),key(2280,198,0));l.door=home(2340,220);
  l.solution.push('拿齊下面兩把鑰匙後，還要留著連動箱子。右箱壓不同方形座，分別控制升降台與樓上的兩道門。',
    '狗狗先把右箱往右移開升降台的方形座，讓升降台降下。貓咪繞過箱子、搭上升降台；狗狗再把右箱推回升降台座，送貓咪上樓。',
    '貓咪上樓先離開貓臉機關。狗狗把右箱移到下一個方形座，打開第一道樓上門，也讓升降台降回來；狗狗上台後，貓咪踩上層貓臉機關接他。',
    '貓咪通過第一道門拿鑰匙，固定開門。狗狗回到樓下，把右箱再往右移到最後的方形座；貓咪離開上層機關，讓升降台下降接狗狗，再踩回去。',
    '狗狗上樓踩住狗臉機關，與樓下箱子一起開最後的門。貓咪拿最後鑰匙固定開門，再一起進小屋。');
  // The earlier solution's final instruction is replaced by the tower goal.
  l.solution[5]='狗狗拿到下面的鑰匙，地面的三道門打開；兩人接著利用連動箱子控制右邊升降台。';
  return l;
}
function cargoTower(){
  const l=copy(puzzles.ferry);
  Object.assign(l,{name:'渡船送貨上高塔',puzzle:'ferry-tower',saveKey:'campaign-ferry-tower-1',viewHeight:480,
    world:{width:3120,top:-180,bottom:520},hint:'先送貨過河，再把同一箱送上樓。',mode:0});
  l.floor[2].w=580;l.gates[0].openAfterKey=2;l.keys.push(key(1640,350));
  l.lifts=[{x:1900,w:160,bottom:400,top:240,speed:110,buttons:[pad(1780,400,1),pad(2100,240,0)]},
    {x:2440,w:160,bottom:240,top:80,speed:110,buttons:[pad(2320,240,0),pad(2640,80,1)]}];
  l.platforms.push(ledge(2060,240,380),ledge(2180,188,80),ledge(2600,80,520));
  l.switches=[{x:2200,y:188,w:42}];
  l.gates.push({...wall(2920,80),mode:1,buttons:[crate(2820,80)]});
  l.keys.push(key(2980,30,1));l.door=home(3020,80);l.cargoBox=1;
  l.solution[6]='過河後，拿門後的鑰匙固定開門。右岸的箱子還有工作，要帶它搭兩次升降台。';
  l.solution.push('把右岸箱子推上第一部升降台，貓咪一起搭，狗狗踩地面狗臉機關送貨上樓。貓咪把箱子推到上層，先等升降台降下，再踩貓臉機關接狗狗。',
    '在中層跳上星星台，把最後的門切成月亮。狗狗把箱子推上第二部升降台，貓咪在下方貓臉機關送他和箱子上頂樓。',
    '狗狗把箱子推到頂樓方形座上，再離開頂樓機關，讓升降台降下來接貓咪。貓咪上台後，狗狗踩頂樓狗臉機關接朋友。',
    '箱子壓住頂樓機關、世界是月亮，最後的門才開。狗狗拿最右邊鑰匙，兩人都到小屋。');
  return l;
}
function freightFinal(){
  const left=copy(puzzles.linked),right=cargoTower(),dx=1720;
  const shift=o=>({...o,x:o.x+dx,buttons:o.buttons?.map(shift),controls:o.controls?.map(shift),
    ...(o.min!==undefined?{min:o.min+dx,max:o.max+dx}:{}),
    ...(o.openAfterKey!==undefined?{openAfterKey:o.openAfterKey+2}:{})});
  const l={...left,name:'連動貨運總站',puzzle:'freight-final',saveKey:'campaign-freight-final-1',viewHeight:480,
    world:{width:right.world.width+dx,top:-180,bottom:520},fallY:650,mode:0,hint:'連動開路、渡船送貨，最後接回兩個朋友。',
    floor:[{x:0,y:400,w:dx+290},...right.floor.slice(1).map(shift)],
    platforms:right.platforms.map(shift),rafts:right.rafts.map(shift),
    gates:[...left.gates,...right.gates.map(shift)],
    boxes:[...left.boxes,...right.boxes.map(shift)],lifts:right.lifts.map(shift),switches:right.switches.map(shift),
    keys:[...left.keys,...right.keys.map(shift)],door:shift(right.door),cargoBox:3,ferryOffset:dx,
    solution:[...left.solution.slice(0,5),'狗狗爬上右箱拿鑰匙，地面三道門都開了。兩人到右邊碼頭會合；碼頭還有兩個普通貨箱與兩艘渡船，連動箱子留在原區即可。',...right.solution]};
  return l;
}
function build(previous){
  const old=n=>copy(previous[n-1]);
  const ferry={...copy(puzzles.ferry),saveKey:'campaign-ferry-1'},linked={...copy(puzzles.linked),saveKey:'campaign-linked-1'};
  const result=[old(2),old(5),old(3),old(6),old(4),old(7),linked,old(8),ferry,old(9),old(10),
    old(12),old(14),old(15),old(18),linkedTower(),cargoTower(),old(19),old(20),freightFinal()];
  result.forEach((l,id)=>{l.id=id;l.group='main';delete l.lab;});
  return result;
}
if(typeof module!=='undefined')module.exports=build;else root.TogetherCampaign=build;
})(globalThis);
