'use strict';
(() => {
  const aliases = [
    ['🐱','貓貓怪'],['🐶','大狗狗'],['🐧','胖企鵝'],['🦊','小狐狸'],['🐡','圓河豚'],
    ['🐻','熊熊糖'],['🐙','小章魚'],['🐰','兔耳朵'],['🦔','刺刺蝟'],['🐢','慢烏龜'],
    ['🦌','花花鹿'],['🐿️','松鼠球'],['🦦','水獺獺'],['🐷','粉紅豬'],['🐸','蹦蹦蛙'],
    ['🦁','獅子王'],['🐳','小鯨魚'],['🐦','啾啾鳥'],['🐨','考拉寶'],['🐯','虎斑班']
  ];
  const $ = id => document.getElementById(id);
  let unity, current, selected='pen', chalk=1, pointer=null, toastTimer, galleryKey='', rosterKey='', lastRound=-1, lastWinner=-1, originalURL='', art=new Map();
  const send = (method,arg) => { if(unity) arg===undefined ? unity.SendMessage('Studio',method) : unity.SendMessage('Studio',method,String(arg)); };
  const show = (id,visible) => { $(id).hidden=!visible; };
  const label = i => aliases[i].join(' ');
  function toast(text) {
    clearTimeout(toastTimer); $('toast').textContent=text;show('toast',true);
    toastTimer=setTimeout(()=>show('toast',false),3500);
  }
  function pictureURL(packed) {
    const data=Uint8Array.from(atob(packed),c=>c.charCodeAt(0));
    const bits=new Uint8Array(32768);
    if(data[0]===2)bits.set(data.subarray(1));
    else for(let i=1;i<data.length;){
      const start=data[i]*256+data[i+1], count=data[i+2];i+=3;
      bits.set(data.subarray(i,i+count),start);i+=count;
    }
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const ctx=canvas.getContext('2d'), image=ctx.createImageData(256,256);
    const rgb=current.palette.map(hex=>parseInt(hex.slice(1),16));
    for(let i=0;i<65536;i++){
      const color=rgb[(bits[i>>1]>>((i&1)*4))&15],n=i*4;
      image.data[n]=color>>16;image.data[n+1]=(color>>8)&255;image.data[n+2]=color&255;image.data[n+3]=255;
    }
    ctx.putImageData(image,0,0);return canvas.toDataURL();
  }
  function picture(round,id,revision,ink) {
    if(current?.round!==round||current.phase!=='reveal')return;
    if(art.get(id)?.revision>=revision)return;
    art.set(id,{revision,url:pictureURL(ink)});galleryKey='';renderGallery(current);
  }
  function renderGallery(v) {
    const key=JSON.stringify([v.round,v.slide,v.host,v.winner,v.canPick,v.people,v.showOrder,art.size]);
    if(galleryKey===key)return;
    galleryKey=key;
    const wall=$('gallery');wall.replaceChildren();
    const all=v.slide===-1,answerOnly=v.slide===-2;
    wall.classList.toggle('spotlight',!all&&!answerOnly);
    wall.classList.toggle('answer-only',answerOnly);
    $('show-status').textContent=all?'一起看作品':answerOnly?'公布答案':`作品 ${v.slide+1} / ${v.showOrder.length}`;
    $('result-title').textContent=all?'作品牆':answerOnly?'先看原圖':'作品分享';
    show('next',all&&v.host&&v.canPick);
    show('result-note',all);
    function tile(text,url,style,id){
      const selectable=all && v.host && v.canPick && id>0 && Boolean(url);
      const card=document.createElement(selectable?'button':'article');card.className='tile '+style;
      if(selectable){card.setAttribute('aria-label','選 '+text+' 為最相近');card.onclick=()=>send('Choose',id);}
      if(url){const img=new Image();img.src=url;img.alt=text;card.append(img);}
      else{const blank=document.createElement('div');blank.className='blank';blank.textContent=id && v.people.find(p=>p.id===id)?.drawn?'作品載入中':'白紙';card.append(blank);}
      const caption=document.createElement('strong');caption.textContent=text;card.append(caption);wall.append(card);
    }
    if(v.original){originalURL||=pictureURL(v.original);tile('原圖',originalURL,'original',0);}
    if(answerOnly)return;
    const ids=all?v.showOrder:[v.showOrder[v.slide]];
    const roster=new Map(v.people.map(p=>[p.id,p]));
    for(const id of ids){
      const p=roster.get(id);if(!p)continue;
      const winner=v.winner===p.id;
      tile((winner?'★ ':'')+label(p.avatar)+(winner?' · 最相近':''),p.drawn?art.get(p.id)?.url:null,winner?'winner':'',p.id);
    }
    if(!all)return;
    const valid=v.people.some(p=>p.drawn), chosen=v.people.find(p=>p.id===v.winner);
    $('result-note').textContent=chosen?label(chosen.avatar)+' 的作品最相近': !valid?'這一輪還沒有作品。':v.host?'可以選出最相近的作品。':'等小工程師出下一題。';
    if(chosen && lastWinner!==v.winner){lastWinner=v.winner;toast(label(chosen.avatar)+' 最相近！');}
  }
  function renderRoster(people,me) {
    const key=JSON.stringify([me,people.map(p=>[p.id,p.avatar,p.online,p.done])]);
    if(key===rosterKey)return;
    rosterKey=key;
    $('roster').replaceChildren(...people.map(p=>{
      const item=document.createElement('li');item.dataset.id=p.id;
      item.classList.toggle('away',!p.online);
      const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=aliases[p.avatar][0];
      item.append(icon,document.createTextNode(aliases[p.avatar][1]));
      if(p.id===me){const tag=document.createElement('span');tag.className='self-tag';tag.textContent='你';item.append(tag);}
      if(p.done){const tick=document.createElement('b');tick.textContent='✓';tick.setAttribute('aria-label','已完成');item.append(tick);}
      if(!p.online)item.append(document.createTextNode('已離開'));
      return item;
    }));
  }
  function view(v) {
    if(v.round!==lastRound || v.phase==='home') {
      lastRound=v.round;lastWinner=-1;art=new Map();galleryKey='';originalURL='';pointer=null;
    }
    const old=current;current=v;
    const inRoom=v.connected && v.phase!=='home', drawing=inRoom && v.phase==='draw';
    const preview=inRoom && v.host && v.phase==='wait';
    show('entry',!inRoom);show('waiting',inRoom && !preview && ['wait','joining','handoff'].includes(v.phase));
    show('drawing',drawing||preview);show('tools',drawing&&!v.host);show('palette',drawing&&!v.host);show('result',v.phase==='reveal');
    show('prompt-tools',v.host&&(preview||drawing));show('start',preview);show('clock',drawing);
    if(v.host)$('difficulty').value=String(v.level);
    show('foot',inRoom);show('roster',inRoom && v.people.length>0);renderRoster(v.people,v.host?0:v.me);
    const selfKnown=inRoom&&(v.host||v.me>0);
    show('self-id',selfKnown);
    if(selfKnown)$('self-id').textContent='你是'+(v.host?'小工程師':'師傅')+' · '+label(v.identity);
    show('end',drawing&&v.host);show('draw-title',drawing&&!v.host);
    $('board-slot').className=drawing||preview?'paper':'park';
    $('round-tag').textContent=inRoom && v.round?'第 '+v.round+' 輪':'';
    $('name').textContent=aliases[v.identity][1];$('avatar').textContent=aliases[v.identity][0];
    for(const id of ['join','host','identity'])$(id).disabled=!unity || v.busy;
    $('status').textContent=v.busy?'連線中…':!unity?'畫室準備中…':'';
    const online=v.people.filter(p=>p.online).length;
    $('who').textContent=online+' 位師傅';
    $('wait-title').textContent=v.host?'畫室開門了':v.phase==='handoff'?'正在接手教室…':v.phase==='joining'?'正在進教室…':'等出題者開始';
    if(drawing||preview){
      show('role',v.host);if(v.host)$('role').textContent='大聲說出你的作品 讓師傅們幫你完工!';
      const locked=v.done||v.markPending||v.seconds<=0;
      if(locked)pointer=null;
      for(const b of document.querySelectorAll('[data-tool],[data-chalk],#undo,#clear'))b.disabled=locked;
      $('mark').disabled=v.markPending||v.seconds<=0;
      $('mark').textContent=v.done?'☑ 取消勾選':'□ 畫好了';
      $('mark').setAttribute('aria-pressed',String(v.done));
      $('clock').textContent=Math.floor(v.seconds/60)+':'+String(v.seconds%60).padStart(2,'0');
      $('clock').classList.toggle('soon',v.seconds<=20);
      if(old?.round!==v.round||old?.phase!=='draw'){selected='pen';updateTools();}
      for(const b of document.querySelectorAll('[data-chalk]'))b.style.backgroundColor=v.palette[Number(b.dataset.chalk)];
    } else pointer=null;
    if(v.phase==='reveal')renderGallery(v);
  }
  function updateTools(){
    for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b.dataset.tool===selected));
    for(const b of document.querySelectorAll('[data-chalk]'))b.setAttribute('aria-pressed',String(selected!=='eraser' && Number(b.dataset.chalk)===chalk));
  }
  function ready(instance){
    unity=instance;
    let token;
    try{
      token=sessionStorage.getItem('shape-studio-seat');
      if(!/^[a-f0-9]{32}$/.test(token||'')){
        token=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
        sessionStorage.setItem('shape-studio-seat',token);
      }
      send('SetToken',token);
    }catch{}
    if(current)view(current);
  }
  const paper=$('unity-canvas');
  function point(e,op) {
    const r=paper.getBoundingClientRect();
    const norm=(n,size)=>Math.max(0,Math.min(255,Math.round(n/size*255)));
    send('Pointer',JSON.stringify({op,tool:selected,chalk,x:norm(e.clientX-r.left,r.width),y:norm(e.clientY-r.top,r.height)}));
  }
  paper.addEventListener('pointerdown',e=>{
    if(!current || current.host || current.phase!=='draw'||current.done||current.markPending||current.seconds<=0||pointer!==null||e.button!==0)return;
    e.preventDefault();pointer=e.pointerId;paper.setPointerCapture(pointer);point(e,'down');
  });
  paper.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer)return;e.preventDefault();
    const samples=e.getCoalescedEvents?.();for(const p of samples?.length?samples:[e])point(p,'move');
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])paper.addEventListener(type,e=>{
    if(e.pointerId!==pointer)return;pointer=null;
    if(type==='pointerup')point(e,'up');
    else send('EndStroke');
    if(paper.hasPointerCapture(e.pointerId))paper.releasePointerCapture(e.pointerId);
  });
  $('identity').onclick=()=>send('Reroll');$('host').onclick=()=>send('HostRoom');$('join').onclick=()=>send('JoinRoom');
  $('start').onclick=$('next').onclick=()=>send('NextRound');$('undo').onclick=()=>send('Undo');
  $('clear').onclick=()=>send('ClearPaper');
  $('difficulty').onchange=e=>send('SetDifficulty',e.target.value);$('reroll').onclick=()=>send('RerollPrompt');
  $('end').onclick=()=>send('EndRound');$('mark').onclick=()=>send('ToggleDone');
  $('leave').onclick=()=>{if(!current?.host || confirm('關閉教室？'))send('Leave');};
  for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>{selected=b.dataset.tool;updateTools();};
  ['紅','橙','黃','綠','藍','紫'].forEach((name,i)=>{
    const b=document.createElement('button');b.dataset.chalk=i+1;b.textContent=name;b.setAttribute('aria-label',name+'色粉筆');
    b.onclick=()=>{chalk=i+1;if(selected==='eraser')selected='pen';updateTools();};$('palette').append(b);
  });
  updateTools();
  for(const id of ['join','host','identity'])$(id).disabled=true;
  window.paperStudio={view,toast,picture,ready,
    loading:p=>{if(!unity)$('status').textContent='畫室準備中… '+Math.round(p*100)+'%';},
    fail:()=>{$('status').textContent='載入失敗，請重新整理。';}
  };
})();
