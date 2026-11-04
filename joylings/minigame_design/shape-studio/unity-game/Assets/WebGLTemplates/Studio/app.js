'use strict';
(() => {
  const aliases = [
    ['🐱','貓貓怪'],['🐶','大狗狗'],['🐧','胖企鵝'],['🦊','小狐狸'],['🐡','圓河豚'],
    ['🐻','熊熊糖'],['🐙','小章魚'],['🐰','兔耳朵'],['🦔','刺刺蝟'],['🐢','慢烏龜'],
    ['🦌','花花鹿'],['🐿️','松鼠球'],['🦦','水獺獺'],['🐷','粉紅豬'],['🐸','蹦蹦蛙'],
    ['🦁','獅子王'],['🐳','小鯨魚'],['🐦','啾啾鳥'],['🐨','考拉寶'],['🐯','虎斑班']
  ];
  const $ = id => document.getElementById(id);
  let unity, current, selected='pen', pointer=null, toastTimer, galleryKey='', lastRound=-1, lastWinner=-1, art=new Map();
  const send = (method,arg) => { if(unity) arg===undefined ? unity.SendMessage('Studio',method) : unity.SendMessage('Studio',method,String(arg)); };
  const show = (id,visible) => { $(id).hidden=!visible; };
  const label = i => aliases[i].join(' ');
  function toast(text) {
    clearTimeout(toastTimer); $('toast').textContent=text;show('toast',true);
    toastTimer=setTimeout(()=>show('toast',false),3500);
  }
  function pictureURL(packed) {
    const data=Uint8Array.from(atob(packed),c=>c.charCodeAt(0));
    const bits=new Uint8Array(8192);
    if(data[0]===0)bits.set(data.subarray(1));
    else for(let i=1;i<data.length;){
      const start=data[i]*256+data[i+1], count=data[i+2];i+=3;
      bits.set(data.subarray(i,i+count),start);i+=count;
    }
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const ctx=canvas.getContext('2d'), image=ctx.createImageData(256,256);
    for(let i=0;i<65536;i++){
      const ink=bits[i>>3]&(1<<(i&7)), n=i*4;
      image.data[n]=ink?37:255;image.data[n+1]=ink?52:254;image.data[n+2]=ink?77:249;image.data[n+3]=255;
    }
    ctx.putImageData(image,0,0);return canvas.toDataURL();
  }
  function picture(round,id,revision,ink) {
    if(current?.round!==round||current.phase!=='reveal')return;
    if(art.get(id)?.revision>=revision)return;
    art.set(id,{revision,url:pictureURL(ink)});galleryKey='';renderGallery(current);
  }
  function renderGallery(v) {
    const key=JSON.stringify([v.round,v.winner,v.canPick,v.people,v.original,art.size]);
    if(galleryKey===key)return;
    galleryKey=key;
    const wall=$('gallery');wall.replaceChildren();
    function tile(text,url,style,id){
      const selectable=v.host && v.canPick && id>0 && Boolean(url);
      const card=document.createElement(selectable?'button':'article');card.className='tile '+style;
      if(selectable){card.setAttribute('aria-label','選 '+text+' 為最相近');card.onclick=()=>send('Choose',id);}
      if(url){const img=new Image();img.src=url;img.alt=text;card.append(img);}
      else{const blank=document.createElement('div');blank.className='blank';blank.textContent=id && v.people.find(p=>p.id===id)?.drawn?'作品載入中':'白紙';card.append(blank);}
      const caption=document.createElement('strong');caption.textContent=text;card.append(caption);wall.append(card);
    }
    if(v.original)tile('原圖 · '+v.title,pictureURL(v.original),'original',0);
    v.people.forEach(p=>{
      const winner=v.winner===p.id;
      tile((winner?'★ ':'')+label(p.avatar)+(winner?' · 最相近':''),p.drawn?art.get(p.id)?.url:null,winner?'winner':'',p.id);
    });
    const valid=v.people.some(p=>p.drawn), chosen=v.people.find(p=>p.id===v.winner);
    $('result-note').textContent=chosen?label(chosen.avatar)+' 的作品最相近': !valid?'這一輪還沒有作品。':v.host?'點一下最相近的作品。':'等出題者選出最相近的作品。';
    show('next',v.host);$('next').disabled=!v.canPick || (valid && !chosen);
    if(chosen && lastWinner!==v.winner){lastWinner=v.winner;toast(label(chosen.avatar)+' 最相近！');}
  }
  function view(v) {
    if(v.round!==lastRound || v.phase==='home') {
      lastRound=v.round;lastWinner=-1;art=new Map();galleryKey='';pointer=null;
    }
    const old=current;current=v;
    const inRoom=v.connected && v.phase!=='home', drawing=inRoom && v.phase==='draw';
    show('entry',!inRoom);show('waiting',inRoom && (v.phase==='wait'||v.phase==='joining'));
    show('drawing',drawing);show('tools',drawing&&!v.host);show('result',v.phase==='reveal');
    show('foot',inRoom);
    $('board-slot').className=drawing?'paper':'park';
    $('round-tag').textContent=inRoom && v.round?'第 '+v.round+' 輪':'';
    $('name').textContent=aliases[v.identity][1];$('avatar').textContent=aliases[v.identity][0];
    for(const id of ['join','host','identity'])$(id).disabled=!unity || v.busy;
    $('status').textContent=v.busy?'連線中…':!unity?'畫室準備中…':'';
    const online=v.people.filter(p=>p.online).length;
    $('who').textContent=drawing?online+' 位畫家':v.host?'✎ 出題者':label(v.identity);
    $('wait-title').textContent=v.host?'畫室開門了':v.phase==='joining'?'正在進教室…':'等出題者開始';
    $('wait-count').textContent=online+' 位畫家';show('start',v.host);
    if(drawing){
      $('role').textContent=v.host?'出題者 · 只有你看得到':'畫家 · '+label(v.identity);
      $('draw-title').textContent=v.host?v.title:'我的畫紙';
      $('clock').textContent=Math.floor(v.seconds/60)+':'+String(v.seconds%60).padStart(2,'0');
      $('clock').classList.toggle('soon',v.seconds<=20);
      if(old?.round!==v.round||old?.phase!=='draw'){selected='pen';updateTools();}
    } else pointer=null;
    if(v.phase==='reveal')renderGallery(v);
  }
  function updateTools(){for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b.dataset.tool===selected));}
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
    send('Pointer',JSON.stringify({op,tool:selected,x:norm(e.clientX-r.left,r.width),y:norm(e.clientY-r.top,r.height)}));
  }
  paper.addEventListener('pointerdown',e=>{
    if(!current || current.host || current.phase!=='draw'||current.seconds<=0||pointer!==null||e.button!==0)return;
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
  $('leave').onclick=()=>{if(!current?.host || confirm('關閉教室？'))send('Leave');};
  for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>{selected=b.dataset.tool;updateTools();};
  updateTools();
  for(const id of ['join','host','identity'])$(id).disabled=true;
  window.paperStudio={view,toast,picture,ready,
    loading:p=>{if(!unity)$('status').textContent='畫室準備中… '+Math.round(p*100)+'%';},
    fail:()=>{$('status').textContent='載入失敗，請重新整理。';}
  };
})();
