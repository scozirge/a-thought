(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Factory=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const cards={
    add6:{label:'＋ 6',op:'+',arg:6},sub2:{label:'− 2',op:'-',arg:2},mul3:{label:'× 3',op:'*',arg:3},div2:{label:'÷ 2',op:'/',arg:2},
    add8:{label:'＋ 8',op:'+',arg:8},sub8:{label:'− 8',op:'-',arg:8},reverse8:{label:'8 − 目前',op:'reverse',arg:8},div3:{label:'÷ 3',op:'/',arg:3},
    addY:{label:'＋ Y',op:'+',arg:'Y'},subY:{label:'− Y',op:'-',arg:'Y'},mul2:{label:'× 2',op:'*',arg:2},
    sub6:{label:'− 6',op:'-',arg:6},add4:{label:'＋ 4',op:'+',arg:4},pass:{label:'直接通過',op:'pass'},
    gt8:{label:'目前 ＞ 8',op:'>',arg:8,kind:'condition'},lt8:{label:'目前 ＜ 8',op:'<',arg:8,kind:'condition'},eq8:{label:'目前 ＝ 8',op:'=',arg:8,kind:'condition'},
    gt18:{label:'目前 ＞ 18',op:'>',arg:18,kind:'condition'},lt18:{label:'目前 ＜ 18',op:'<',arg:18,kind:'condition'},eq18:{label:'目前 ＝ 18',op:'=',arg:18,kind:'condition'}
  };
  const levels=[
    {id:'order',name:'破解順序',task:'用同一套機器，做出訂單上的數量。',layout:'line',
      slots:['a','b','c'],palette:['mul3','sub2','div2','add6'],
      cases:[{X:2,target:12},{X:6,target:18},{X:10,target:24},{X:14,target:30}],
      solution:{a:'add6',b:'div2',c:'mul3'}},
    {id:'distance',name:'差距放大',task:'算出 X 和 8 相差多少，再變成 3 倍。',layout:'fork',
      slots:['test','yes','no','finish'],palette:['gt8','eq8','lt8','sub8','mul3','add8','reverse8','div3','pass'],
      cases:[{X:2,target:18},{X:6,target:6},{X:8,target:0},{X:12,target:12},{X:17,target:27}],
      solution:{test:'lt8',yes:'reverse8',no:'sub8',finish:'mul3'}},
    {id:'double',name:'雙盒密碼',task:'先合併 X、Y，再找出兩條路的做法。',layout:'double',
      slots:['pre','test','yes1','yes2','no1','no2'],palette:['lt18','gt18','eq18','mul2','sub6','addY','div2','add4','subY','pass'],
      cases:[{X:4,Y:6,target:24},{X:9,Y:9,target:40},{X:14,Y:8,target:8},{X:18,Y:8,target:10},{X:6,Y:8,target:32},{X:11,Y:9,target:7}],
      solution:{pre:'addY',test:'gt18',yes1:'sub6',yes2:'div2',no1:'mul2',no2:'add4'}}
  ];
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  function rational(n,d=1){
    if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||d===0)throw Error(d===0?'不能除以 0':'數字太大了');
    if(d<0){n=-n;d=-d;}const divisor=gcd(Math.abs(n),d);return {n:n/divisor,d:d/divisor};
  }
  const format=q=>q.d===1?String(q.n):`${q.n}/${q.d}`;
  const blank=index=>Object.fromEntries(levels[index].slots.map(s=>[s,null]));
  function valid(index,program){
    const l=levels[index];if(!program||typeof program!=='object'||Array.isArray(program))return false;
    return Object.keys(program).length===l.slots.length&&l.slots.every(s=>{
      const id=program[s];return id===null||(l.palette.includes(id)&&((cards[id].kind==='condition')===(s==='test')));
    });
  }
  const ready=(index,p)=>valid(index,p)&&levels[index].slots.every(s=>p[s]!==null);
  function trace(index,program,input){
    let q=rational(input.X),branch=null;const events=[];
    if(!ready(index,program))return {ok:false,error:'還有空位',events,value:q};
    function apply(slot){
      const c=cards[program[slot]],before=q;
      const arg=c.arg==='Y'?input.Y:c.arg;
      if(c.kind==='condition'){
        const b=rational(arg),difference=q.n*b.d-b.n*q.d;
        branch=(c.op==='>'?difference>0:c.op==='<'?difference<0:difference===0)?'yes':'no';
        events.push({slot,before,value:q,branch,text:`${format(q)} ${c.op==='='?'＝':c.op==='>'?'＞':'＜'} ${arg}：${branch==='yes'?'是':'否'}`});return;
      }
      if(c.op==='+')q=rational(q.n+arg*q.d,q.d);
      else if(c.op==='-')q=rational(q.n-arg*q.d,q.d);
      else if(c.op==='reverse')q=rational(arg*q.d-q.n,q.d);
      else if(c.op==='*')q=rational(q.n*arg,q.d);
      else if(c.op==='/')q=rational(q.n,q.d*arg);
      const op={'+':'＋','-':'−','*':'×','/':'÷'}[c.op];
      const text=c.op==='pass'?`${format(before)} → ${format(q)}`:c.op==='reverse'?`${arg} − ${format(before)} ＝ ${format(q)}`:`${format(before)} ${op} ${arg} ＝ ${format(q)}`;
      events.push({slot,before,value:q,branch,text});
    }
    try{
      if(index===0){for(const s of ['a','b','c'])apply(s);}
      if(index===1){apply('test');apply(branch);apply('finish');}
      if(index===2){apply('pre');apply('test');apply(branch+'1');apply(branch+'2');}
      const ok=q.n===input.target*q.d;
      return {ok,events,value:q,error:ok?null:`做出 ${format(q)}，目標 ${input.target}`};
    }catch(error){return {ok:false,events,value:q,error:error.message};}
  }
  return {cards,levels,blank,valid,ready,trace,rational,format,names:{icing:'糖霜',sprinkles:'彩糖',cherry:'櫻桃'}};
});
