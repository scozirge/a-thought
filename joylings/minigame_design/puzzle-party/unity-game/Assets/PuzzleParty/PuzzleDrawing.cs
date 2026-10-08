using System;
using System.Linq;
using UnityEngine;

namespace Together {
 public partial class PuzzleParty {
  void MiniMask(Rect r,int[] cells,int n){float cell=r.width/n;for(int i=0;i<n*n;i++)Round(new Rect(r.x+i%n*cell,r.y+i/n*cell,cell-2,cell-2),cells.Contains(i)?C("789687"):Color.white,2);}
  void Tiles(Rect r,string[] colors,int n,bool errors=false){
   Panel(r,C("e9eddf"));float cell=(r.width-12)/n;
   for(int i=0;i<n*n;i++){Rect t=new Rect(r.x+6+i%n*cell,r.y+6+i/n*cell,cell-4,cell-4);Round(t,ColorOf(colors[i]),7);Text(t,string.IsNullOrEmpty(colors[i])?"·":Rules.Label(colors[i]),18,ink,false,TextAnchor.MiddleCenter);
    if(errors&&colors[i]!=level.target[i])Text(new Rect(t.xMax-22,t.y+1,20,24),"!",17,C("ad3f2c"),true,TextAnchor.MiddleCenter);
   }
  }
  void CueBox(Rect r){Color bg=tone=="fire"?C("fff0d3"):tone=="portal"?C("f1e7fa"):C("eef4e5");Panel(r,bg);Text(new Rect(r.x+12,r.y+10,r.width-24,66),paused?"已暫停 · "+cue:cue,22,ink,true);Text(new Rect(r.x+12,r.y+77,r.width-24,r.height-86),detail,18,ink);}
  void DrawSticker(Rect r){
   float size=Mathf.Min(235,(r.width-54)/2),left=r.x+18,right=r.xMax-size-18,y=r.y+126;
   Text(new Rect(left,y-38,size,32),"要做成這樣",18,muted,false,TextAnchor.MiddleCenter);Text(new Rect(right,y-38,size,32),"你的作品",18,muted,false,TextAnchor.MiddleCenter);
   Tiles(new Rect(left,y,size,size),level.target,level.cols);
   var m=GUI.matrix;if(rotating)RotateLocal(rotation,new Vector2(right+size/2,y+size/2));Tiles(new Rect(right,y,size,size),stickerBoard,level.cols,result!=null);GUI.matrix=m;
   float fx=r.x+18,fy=y+size+30;
   for(int i=0;i<settings.Length;i++)Flow("第 "+(i+1)+" 張\n"+StepGroup(i),active==i,ref fx,ref fy,r);
   CueBox(new Rect(r.x+16,fy+90,r.width-32,176));
   Text(new Rect(r.x+20,fy+288,r.width-40,142),level.note+"\n\n亮黃色表示目前正在貼哪一張。",18,muted);
  }
  void Flow(string title,bool on,ref float x,ref float y,Rect r){float w=128;if(x+w>r.xMax-16){x=r.x+18;y+=82;}Panel(new Rect(x,y,w,72),on?gold:C("f2f3eb"));Text(new Rect(x,y,w,72),title,18,on?ink:muted,on,TextAnchor.MiddleCenter);x+=w+8;}
  void DrawHero(Rect r){
   CueBox(new Rect(r.x+14,r.y+66,r.width-28,100));
   float y=r.y+178;
   var forecasts=Rules.Forecast(level);
   if(forecasts.Count>0){
    Text(new Rect(r.x+17,y,r.width-34,27),"勇者先做一步 → 怪物再行動",14,ink,true);y+=32;
    int count=forecasts.Count;float ew=(r.width-30)/count;
    for(int i=0;i<count;i++){
     var e=forecasts[i];bool now=playing&&currentStep+1==e.after&&tone!="hero";string state=eventStates.TryGetValue(e.after,out var s)?s:"預告";
     var er=new Rect(r.x+15+i*ew,y,ew-6,65);Panel(er,now?gold:state=="已阻止"?C("e1eed3"):C("f4f0e5"));
     Text(new Rect(er.x+6,er.y+5,er.width-12,57),$"第 {e.after} 步後\n{Rules.Icon(e.direction)} "+(e.kind=="move"?"移動一格":"噴火 "+e.cells.Length+" 格")+" · "+state,viewWidth<500?11:14,ink);
    }y+=72;
   }
   float size=Mathf.Min(r.width-36,410),x=r.x+(r.width-size)/2;Rect grid=new Rect(x,y,size,size);Panel(grid,C("bacbaa"));float cell=(size-12)/level.size;
   Vector2 Pos(Vector2 p)=>new Vector2(x+6+(p.x+.5f)*cell,y+6+(p.y+.5f)*cell);
   Rect Tile(Cell p)=>new Rect(x+6+p.x*cell,y+6+p.y*cell,cell-3,cell-3);
   for(int row=0;row<level.size;row++)for(int col=0;col<level.size;col++){var p=new Cell(col,row);Round(Tile(p),(row+col)%2==0?C("dce4cd"):C("d2ddc3"),6);}
   foreach(var wall in level.walls){var t=Tile(wall);Round(new Rect(t.x+9,t.y+12,t.width-18,t.height-22),C("8ba07c"),12);Text(t,"石牆",12,C("56694e"),false,TextAnchor.MiddleCenter);}
   var exit=Tile(level.goal);Round(new Rect(exit.x+12,exit.y+9,exit.width-24,exit.height-18),hero.defeated?C("c5e2b7"):C("bdc3a5"),10);Text(exit,hero.defeated?"出口\n已打開":"出口\n先打怪",14,ink,true,TextAnchor.MiddleCenter);
   foreach(var e in forecasts){if(e.kind=="move"){Rect t=Tile(e.to);Round(new Rect(t.x+3,t.y+3,22,22),C("d5e6f0"),11);Text(new Rect(t.x+3,t.y+3,22,22),e.after.ToString(),12,C("3a7090"),true,TextAnchor.MiddleCenter);}else foreach(var p in e.cells){Rect t=Tile(p);Border(t,C("d8a069"),2);Text(new Rect(t.xMax-24,t.y+3,21,22),e.after.ToString(),12,C("b07734"),true,TextAnchor.MiddleCenter);}}
   if(level.portals!=null)for(int i=0;i<level.portals.Length;i++){var p=Pos(level.portals[i].Vec());if(portalPhase!="")Round(new Rect(p.x-cell*.48f,p.y-cell*.48f,cell*.95f,cell*.95f),C("d6b8f4"),12);Image(new Rect(p.x-cell*.61f,p.y-cell*.65f,cell*1.22f,cell*1.22f),i==0?"doorA":"doorB");}
   foreach(var p in fire){var t=Tile(p);Round(t,C("ffbf63"),6);Image(t,"flame",.9f);}
   if(!hero.hasSword){var p=Pos(level.sword.Vec());Image(new Rect(p.x-cell*.55f,p.y-cell*.53f,cell*1.1f,cell*1.1f),"sword");}
   if(!hero.defeated){var p=Pos(monsterPosition);if(charge>0)Round(new Rect(p.x-cell*.5f,p.y-cell*.5f,cell,cell),new Color(1,.71f,.25f,.2f+charge*.3f),cell*.5f);
    Image(new Rect(p.x-cell*.6f,p.y-cell*.61f,cell*1.2f,cell*1.2f),level.Dragon?"dragon":"monster",1,level.Dragon?Angle(facing):0);
    Text(new Rect(p.x-cell*.5f,p.y+cell*.28f,cell,23),level.Dragon?"火龍":"怪物",12,C("9d503b"),true,TextAnchor.MiddleCenter);
   }
   if(breath!=null){Vector2 start=Pos(breath.from.Vec()),d=Rules.Delta(breath.direction).Vec();float length=breath.cells.Length*cell*Mathf.Min(1,breathProgress*3.2f);
    Segment(start+d*cell*.24f,start+d*length,C("ee792f"),cell*.29f);Segment(start+d*cell*.29f,start+d*length,C("ffe8a3"),cell*.13f);
    for(int i=0;i<9;i++){float t=(breathProgress*1.9f+i/9f)%1;Vector2 pos=start+d*(cell*.3f+length*t)+new Vector2(-d.y,d.x)*Mathf.Sin(i*3+breathProgress*22)*(5+10*t);Round(new Rect(pos.x-3,pos.y-3,7,7),C("fff4b8"),4);}
   }
   var hp=Pos(heroPosition);Image(new Rect(hp.x-cell*.53f,hp.y-cell*.56f,cell*1.06f,cell*1.06f),hero.hasSword?"heroArmed":"hero",heroAlpha);
   if(hero.failed)Border(Tile(hero.position),C("bd513a"),4);
   float foot=y+size+10;
   Text(new Rect(r.x+18,foot,r.width-36,40),forecasts.Count>0?"藍圈＝怪物移動終點；橘框＝火焰範圍；數字＝步號。":"先拿劍 → 站到怪物旁攻擊 → 走到出口",12,muted);
   Text(new Rect(r.x+18,foot+43,r.width-36,57),level.portals?.Length==2?"A 門 ↔ B 門：走入一扇門，從另一扇出來。\n火只燒當步；遇牆會停。先擊退火龍可阻止噴火。":level.Dragon?"火只燒當步，遇牆停止；先擊退火龍可以阻止噴火。":level.note,13,ink);
  }
  static float Angle(string d)=>d=="down"?90:d=="left"?180:d=="up"?270:0;
  void Border(Rect r,Color c,float w){Round(new Rect(r.x,r.y,r.width,w),c,0);Round(new Rect(r.x,r.yMax-w,r.width,w),c,0);Round(new Rect(r.x,r.y,w,r.height),c,0);Round(new Rect(r.xMax-w,r.y,w,r.height),c,0);}
  void Segment(Vector2 from,Vector2 to,Color c,float width){var m=GUI.matrix;float angle=Mathf.Atan2(to.y-from.y,to.x-from.x)*Mathf.Rad2Deg;RotateLocal(angle,from);Round(new Rect(from.x,from.y-width/2,Vector2.Distance(from,to),width),c,width/2);GUI.matrix=m;}
  void DrawIce(Rect r){
   Text(new Rect(r.x+18,r.y+86,r.width-36,70),level.boards.Length==1?"先帶小紅回家。每個方向都會滑到冰塊或邊界才停。":"兩隻一起讀相同方向，最後都要停在家裡。",18,ink);
   float size=Mathf.Min(level.boards.Length==1?320:265,(r.width-45)/level.boards.Length-8),y=r.y+202;
   for(int b=0;b<level.boards.Length;b++){
    var board=level.boards[b];float left=r.x+(r.width-(size+16)*level.boards.Length+16)/2+b*(size+16);Rect gr=new Rect(left,y,size,size);Panel(gr,C("d1e5eb"));float cell=(size-10)/board.size;
    Color color=b==0?C("cf7268"):C("568cb8");Text(new Rect(left,y-31,size,28),(b==0?"小紅":"小藍")+"的冰場",18,color,true,TextAnchor.MiddleCenter);
    for(int i=0;i<board.size*board.size;i++){var p=new Cell(i%board.size,i/board.size);Rect t=new Rect(left+5+p.x*cell,y+5+p.y*cell,cell-3,cell-3);Round(t,Rules.Wall(board.walls,p)?C("98c3d3"):C("f2faf7"),7);
     if(Rules.Wall(board.walls,p))Text(t,"冰",18,C("598ca1"),false,TextAnchor.MiddleCenter);
     if(p.Equals(board.goal)){Border(t,color,3);Text(t,"家",19,color,true,TextAnchor.MiddleCenter);}
    }
    Vector2 pos=icePositions[b];Image(new Rect(left+5+(pos.x-.13f)*cell,y+5+(pos.y-.21f)*cell,cell*1.22f,cell*1.22f),b==0?"penguinRed":"penguinBlue");
   }
   float fx=r.x+18,fy=y+size+37;for(int i=0;i<settings.Length;i++)Flow("第 "+(i+1)+" 步 · "+StepGroup(i)+"\n"+Rules.Icon(settings[i]),active==i,ref fx,ref fy,r);
   CueBox(new Rect(r.x+16,fy+90,r.width-32,176));Text(new Rect(r.x+18,fy+282,r.width-36,110),"在家也會繼續讀下一個方向。全部 "+settings.Length+" 步播完，都停在家裡才成功。",18,muted);
  }
 }
}
