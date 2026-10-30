using System;
using System.Linq;
using System.Collections.Generic;
namespace CatDog {
 // Deterministic C# port of the original game. The 120 Hz input recordings are
 // checked against JavaScript checkpoints by the Editor before every build.
 public static class Rules {
  public const double Speed=210,Gravity=1600,Jump=440,Dt=1.0/120;
  static double Clamp(double v,double a,double b)=>Math.Max(a,Math.Min(b,v));
  static double Shift(double v,double target,double distance)=>v+Math.Sign(target-v)*Math.Min(Math.Abs(target-v),distance);
  static bool Hit(Body a,Body b)=>a.x+a.w>b.x+1&&a.x<b.x+b.w-1&&a.y+a.h>b.y+1&&a.y<b.y+b.h-1;
  public static State Fresh(Level l,int index){
   return new State{level=index,gravity=new[]{1,1},clock=0,balances=l.balances.Select(b=>(double[])b.initial.Clone()).ToArray(),
    rafts=l.rafts.Select(f=>f.x).ToArray(),players=l.starts.Select((x,i)=>new Body{x=x,y=(l.startFloors==null?400:l.startFloors[i])-44,grounded=true}).ToArray(),
    boxes=l.boxes.Select(b=>{var copy=b.Copy();copy.vy=0;copy.grounded=true;return copy;}).ToArray(),lifts=l.lifts.Select(f=>f.bottom).ToArray(),
    switches=new bool[l.switches.Length],mode=l.mode,collected=new bool[l.keys.Length],collectedBy=new int?[l.keys.Length],latched=new bool[l.gates.Length]};
  }
  static bool OnPad(Body p,Thing b)=>!p.exited&&p.grounded&&Math.Abs(p.y+p.h-b.y)<4&&p.x+p.w>b.x+3&&p.x<b.x+b.w-3;
  public static bool Weighted(State s,Thing b){
   if(b.crateOnly)return s.boxes.Any(p=>OnPad(p,b));
   var bodies=b.owner.HasValue?s.players.Where((p,i)=>i==b.owner&&!p.exited):s.players.Where(p=>!p.exited).Concat(s.boxes);
   return bodies.Any(p=>p.grounded&&Math.Abs((b.ceiling?p.y:p.y+p.h)-b.y)<4&&p.x+p.w>b.x+3&&p.x<b.x+b.w-3);
  }
  public static bool Active(State s,Thing f)=>(!f.mode.HasValue||f.mode==s.mode)&&(f.pads==null||f.pads.Any(b=>Weighted(s,b)));
  public static bool Open(State s,Level l,int i){var g=l.gates[i];if(g.openAfterKey.HasValue&&s.collected[g.openAfterKey.Value])return true;return (g.keyIndices==null||g.keyIndices.All(k=>s.collected[k]))&&Active(s,g)&&(g.buttons==null||g.buttons.All(b=>Weighted(s,b)));}
  public static bool Icy(Body p,Level l)=>l.ice||l.iceZones.Any(z=>p.x+p.w/2>=z.x&&p.x+p.w/2<z.x+z.w&&p.y+p.h>=z.y&&p.y<z.y+z.h);
  public static bool CanHelp(State s,Level l){var a=s.players[0];var b=s.players[1];return l.helpRange==0||Math.Sqrt(Math.Pow(a.x+a.w/2-b.x-b.w/2,2)+Math.Pow(a.y+a.h/2-b.y-b.h/2,2))<=l.helpRange;}
  public static Thing[] Moving(State s,Level l)=>l.movers.Select(f=>{var p=f.Copy();p.y+=f.range*Math.Cos(s.clock*1.2+f.phase);return p;}).ToArray();
  public static Thing[] Rafts(State s,Level l)=>l.rafts.Select((f,i)=>{var p=f.Copy();p.x=s.rafts[i];return p;}).ToArray();
  public static Thing[] Balanced(State s,Level l)=>l.balances.SelectMany((b,i)=>new[]{b.a,b.b}.Select((f,j)=>{var p=f.Copy();p.y=s.balances[i][j];p.h=14;return p;})).ToArray();
  public static Thing[] Surfaces(State s,Level l,int actor=-1)=>l.platforms.Where(p=>Active(s,p)&&(!p.owner.HasValue||p.owner==actor))
   .Concat(l.lifts.Select((f,i)=>{var p=f.Copy();p.y=s.lifts[i];p.h=12;return p;})).Concat(Moving(s,l).Where(p=>Active(s,p))).Concat(Balanced(s,l)).Concat(Rafts(s,l)).ToArray();
  static void Block(Body body,Body previous,State s,Level l){
   int[] sides=new int[l.gates.Length];
   for(int i=0;i<l.gates.Length;i++){
    var g=l.gates[i];double left=g.x-body.w,right=g.x+g.w;
    int remembered=previous.gateSides.Length>i?previous.gateSides[i]:0;
    int side=previous.x<=left+.001?-1:previous.x>=right-.001?1:remembered!=0?remembered:previous.x+body.w/2<g.x+g.w/2?-1:1;
    if(!Open(s,l,i)&&Math.Max(previous.y+body.h,body.y+body.h)>g.y&&Math.Min(previous.y,body.y)<g.y+g.h){if(side<0&&body.x>left)body.x=left;if(side>0&&body.x<right)body.x=right;}
    sides[i]=body.x<=left+.001?-1:body.x>=right-.001?1:side;
   }
   body.x=Clamp(body.x,0,(l.world?.width??1000)-body.w);body.gateSides=sides;
  }
  static void Vertical(Body o,Body prev,State s,State n,Level l,double dt,int actor=-1){
   if(l.gravityFlip&&actor>=0&&n.gravity[actor]==-1){
    o.vy-=Gravity*dt;o.y+=o.vy*dt;o.grounded=false;
    var ceilings=l.ceilingPieces??new[]{new Thing{x=0,y=l.ceiling-12,w=1000,h=12}};
    foreach(var f in ceilings.Concat(Surfaces(n,l,actor)).OrderByDescending(f=>f.y)){
     double bottom=f.y+(f.h==0?12:f.h);if(o.vy<=0&&prev.y>=bottom-2&&o.y<=bottom&&o.x+o.w>f.x+2&&o.x<f.x+f.w-2){o.y=bottom;o.vy=0;o.grounded=true;break;}
    }return;
   }
   bool carried=false;var oldMovers=Moving(s,l).Concat(Rafts(s,l)).ToArray();var newMovers=Moving(n,l).Concat(Rafts(n,l)).ToArray();
   for(int i=0;i<oldMovers.Length;i++){var f=oldMovers[i];if(Active(s,f)&&Active(n,f)&&Math.Abs(prev.y+prev.h-f.y)<2&&prev.x+prev.w>f.x+2&&prev.x<f.x+f.w-2&&o.vy>=0){o.y+=newMovers[i].y-f.y;o.x+=newMovers[i].x-f.x;carried=true;}}
   var oldBalances=Balanced(s,l);var newBalances=Balanced(n,l);
   for(int i=0;i<oldBalances.Length;i++){var f=oldBalances[i];if(Math.Abs(prev.y+prev.h-f.y)<2&&prev.x+prev.w>f.x+2&&prev.x<f.x+f.w-2&&o.vy>=0){o.y+=newBalances[i].y-f.y;carried=true;}}
   for(int i=0;i<l.lifts.Length;i++){var f=l.lifts[i];if(Math.Abs(prev.y+o.h-s.lifts[i])<2&&prev.x+prev.w>f.x+2&&prev.x<f.x+f.w-2&&o.vy>=0){o.y+=n.lifts[i]-s.lifts[i];carried=true;}}
   o.vy+=Gravity*dt;o.y+=o.vy*dt;o.grounded=false;
   foreach(var f in (l.floor??new[]{new Thing{x=0,y=400,w=1000}}).Concat(Surfaces(n,l,actor)).OrderBy(f=>f.y)){
    if(o.vy>=0&&(prev.y+prev.h<=f.y+2||carried&&o.y+o.h-f.y<6)&&o.y+o.h>=f.y&&o.x+o.w>f.x+2&&o.x<f.x+f.w-2){o.y=f.y-o.h;o.vy=0;o.grounded=true;break;}
   }
  }
  static Dictionary<int,int> LinkedDirections(State s,Command[] input,Level l,double dt){
   var directions=new Dictionary<int,int>();if(l.linkedBoxes==null)return directions;
   foreach(var pair in l.linkedBoxes){
    var intents=new HashSet<int>();
    foreach(int index in pair){var b=s.boxes[index];for(int i=0;i<2;i++){var p=s.players[i];int axis=input[i].axis;if(axis==0||input[i].jump||p.exited||!p.grounded||p.y+p.h<=b.y+3||p.y>=b.y+b.h-3)continue;
     if(axis>0?p.x+p.w<=b.x+2&&p.x+p.w+Speed*dt>=b.x-1:p.x>=b.x+b.w-2&&p.x-Speed*dt<=b.x+b.w+1)intents.Add(axis);
    }}
    int dir=intents.Count==1?intents.First():0;
    if(dir!=0)foreach(int index in pair){var old=s.boxes[index];var b=old.Copy();b.x+=dir*Speed*dt;
     if(b.x<0||b.x+b.w>l.world.width||l.gates.Where((g,i)=>!Open(s,l,i)).Any(g=>b.x+b.w>g.x&&b.x<g.x+g.w&&b.y+b.h>g.y&&b.y<g.y+g.h)||s.boxes.Where((q,j)=>!pair.Contains(j)).Any(q=>Hit(b,q))||s.players.Any(p=>!p.exited&&Hit(b,p)&&(dir>0?p.x>=old.x+old.w-2:p.x+p.w<=old.x+2)))dir=0;
    }
    foreach(int index in pair)directions[index]=dir;
   }return directions;
  }
  static void SettleLinked(State s,State n,Level l,Dictionary<int,int> directions){
   if(l.linkedBoxes==null)return;
   foreach(var pair in l.linkedBoxes){
    var shifts=pair.Select(i=>n.boxes[i].x-s.boxes[i].x).ToArray();if(shifts.Max()-shifts.Min()<1e-7)continue;
    int dir=directions[pair[0]];double delta=dir>0?shifts.Min():dir<0?shifts.Max():shifts.Aggregate((a,b)=>Math.Abs(a)>Math.Abs(b)?a:b);
    foreach(int i in pair){var b=n.boxes[i];double oldX=b.x;b.x=s.boxes[i].x+delta;
     for(int j=0;j<2;j++){var p=n.players[j];if(p.exited)continue;if(p.onBox==i)p.x+=b.x-oldX;
      if(p.y+p.h>b.y+1&&p.y<b.y+b.h-1&&p.x+p.w>b.x&&p.x<b.x+b.w){var old=s.players[j];if(old.x+old.w<=s.boxes[i].x+3)p.x=b.x-p.w;else if(old.x>=s.boxes[i].x+s.boxes[i].w-3)p.x=b.x+b.w;}
     }
    }
   }
  }
  public static State Step(State s,Command[] commands,Level l,double dt=Dt){
   if(s.won||s.failed)return s;var n=s.Copy();n.flash=Math.Max(0,s.flash-dt);var input=(Command[])commands.Clone();
   if(l.jumpSwap)for(int i=0;i<2;i++)input[i].jump=CanHelp(s,l)&&commands[1-i].jump;
   if(l.gravityFlip)for(int i=0;i<2;i++){int j=1-i;if(input[i].special&&!s.players[j].exited){n.gravity[j]*=-1;var p=n.players[j];p.vy=0;p.grounded=false;p.support=p.onBox=-1;n.flash=.3;}}
   n.clock=s.clock+dt;
   for(int i=0;i<l.balances.Length;i++){
    var b=l.balances[i];if(s.collected[b.lockKey]){n.balances[i]=s.balances[i].Select(y=>Shift(y,b.top,b.speed*dt)).ToArray();continue;}
    int[] weight=new[]{b.a,b.b}.Select((f,j)=>s.players.Where((p,k)=>!p.exited&&p.grounded&&!input[k].jump&&Math.Abs(p.y+p.h-s.balances[i][j])<3&&p.x+p.w>f.x+2&&p.x<f.x+f.w-2).Count()).ToArray();
    int direction=Math.Sign(weight[0]-weight[1]);if(direction!=0){n.balances[i][0]=Shift(s.balances[i][0],direction>0?b.bottom:b.top,b.speed*dt);n.balances[i][1]=b.top+b.bottom-n.balances[i][0];}
   }
   for(int i=0;i<l.rafts.Length;i++){var f=l.rafts[i];var directions=f.controls.Where(b=>s.players.Any(p=>OnPad(p,b))).Select(b=>b.dir).Distinct().ToArray();int dir=directions.Length==1?directions[0]:0;n.rafts[i]=Clamp(s.rafts[i]+dir*f.speed*dt,f.min,f.max);}
   var linked=LinkedDirections(s,input,l,dt);
   if(l.phaseOnJump&&input.Where((a,i)=>a.jump&&s.players[i].grounded&&!s.players[i].exited).Any()){n.mode=1-s.mode;n.flash=.3;}
   for(int i=0;i<l.lifts.Length;i++){var f=l.lifts[i];double target=f.buttons.Any(b=>Weighted(s,b))?f.top:f.bottom;n.lifts[i]=Shift(s.lifts[i],target,(f.speed==0?90:f.speed)*dt);}
   for(int i=0;i<n.boxes.Length;i++){
    var b=n.boxes[i];var prev=s.boxes[i];int dir=0;
    for(int p=0;p<2;p++){
     var a=s.players[p];int axis=input[p].axis;if(a.exited||axis==0||!a.grounded||input[p].jump||a.y+a.h<=prev.y+3||a.y>=prev.y+prev.h-3)continue;
     bool contact=axis>0&&a.x+a.w<=prev.x+2&&a.x+a.w+axis*Speed*dt>=prev.x-1||axis<0&&a.x>=prev.x+prev.w-2&&a.x+axis*Speed*dt<=prev.x+prev.w+1;if(!contact)continue;
     int j=1-p;var q=s.players[j];double gap=axis>0?a.x-q.x-q.w:q.x-a.x-a.w;
     bool together=!q.exited&&q.grounded&&!input[j].jump&&input[j].axis==axis&&Math.Abs(q.y+q.h-(prev.y+prev.h))<4&&gap>=-2&&gap<=3;
     if(!b.heavy||together)dir=axis;
    }
    if(linked.TryGetValue(i,out int ld))dir=ld;b.x+=dir*Speed*dt;
    for(int j=0;j<n.boxes.Length;j++)if(j!=i&&Hit(b,n.boxes[j]))b.x=prev.x;
    foreach(var p in s.players)if(!p.exited&&Hit(b,p)&&(((dir!=0?dir:b.vx)>0&&p.x>=prev.x+prev.w-2)||((dir!=0?dir:b.vx)<0&&p.x+p.w<=prev.x+2)))b.x=prev.x;
    Block(b,prev,s,l);Vertical(b,prev,s,n,l,dt);
   }
   for(int i=0;i<2;i++){
    var p=n.players[i];var old=s.players[i];var a=input[i];if(p.exited)continue;
    if(a.jump&&p.grounded){p.vy=-Jump*n.gravity[i];p.support=p.onBox=-1;p.grounded=false;}
    if(!Icy(p,l)){p.vx=0;p.x+=a.axis*Speed*dt;}else{p.vx=a.axis!=0?Clamp(p.vx+a.axis*700*dt,-240,240):Math.Sign(p.vx)*Math.Max(0,Math.Abs(p.vx)-30*dt);p.x+=p.vx*dt;}
    if(p.support>=0&&!s.players[p.support].exited)p.x+=input[p.support].axis*Speed*dt;
    if(p.onBox>=0)p.x+=n.boxes[p.onBox].x-s.boxes[p.onBox].x;p.support=p.onBox=-1;
    Vertical(p,old,s,n,l,dt,i);
    for(int j=0;j<n.boxes.Length;j++){var b=n.boxes[j];if(p.vy>=0&&old.y+old.h<=s.boxes[j].y+2&&p.y+p.h>=b.y&&p.x+p.w>b.x+2&&p.x<b.x+b.w-2){p.y=b.y-p.h;p.vy=0;p.grounded=b.grounded;p.onBox=j;}else if(Hit(p,b)){if(old.x+old.w<=s.boxes[j].x+2)p.x=b.x-p.w;else if(old.x>=s.boxes[j].x+b.w-2)p.x=b.x+b.w;}}
    Block(p,old,s,l);
   }
   for(int i=0;i<2;i++){var p=n.players[i];var q=n.players[1-i];if(p.exited||q.exited||n.gravity[i]==-1||n.gravity[1-i]==-1)continue;
    if(p.vy>=q.vy&&s.players[i].y+s.players[i].h<=s.players[1-i].y+2&&p.y+p.h>=q.y&&p.x+p.w>q.x+2&&p.x<q.x+q.w-2){p.y=q.y-p.h;p.vy=q.vy;p.grounded=q.grounded;p.support=1-i;}
   }
   for(int pass=0;pass<3;pass++){
    var a=n.players[0];var b=n.players[1];if(!a.exited&&!b.exited&&Hit(a,b)&&Math.Min(a.y+a.h,b.y+b.h)-Math.Max(a.y,b.y)>3){int left=s.players[0].x<=s.players[1].x?0:1,right=1-left;double d=n.players[left].x+n.players[left].w-n.players[right].x;if(d>0){n.players[left].x-=d/2;n.players[right].x+=d/2;}}
    for(int i=0;i<2;i++){var p=n.players[i];if(p.exited)continue;Block(p,s.players[i],s,l);foreach(var box in n.boxes)if(Hit(p,box)){if(s.players[i].x+s.players[i].w<=box.x+4)p.x=box.x-p.w;else if(s.players[i].x>=box.x+box.w-4)p.x=box.x+box.w;}}
   }
   if(l.tether!=0&&!n.players.Any(p=>p.exited))for(int i=0;i<2;i++){var p=n.players[i];var q=n.players[1-i];if(Math.Abs(p.x-q.x)>l.tether&&Math.Abs(p.x-q.x)>Math.Abs(s.players[i].x-q.x))p.x=s.players[i].x;}
   for(int i=0;i<l.switches.Length;i++){bool down=Weighted(n,l.switches[i]);if(down&&!s.switches[i])n.mode=1-n.mode;n.switches[i]=down;}
   if(l.rafts.Length>0&&n.boxes.Any(b=>b.y>l.fallY)){n.lostCargo=true;n.failed=true;}
   for(int pass=0;pass<=l.gates.Length;pass++){
    for(int i=0;i<n.boxes.Length;i++)Block(n.boxes[i],s.boxes[i],n,l);SettleLinked(s,n,l,linked);
    for(int i=0;i<2;i++)if(!n.players[i].exited)Block(n.players[i],s.players[i],n,l);
   }
   if(l.fallY.HasValue){int fallen=Array.FindIndex(n.players,p=>!p.exited&&(p.y>l.fallY||l.fallTop.HasValue&&p.y+p.h<l.fallTop));if(fallen>=0){n.failed=true;n.fallen=fallen;return n;}}
   for(int actor=0;actor<2;actor++){var p=n.players[actor];if(p.exited)continue;for(int i=0;i<l.keys.Length;i++){var k=l.keys[i];if(!n.collected[i]&&(!k.owner.HasValue||k.owner==actor)&&p.x<k.x+k.r&&p.x+p.w>k.x-k.r&&p.y<k.y+k.r&&p.y+p.h>k.y-k.r){n.collected[i]=true;n.collectedBy[i]=actor;}}}
   n.key=n.collected.All(v=>v);
   foreach(var p in n.players)if(!p.exited&&n.key&&p.x+p.w/2>l.door.x+14&&p.x+p.w/2<l.door.x+l.door.w-3&&Math.Abs(p.y+p.h-(l.door.y+l.door.h))<4){p.exited=true;p.support=-1;}
   n.won=n.players.All(p=>p.exited);return n;
  }
 }
}
