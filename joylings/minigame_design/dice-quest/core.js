(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DiceQuest=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const monsters=[
    {name:'莓果史萊姆',type:'slime',hp:34,armor:0,attacks:[6,8,10],trait:'',color:'#c46e9d'},
    {name:'鐵甲蟹',type:'crab',hp:46,armor:3,attacks:[7,11,9],trait:'每次傷害 −3',color:'#809baf'},
    {name:'雷角龍',type:'dragon',hp:64,armor:0,attacks:[0,18,10],trait:'單次傷害 ＞12：反彈 3',color:'#9c83c5'}
  ];
  const cards=[
    {id:'fire',name:'火球',icon:'fire',rule:'＞ 4',effect:'傷害 ×2',color:'fire'},
    {id:'ice',name:'冰箭',icon:'ice',rule:'＜ 4',effect:'傷害 ＋2',extra:'敵人攻擊 −3',color:'ice'},
    {id:'blade',name:'光劍',icon:'blade',rule:'任意',effect:'傷害 ＝ 點數',color:'blade'},
    {id:'shield',name:'護盾',icon:'shield',rule:'任意',effect:'護盾 ×2',extra:'擋這回合',color:'shield'},
    {id:'heal',name:'治癒',icon:'heart',rule:'＝ 3',effect:'恢復 6',color:'heal'}
  ];
  const tools=['plus','split','merge'];
  const rewards=[
    [{id:'flame',name:'烈焰寶石',icon:'fire',text:'火球傷害 ＋2'},{id:'frost',name:'寒冰寶石',icon:'ice',text:'冰箭再減 2 攻擊'}],
    [{id:'vitality',name:'生命果實',icon:'heart',text:'生命上限 ＋8，回滿'},{id:'extra',name:'幸運口袋',icon:'dice',text:'每回合多一顆 1'}]
  ];
  const clone=s=>JSON.parse(JSON.stringify(s));
  const monster=s=>monsters[s.stage];
  function intent(s){
    const base=monster(s).attacks[(s.round-1)%monster(s).attacks.length];
    return {base,attack:Math.max(0,base-s.slow),charge:base===0};
  }
  function roll(s){
    const rounds=[[2,4,6],[1,3,5],[2,5,6],[2,4,5]];
    let values=rounds[(s.round-1)%4].slice();
    if(s.upgrades.includes('extra'))values.push(1);
    s.dice=values.map(value=>({id:s.nextId++,value}));
    s.used=[];s.tools=[];s.shield=0;s.slow=0;
  }
  function enter(s){
    s.enemyHp=monster(s).hp;s.round=1;s.phase='player';roll(s);
    s.checkpoint={hp:s.hp,maxHp:s.maxHp,upgrades:s.upgrades.slice(),stats:clone(s.stats)};
  }
  function fresh(){
    const s={version:1,stage:0,round:1,hp:32,maxHp:32,enemyHp:34,shield:0,slow:0,dice:[],used:[],tools:[],upgrades:[],nextId:1,phase:'player',stats:{damage:0,blocked:0,biggest:0}};
    enter(s);return s;
  }
  function requirement(card,value){
    if(card==='fire'&&value<=4)return '火球要大於 4';
    if(card==='ice'&&value>=4)return '冰箭要小於 4';
    if(card==='heal'&&value!==3)return '治癒要等於 3';
    return null;
  }
  function preview(s,cardId,dieId){
    const die=s.dice.find(d=>d.id===dieId),card=cards.find(c=>c.id===cardId);
    if(!die||!card)return {error:'先選一顆骰子'};
    if(s.phase!=='player')return {error:'這場已結束'};
    if(s.used.includes(cardId))return {error:'這張用過了'};
    const error=requirement(cardId,die.value);if(error)return {error};
    const v=die.value;
    if(cardId==='shield')return {shield:v*2,text:`${v} × 2 ＝ ${v*2} 護盾`};
    if(cardId==='heal')return {heal:Math.min(6,s.maxHp-s.hp),text:`恢復 ${Math.min(6,s.maxHp-s.hp)}`};
    const bonus=cardId==='fire'&&s.upgrades.includes('flame')?2:0;
    const power=cardId==='fire'?v*2+bonus:cardId==='ice'?v+2:v;
    const damage=Math.max(0,power-monster(s).armor);
    const reflect=s.stage===2&&damage>12?3:0;
    const slow=cardId==='ice'?3+(s.upgrades.includes('frost')?2:0):0;
    const formula=cardId==='fire'?`${v} × 2${bonus?' ＋2':''}`:cardId==='ice'?`${v} ＋2`:`${v}`;
    return {damage,power,reflect,slow,text:`${formula}${monster(s).armor?' −3':''} ＝ ${damage} 傷害${reflect?' · 反彈 3':''}`};
  }
  function act(original,action){
    const s=clone(original),bad=error=>({state:original,error});
    if(!action||typeof action!=='object')return bad('再試一次');
    if(action.type==='retry'){
      if(s.phase!=='lost')return bad('還在戰鬥中');
      Object.assign(s,{hp:s.checkpoint.hp,maxHp:s.checkpoint.maxHp,upgrades:s.checkpoint.upgrades.slice(),stats:clone(s.checkpoint.stats)});
      enter(s);return {state:s,event:{type:'retry',text:'再挑戰一次！'}};
    }
    if(action.type==='reward'){
      if(s.phase!=='reward'||!rewards[s.stage]?.some(r=>r.id===action.id))return bad('選一個強化');
      s.upgrades.push(action.id);
      if(action.id==='vitality'){s.maxHp+=8;s.hp=s.maxHp;}
      else s.hp=Math.min(s.maxHp,s.hp+8);
      s.stage++;enter(s);return {state:s,event:{type:'next',text:'新的對手！'}};
    }
    if(s.phase!=='player')return bad('這場已結束');
    if(action.type==='end'){
      const attack=intent(s),blocked=Math.min(attack.attack,s.shield),damage=attack.attack-blocked;
      s.hp=Math.max(0,s.hp-damage);s.stats.blocked+=blocked;
      const event={type:'enemy',attack:attack.attack,blocked,damage,charge:attack.charge,text:attack.charge?'雷角龍正在蓄力！':`${attack.attack} 攻擊 − ${blocked} 護盾 ＝ ${damage} 傷害`};
      if(s.hp===0)s.phase='lost';else{s.round++;roll(s);}
      return {state:s,event};
    }
    const die=s.dice.find(d=>d.id===action.die);
    if(!die)return bad('先選一顆骰子');
    if(action.type==='tool'){
      if(!tools.includes(action.id)||s.tools.includes(action.id))return bad('這個工具用過了');
      let event;
      if(action.id==='plus'){
        if(die.value>=99)return bad('數字太大了');die.value++;
        event={type:'tool',text:`${die.value-1} ＋ 1 ＝ ${die.value}`};
      }else if(action.id==='split'){
        if(die.value%2!==0)return bad('偶數才能平分');
        const half=die.value/2;s.dice=s.dice.filter(d=>d.id!==die.id);
        s.dice.push({id:s.nextId++,value:half},{id:s.nextId++,value:half});
        event={type:'tool',text:`${die.value} ÷ 2 → ${half}、${half}`};
      }else{
        const other=s.dice.find(d=>d.id===action.other);
        if(!other||other.id===die.id)return bad('再選另一顆骰子');
        const total=die.value+other.value;if(total>99)return bad('數字太大了');
        s.dice=s.dice.filter(d=>d.id!==die.id&&d.id!==other.id);
        s.dice.push({id:s.nextId++,value:total});event={type:'tool',text:`${die.value} ＋ ${other.value} ＝ ${total}`};
      }
      s.tools.push(action.id);return {state:s,event};
    }
    if(action.type!=='cast')return bad('再試一次');
    const effect=preview(s,action.card,die.id);if(effect.error)return bad(effect.error);
    s.dice=s.dice.filter(d=>d.id!==die.id);s.used.push(action.card);
    if(effect.shield)s.shield+=effect.shield;
    if(effect.heal)s.hp=Math.min(s.maxHp,s.hp+effect.heal);
    if(effect.damage!==undefined){
      const actual=Math.min(s.enemyHp,effect.damage);s.enemyHp=Math.max(0,s.enemyHp-effect.damage);
      s.stats.damage+=actual;s.stats.biggest=Math.max(s.stats.biggest,effect.damage);
      s.slow+=effect.slow;s.hp=Math.max(0,s.hp-effect.reflect);
    }
    if(s.hp===0)s.phase='lost';
    else if(s.enemyHp===0)s.phase=s.stage===2?'won':'reward';
    return {state:s,event:{type:'cast',card:action.card,...effect}};
  }
  function valid(s){
    if(!s||s.version!==1||!Number.isInteger(s.stage)||s.stage<0||s.stage>2)return false;
    const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
    if(!integer(s.maxHp,32,40)||!integer(s.hp,0,s.maxHp)||!integer(s.enemyHp,0,monster(s).hp)||!integer(s.round,1,10000)||!integer(s.nextId,1,1000000))return false;
    if(!['player','reward','won','lost'].includes(s.phase)||!integer(s.shield,0,1000)||!integer(s.slow,0,5))return false;
    const allowedUpgrades=['flame','frost','vitality','extra'];
    if(!Array.isArray(s.upgrades)||s.upgrades.length>2||new Set(s.upgrades).size!==s.upgrades.length||!s.upgrades.every(u=>allowedUpgrades.includes(u)))return false;
    if(!Array.isArray(s.used)||new Set(s.used).size!==s.used.length||!s.used.every(id=>cards.some(c=>c.id===id)))return false;
    if(!Array.isArray(s.tools)||new Set(s.tools).size!==s.tools.length||!s.tools.every(id=>tools.includes(id)))return false;
    if(!Array.isArray(s.dice)||s.dice.length>5||new Set(s.dice.map(d=>d.id)).size!==s.dice.length||!s.dice.every(d=>integer(d.id,1,s.nextId-1)&&integer(d.value,1,99)))return false;
    if(!s.stats||!['damage','blocked','biggest'].every(k=>integer(s.stats[k],0,1000000)))return false;
    if(!s.checkpoint||!integer(s.checkpoint.hp,1,s.maxHp)||s.checkpoint.maxHp!==s.maxHp||JSON.stringify(s.checkpoint.upgrades)!==JSON.stringify(s.upgrades)||!s.checkpoint.stats||!['damage','blocked','biggest'].every(k=>integer(s.checkpoint.stats[k],0,1000000)))return false;
    if(s.phase==='player'&&(s.hp===0||s.enemyHp===0))return false;
    if(s.phase==='lost'&&s.hp!==0)return false;
    if(['reward','won'].includes(s.phase)&&(s.enemyHp!==0||s.hp===0))return false;
    if((s.phase==='reward'&&s.stage===2)||(s.phase==='won'&&s.stage!==2))return false;
    return true;
  }
  return {monsters,cards,tools,rewards,fresh,clone,monster,intent,preview,act,valid};
});
