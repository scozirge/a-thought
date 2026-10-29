(function(root){
  const onPad=(body,pad)=>!body.exited&&body.grounded&&Math.abs(body.y+(body.h??44)-pad.y)<4&&body.x+(body.w??38)>pad.x+3&&body.x<pad.x+pad.w-3;
  function create(levels){return {
    fresh(l){return {rafts:(l.rafts||[]).map(f=>f.x),echoes:[null,null],lostCargo:false};},
    platforms(s,l){return (l.rafts||[]).map((f,i)=>({...f,x:s.rafts[i]}));},
    begin(s,n,input,l,dt){
      n.echoes=[...s.echoes];n.rafts=[...s.rafts];
      (l.rafts||[]).forEach((f,i)=>{
        const directions=new Set(f.controls.filter(b=>s.players.some(p=>onPad(p,b))).map(b=>b.dir));
        const dir=directions.size===1?[...directions][0]:0;
        n.rafts[i]=Math.max(f.min,Math.min(f.max,s.rafts[i]+dir*f.speed*dt));
      });
    },
    weighted(s,b){
      if(b.crateOnly)return s.boxes.some(p=>onPad(p,b));
      if(b.echoPad!==undefined)return s.echoes.includes(b.echoPad)||s.players.some(p=>onPad(p,b));
    },
    openGate(s,l,i){
      const g=l.gates[i];
      if(g.openAfterKey!==undefined&&s.collected[g.openAfterKey])return true;
      if(g.echoNeeds)return g.echoNeeds.every(id=>s.echoes.includes(id)||s.players.some(p=>onPad(p,l.echoPads[id])))&&(!g.buttons||g.buttons.every(b=>s.players.some(p=>onPad(p,b))));
    },
    afterMove(s,n,l){
      (l.echoPads||[]).forEach((pad,index)=>n.players.forEach((p,i)=>{if(onPad(p,pad))n.echoes[i]=index;}));
      if(l.rafts&&n.boxes.some(b=>b.y>l.fallY)){n.lostCargo=true;n.failed=true;}
    },
    afterGates(s,n,l,directions){
      // A pilot can leave a remote pad during a push. Apply any closing-gate
      // correction to BOTH linked crates, preserving their fixed separation.
      for(const pair of l.linkedBoxes||[]){
        const shifts=pair.map(i=>n.boxes[i].x-s.boxes[i].x);
        if(Math.max(...shifts)-Math.min(...shifts)<1e-7)continue;
        const dir=directions[pair[0]],delta=dir>0?Math.min(...shifts):dir<0?Math.max(...shifts):shifts.reduce((a,b)=>Math.abs(a)>Math.abs(b)?a:b);
        pair.forEach(i=>{const b=n.boxes[i],oldX=b.x;b.x=s.boxes[i].x+delta;
          n.players.forEach((p,j)=>{
            if(p.exited)return;
            if(p.onBox===i)p.x+=b.x-oldX;
            if(p.y+p.h>b.y+1&&p.y<b.y+b.h-1&&p.x+p.w>b.x&&p.x<b.x+b.w){
              const old=s.players[j];if(old.x+old.w<=s.boxes[i].x+3)p.x=b.x-p.w;else if(old.x>=s.boxes[i].x+s.boxes[i].w-3)p.x=b.x+b.w;
            }
          });
        });
      }
    },
    boxDirections(s,input,l,dt,C,{open,hit}){
      if(!l.linkedBoxes)return;
      const directions={};
      for(const pair of l.linkedBoxes){
        const intents=new Set();
        for(const index of pair){const b=s.boxes[index];s.players.forEach((p,i)=>{
          const axis=input[i]?.axis||0;if(!axis||input[i]?.jump||p.exited||!p.grounded||p.y+p.h<=b.y+3||p.y>=b.y+b.h-3)return;
          if(axis>0?p.x+p.w<=b.x+2&&p.x+p.w+C.speed*dt>=b.x-1:p.x>=b.x+b.w-2&&p.x-C.speed*dt<=b.x+b.w+1)intents.add(axis);
        });}
        let dir=intents.size===1?[...intents][0]:0;
        if(dir){for(const index of pair){const old=s.boxes[index],b={...old,x:old.x+dir*C.speed*dt};
          if(b.x<0||b.x+b.w>l.world.width||l.gates.some((g,i)=>!open(s,l,i)&&b.x+b.w>g.x&&b.x<g.x+g.w&&b.y+b.h>g.y&&b.y<g.y+g.h)||s.boxes.some((q,j)=>!pair.includes(j)&&hit(b,q))||s.players.some(p=>!p.exited&&hit(b,p)&& (dir>0?p.x>=old.x+old.w-2:p.x+p.w<=old.x+2)))dir=0;
        }}
        for(const index of pair)directions[index]=dir;
      }
      return directions;
    }
  };}
  if(typeof module!=='undefined')module.exports=create;else root.TogetherPuzzleRules=create;
})(globalThis);
