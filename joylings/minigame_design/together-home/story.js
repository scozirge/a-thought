(function(root){
  'use strict';
  const opening=[
    {at:1.8,speaker:'貓咪',line:'咦？你也要回家嗎？'},
    {at:5,speaker:'狗狗',line:'對呀！我們一起走吧！'},
    {at:8.2,speaker:'貓咪',line:'路上互相幫忙，一起回家！'}
  ];
  function create({startWarmup,clear,focus}){
    const byId=id=>document.getElementById(id),intro=byId('intro'),finale=byId('finale');
    const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
    const text=(id,value)=>{const node=byId(id);if(node.textContent!==value)node.textContent=value;};
    let phase='game',elapsed=0,last=null,paused=document.hidden;
    function finishIntro(){phase='game';intro.close();clear();startWarmup();}
    function bubble(id,line,actors){
      const node=byId(`${id}-bubble`),canvas=byId(`${id}-art`);
      node.hidden=!line;if(!line)return;
      text(`${id}-speaker`,`${line.speaker}：`);text(`${id}-line`,line.line);
      if(node.dataset.speaker!==line.speaker)node.dataset.speaker=line.speaker;
      const anchor=actors[line.speaker==='貓咪'?0:1],scale=canvas.clientWidth/canvas.width;
      const x=canvas.offsetLeft+anchor.x*scale,half=node.offsetWidth/2;
      const center=Math.max(half+12,Math.min(canvas.parentElement.clientWidth-half-12,x));
      node.style.left=`${center}px`;node.style.top=`${canvas.offsetTop+anchor.y*scale-14}px`;
      node.style.setProperty('--tail-x',`${Math.max(18,Math.min(node.offsetWidth-18,x-center+half))}px`);
    }
    function paint(){
      if(intro.open){
        const actors=TogetherArt.meeting(byId('intro-art'),elapsed,phase==='ready',reduced());
        const index=phase==='ready'?-1:opening.findLastIndex(line=>elapsed>=line.at);
        bubble('intro',opening[index],actors);
      }
      if(finale.open){
        const done=reduced()||elapsed>=7.5;
        const actors=TogetherArt.homecoming(byId('finale-art'),elapsed,reduced());
        text('finale-title',done?'團結就是力量！':'我們回家了！');
        byId('finale-message').hidden=!done;
        bubble('finale',done?null:elapsed<3.5?{speaker:'貓咪',line:'謝謝你一直陪著我！'}:{speaker:'狗狗',line:'一起幫忙，真的回到家了！'},actors);
      }
    }
    byId('intro-start').onclick=()=>{if(phase!=='ready')return;phase='opening';elapsed=0;last=null;clear();byId('intro-start').hidden=true;byId('intro-skip').hidden=false;byId('intro-skip').focus();paint();};
    byId('intro-skip').onclick=finishIntro;
    intro.addEventListener('cancel',e=>{e.preventDefault();finishIntro();});
    byId('finale-close').onclick=()=>finale.close();
    finale.addEventListener('close',()=>{phase='game';elapsed=0;last=null;clear();focus();});
    window.addEventListener('blur',()=>{paused=true;last=null;});
    window.addEventListener('focus',()=>{paused=document.hidden;last=null;});
    document.addEventListener('visibilitychange',()=>{paused=document.hidden;last=null;});
    return {
      get active(){return intro.open||finale.open;},
      openIntro(){phase='ready';elapsed=0;last=null;clear();byId('intro-start').hidden=false;byId('intro-skip').hidden=true;intro.showModal();byId('intro-start').focus();paint();},
      openEnding(){phase='ending';elapsed=0;last=null;clear();byId('finale-message').hidden=true;finale.showModal();byId('finale-close').focus();paint();},
      frame(time){
        if(!this.active){last=null;return;}
        if(last!==null&&!paused&&phase!=='ready')elapsed+=Math.max(0,Math.min((time-last)/1000,.1));
        last=time;paint();if(phase==='opening'&&elapsed>=13.5)finishIntro();
      },
      read(){return {phase,elapsed,paused};}
    };
  }
  root.TogetherStory={create};
})(globalThis);
