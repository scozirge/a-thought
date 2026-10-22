(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Supply=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const num=value=>({type:'number',value});
  const value=name=>({type:'value',name});
  const calc=(op,a=null,b=null)=>({type:'calc',op,a,b});
  const compare=(op,a=null,b=null)=>({type:'compare',op,a,b});
  const action=(type,expr=null)=>({type,expr});
  const branch=(condition=null,yes=[],no=[])=>({type:'if',condition,yes,no});
  const levels=[
    {id:'combine',name:'電池合體',task:'把兩顆電池合起來',symbol:'battery',number:2,
      values:['blue','yellow'],actions:['set'],comparisons:false,
      cases:[{blue:4,yellow:3,energy:0},{blue:2,yellow:6,energy:0},{blue:5,yellow:1,energy:0}],
      initial:[action('set')],solution:[action('set',calc('+',value('blue'),value('yellow')))]},
    {id:'route',name:'分頭出發',task:'電量大於 5 去搬貨，其餘去送信',symbol:'route',number:5,
      values:['energy'],actions:['if','cargo','mail'],comparisons:true,
      cases:[{energy:3},{energy:5},{energy:8}],initial:[branch()],
      solution:[branch(compare('>',value('energy'),num(5)),[{type:'send',zone:'cargo'}],[{type:'send',zone:'mail'}])]},
    {id:'balance',name:'剛剛好',task:'讓每台都變成 8 格電',symbol:'bolt',number:8,
      values:['energy'],actions:['if','charge','drain'],comparisons:true,
      cases:[{energy:3},{energy:8},{energy:11}],initial:[branch()],
      solution:[branch(compare('<',value('energy'),num(8)),[action('charge',calc('-',num(8),value('energy')))],[action('drain',calc('-',value('energy'),num(8)))])]}
  ];
  const names={blue:'藍電池',yellow:'黃電池',energy:'電量'};
  const clone=data=>JSON.parse(JSON.stringify(data));
  function category(node){if(!node)return null;if(['number','value','calc'].includes(node.type))return 'number';if(node.type==='compare')return 'condition';return ['set','charge','drain','if','send'].includes(node.type)?'action':null;}
  function valid(program,level){
    let count=0;
    function node(n,expected,depth){
      if(n===null)return expected!=='action';
      if(!n||typeof n!=='object'||++count>100||depth>12||category(n)!==expected)return false;
      if(n.type==='number')return Number.isInteger(n.value)&&n.value>=0&&n.value<=99;
      if(n.type==='value')return level.values.includes(n.name);
      if(n.type==='calc')return ['+','-','*','/'].includes(n.op)&&node(n.a,'number',depth+1)&&node(n.b,'number',depth+1);
      if(n.type==='compare')return level.comparisons&&['>','<','='].includes(n.op)&&node(n.a,'number',depth+1)&&node(n.b,'number',depth+1);
      if(n.type==='if')return level.actions.includes('if')&&node(n.condition,'condition',depth+1)&&list(n.yes,depth+1)&&list(n.no,depth+1);
      if(n.type==='send')return level.actions.includes(n.zone);
      return level.actions.includes(n.type)&&node(n.expr,'number',depth+1);
    }
    function list(items,depth){return Array.isArray(items)&&items.length<=20&&items.every(n=>node(n,'action',depth));}
    return list(program,0);
  }
  function expected(level,input){return level.id==='combine'?{energy:input.blue+input.yellow}:level.id==='route'?{zone:input.energy>5?'cargo':'mail'}:{energy:8};}
  function trace(program,level,input){
    const state={...input,zone:null};const events=[];
    const emit=(path,text,extra={})=>events.push({path,text,state:{...state},...extra});
    const fail=(message,path)=>{throw {message,path};};
    function evaluate(node,path){
      if(!node)fail('還有空格喔',path);
      if(node.type==='number')return node.value;
      if(node.type==='value')return state[node.name];
      const a=evaluate(node.a,path+'.a'),b=evaluate(node.b,path+'.b');
      if(node.type==='compare'){
        const result=node.op==='>'?a>b:node.op==='<'?a<b:a===b;
        emit(path,`${a} ${node.op} ${b} → ${result?'是':'否'}`,{decision:result});return result;
      }
      if(node.op==='/'&&b===0)fail('不能除以 0',path);
      const result=node.op==='+'?a+b:node.op==='-'?a-b:node.op==='*'?a*b:a/b;
      if(!Number.isFinite(result)||Math.abs(result)>9999)fail('這個數字太大了',path);
      emit(path,`${a} ${node.op==='*'?'×':node.op==='/'?'÷':node.op} ${b} = ${Number(result.toFixed(3))}`);return result;
    }
    function execute(list,path){
      for(let i=0;i<list.length;i++){
        if(state.zone)return;
        const n=list[i],p=path+'.'+i;
        if(n.type==='if'){
          const yes=evaluate(n.condition,p+'.condition');
          emit(p,yes?'走「如果」這邊':'走「否則」這邊',{branch:yes?'yes':'no'});
          execute(yes?n.yes:n.no,p+(yes?'.yes':'.no'));
        }else if(n.type==='send'){
          state.zone=n.zone;emit(p,n.zone==='cargo'?'去搬貨':'去送信');
        }else{
          const amount=evaluate(n.expr,p+'.expr');
          if(amount<0)fail(n.type==='drain'?'放掉的電不能小於 0':'加入的電不能小於 0',p);
          const next=n.type==='set'?amount:n.type==='charge'?state.energy+amount:state.energy-amount;
          if(next<0)fail('電不夠放掉了',p);
          if(!Number.isInteger(next))fail('電量要是整數',p);
          if(next>99)fail('最多只能裝 99 格電',p);
          const previous=state.energy;state.energy=next;
          emit(p,`${previous} → ${next} 格電`);
        }
      }
    }
    if(!valid(program,level))return {events:[],state,ok:false,error:'方塊太多或放錯地方了',path:'program'};
    try{
      if(!program.length)fail('先放一個方塊吧','program');
      execute(program,'program');
      const target=expected(level,input);
      const ok=target.zone?state.zone===target.zone:state.energy===target.energy;
      const message=target.zone?(state.zone?`這台要去${target.zone==='cargo'?'搬貨':'送信'}`:'還沒選去哪裡'):`${state.energy<target.energy?'少了':'多了'} ${Math.abs(state.energy-target.energy)} 格電`;
      return {events,state,ok,error:ok?null:message,path:events.at(-1)?.path||'program'};
    }catch(error){return {events,state,ok:false,error:error.message||'再看看這個方塊',path:error.path||'program'};}
  }
  // Complete cards keep the editor flat while retaining the same rule engine.
  function cardsFor(index){
    if(index===0)return ['+','-','*','/'].map(op=>({id:op,kind:'math',op,node:action('set',calc(op,value('blue'),value('yellow')))}));
    const target=index===1?5:8;
    const cards=['>','<','='].map(op=>({id:op,kind:'condition',op,target,node:compare(op,value('energy'),num(target))}));
    if(index===1)return cards.concat(['cargo','mail'].map(zone=>({id:zone,kind:'action',label:zone==='cargo'?'去搬貨':'去送信',icon:zone,node:{type:'send',zone}})));
    return cards.concat([
      {id:'fill',kind:'action',label:'補到 8',icon:'bolt',node:action('charge',calc('-',num(8),value('energy')))},
      {id:'drain',kind:'action',label:'降到 8',icon:'bolt',node:action('drain',calc('-',value('energy'),num(8)))},
      {id:'plus2',kind:'action',label:'加 2 格',icon:'bolt',node:action('charge',num(2))},
      {id:'minus2',kind:'action',label:'減 2 格',icon:'bolt',node:action('drain',num(2))}
    ]);
  }
  function slotsFor(index){return index===0?['math']:['condition','action','action'];}
  function validCards(index,choices){
    const slots=slotsFor(index),cards=cardsFor(index);
    return Array.isArray(choices)&&choices.length===slots.length&&choices.every((id,i)=>id===null||cards.some(c=>c.id===id&&c.kind===slots[i]));
  }
  function compileCards(index,choices){
    if(!validCards(index,choices)||choices.some(id=>id===null))return null;
    const nodes=choices.map(id=>clone(cardsFor(index).find(c=>c.id===id).node));
    return index===0?[nodes[0]]:[branch(nodes[0],[nodes[1]],[nodes[2]])];
  }
  return {levels,names,num,value,calc,compare,action,branch,clone,category,valid,trace,expected,cardsFor,slotsFor,validCards,compileCards};
});
