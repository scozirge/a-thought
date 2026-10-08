using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Together {
 [Serializable] public struct Cell : IEquatable<Cell> {
  public int x,y; public Cell(int a,int b){x=a;y=b;} public bool Equals(Cell b)=>x==b.x&&y==b.y;
  public override bool Equals(object o)=>o is Cell b&&Equals(b); public override int GetHashCode()=>x*71+y;
  public static Cell operator +(Cell a,Cell b)=>new Cell(a.x+b.x,a.y+b.y);
  public Vector2 Vec()=>new Vector2(x,y); public override string ToString()=>$"{x},{y}";
 }
 [Serializable] public class Mask {public int[] cells;}
 [Serializable] public class MonsterEvent {public int after,range;public string move,fireDirection;}
 [Serializable] public class IceBoard {public int size;public Cell start,goal;public Cell[] walls;}
 [Serializable] public class Level {
  public string id,title,note,stage,game;public int index,size,steps,cols,rows,rotateAfter;
  public Cell start,sword,monster,goal;public Cell[] walls,portals;public MonsterEvent[] events;
  public int[] editable;public string[] program,options,target,lineup;public bool twoColor;public string[] palette;public Mask[] masks,masksB;public IceBoard[] boards;
  public bool Dragon=>events!=null&&events.Any(e=>!string.IsNullOrEmpty(e.fireDirection));
  public int Decisions=>game=="sticker"?masks.Length:game=="hero"?4:steps;
 }
 [Serializable] public class LevelBook {public Level[] levels;}
 [Serializable] public class HeroState {
  public Cell position,monster;public bool hasSword,defeated,failed,escaped;public int turn;
  public HeroState Copy()=>(HeroState)MemberwiseClone();
 }
 public class Effect {public string kind,message,direction;public int after;public Cell from,to;public Cell[] cells=new Cell[0];public bool hit;}
 public class Frame {
  public string type,command,message;public int index,machine,after;public string[] board,before;
  public HeroState hero,action;public Cell? entrance;public List<Effect> effects=new List<Effect>();
  public Cell[] positions,from;public int[] distances;public bool ok=true;
 }
 public class Result {public bool success;public List<Frame> frames=new List<Frame>();public HeroState hero;public Cell[] positions;public string[] board;}
 public static class Rules {
  public static readonly string[] Groups={"第 1 組","第 2 組","第 3 組","老師組"};
  public static string Group(int i)=>Groups[i%4];
  public static int Attempt(int i)=>i/4+1;
  public static readonly string[] AllCommands={"up","right","down","left","take","attack","wait"};
  public static Cell Delta(string d){switch(d){case "up":return new Cell(0,-1);case "down":return new Cell(0,1);case "left":return new Cell(-1,0);default:return new Cell(1,0);}}
  public static string Label(string s){if(s!=null&&s.Contains("|")){var parts=s.Split('|');return "A "+Label(parts[0])+" / B "+Label(parts[1]);}switch(s){case "up":return "向上";case "down":return "向下";case "left":return "向左";case "right":return "向右";case "take":return "拿劍";case "attack":return "攻擊";case "wait":return "等待";case "red":return "紅";case "blue":return "藍";case "yellow":return "黃";case "green":return "綠";default:return "選一個";}}
  public static string Icon(string s){switch(s){case "up":return "↑";case "down":return "↓";case "left":return "←";case "right":return "→";case "take":return "劍";case "attack":return "攻";case "wait":return "Ⅱ";default:return "？";}}
  public static bool Inside(Cell p,int n)=>p.x>=0&&p.y>=0&&p.x<n&&p.y<n;
  public static bool Wall(Cell[] walls,Cell p)=>walls!=null&&Array.Exists(walls,c=>c.Equals(p));
  public static string[] Rotate(string[] b,int n){var r=new string[b.Length];for(int i=0;i<b.Length;i++)r[(i%n)*n+n-1-i/n]=b[i];return r;}
  public static HeroState Initial(Level l)=>new HeroState {position=l.start,monster=l.monster};
  public static Cell[] Fire(Level l,Cell p,string d,int range){var cells=new List<Cell>();for(int i=0;i<range;i++){p+=Delta(d);if(!Inside(p,l.size)||Wall(l.walls,p))break;cells.Add(p);}return cells.ToArray();}
  public static List<Effect> Forecast(Level l){var list=new List<Effect>();Cell p=l.monster;foreach(var e in l.events??new MonsterEvent[0]){var from=p;if(!string.IsNullOrEmpty(e.move)){p+=Delta(e.move);list.Add(new Effect{kind="move",after=e.after,from=from,to=p,direction=e.move});}if(!string.IsNullOrEmpty(e.fireDirection))list.Add(new Effect{kind="fire",after=e.after,from=p,direction=e.fireDirection,cells=Fire(l,p,e.fireDirection,e.range)});}return list;}
  public static Frame Step(Level l,HeroState old,string c,int i){
   var h=old.Copy();var f=new Frame{type="hero",command=c,index=i};string msg="";bool fail=false;
   if(Array.IndexOf(AllCommands,c)<4){var to=h.position+Delta(c);
    if(!Inside(to,l.size)) {fail=true;msg="走到地圖外了，換個方向試試。";}
    else if(Wall(l.walls,to)){fail=true;msg="前面有石牆，不能走進去。";}
    else if(!h.defeated&&to.Equals(h.monster)){fail=true;msg="怪物在這一格，先拿劍站在旁邊攻擊。";}
    else if(!h.defeated&&to.Equals(l.goal)){fail=true;msg="出口還沒打開，先擊退怪物。";}
    else {h.position=to;msg=Label(c)+"走一格。";if(l.portals!=null&&l.portals.Length==2){int a=Array.FindIndex(l.portals,p=>p.Equals(to));if(a>=0){f.entrance=to;h.position=l.portals[1-a];msg=$"從 {(a==0?"A":"B")} 門，傳到 {(a==0?"B":"A")} 門。";if(!h.defeated&&h.position.Equals(h.monster)){fail=true;msg="傳送門另一端有怪物。";}}}}
   }else if(c=="take"){if(h.hasSword||!h.position.Equals(l.sword)){fail=true;msg=h.hasSword?"已經拿劍了，不用再拿。":"這裡沒有劍，先走到寶劍上。";}else{h.hasSword=true;msg="拿到寶劍了！";}}
   else if(c=="attack"){if(!h.hasSword||h.defeated||Math.Abs(h.position.x-h.monster.x)+Math.Abs(h.position.y-h.monster.y)!=1){fail=true;msg=!h.hasSword?"還沒拿到劍。":h.defeated?"已經擊退怪物了，去出口吧。":"攻擊太遠了，要站在怪物上下左右一格。";}else{h.defeated=true;msg="攻擊成功！出口打開。";}}
   else msg="留在原地，等待一步。";
   h.failed=fail;f.action=h.Copy();h.turn++;var ev=(l.events??new MonsterEvent[0]).FirstOrDefault(e=>e.after==h.turn);
   if(!fail&&ev!=null){
    if(h.defeated)f.effects.Add(new Effect{kind="cancel",after=h.turn,message="先攻擊成功，怪物行動已阻止。"});
    else {
     if(!string.IsNullOrEmpty(ev.move)){Cell from=h.monster;h.monster+=Delta(ev.move);bool hit=h.position.Equals(h.monster);h.failed=hit;f.effects.Add(new Effect{kind="move",after=h.turn,from=from,to=h.monster,direction=ev.move,hit=hit,message=hit?"怪物移到勇者這格了！":"怪物"+Label(ev.move)+"移動一格。"});}
     if(!h.failed&&!string.IsNullOrEmpty(ev.fireDirection)){var cells=Fire(l,h.monster,ev.fireDirection,ev.range);bool hit=cells.Any(p=>p.Equals(h.position));h.failed=hit;f.effects.Add(new Effect{kind="fire",after=h.turn,from=h.monster,cells=cells,direction=ev.fireDirection,hit=hit,message=hit?"勇者被火燒到了，先等火熄了再走。":"火龍噴火，勇者在安全位置。"});}
    }
   }
   h.escaped=h.defeated&&h.position.Equals(l.goal);f.hero=h;f.ok=!h.failed;f.message=msg+" "+string.Join(" ",f.effects.Select(e=>e.message));return f;
  }
  public static string[] ColorParts(string value)=>string.IsNullOrEmpty(value)?new[]{"",""}:value.Split('|');
  public static bool ValidChoice(Level l,string value){
   if(l==null||string.IsNullOrEmpty(value))return false;
   if(l.options.Contains(value))return true;
   if(!l.twoColor)return false;
   var parts=value.Split('|');return parts.Length==2&&parts.Any(s=>s!="")&&parts.All(s=>s==""||l.palette.Contains(s));
  }
  public static bool Complete(Level l,string[] values)=>l!=null&&values.Length==l.Decisions&&values.All(s=>l.options.Contains(s));
  public static bool MayReveal(bool busy,bool connected,bool host)=>!busy&&(!connected||host);
  public static string[] Solve(Level l){
   var values=new string[l.Decisions];
   if(l.game=="sticker"&&l.rotateAfter==0){
    for(int i=0;i<l.Decisions;i++){
     var visible=l.masks[i].cells.Where(c=>!l.masks.Skip(i+1).Any(m=>m.cells.Contains(c))).ToArray();
     if(l.twoColor){var a=visible.Where(c=>!l.masksB[i].cells.Contains(c)).ToArray();var b=visible.Where(c=>l.masksB[i].cells.Contains(c)).ToArray();if(a.Length==0||b.Length==0)return null;values[i]=l.target[a[0]]+"|"+l.target[b[0]];}
     else {if(visible.Length==0)return null;values[i]=l.target[visible[0]];}
    }
    return Complete(l,values)&&Run(l,values).success?values:null;
   }
   bool Visit(int i){if(i==values.Length)return Run(l,values).success;foreach(var op in l.options){values[i]=op;if(Visit(i+1))return true;}return false;}
   return Visit(0)?values:null;
  }
  public static Result Run(Level l,string[] settings){
   if(settings.Length!=l.Decisions||settings.Any(s=>!l.options.Contains(s)))throw new ArgumentException("請先填完所有步驟。");
   var r=new Result();
   if(l.game=="animal"){
    var b=(string[])l.lineup.Clone();
    for(int i=0;i<4;i++){
     var before=(string[])b.Clone();
     if(settings[i]=="swap"){string temp=b[0];b[0]=b[1];b[1]=temp;}
     else if(settings[i]=="cycle"){string first=b[0];Array.Copy(b,1,b,0,b.Length-1);b[b.Length-1]=first;}
     else throw new ArgumentException("不認得這個換位動作");
     r.frames.Add(new Frame{type="animal",index=i,command=settings[i],before=before,board=(string[])b.Clone()});
    }
    r.board=b;r.success=b.SequenceEqual(l.target);return r;
   }
   if(l.game=="sticker"){
    var b=new string[l.cols*l.rows];for(int i=0;i<settings.Length;i++){var colors=l.twoColor?settings[i].Split('|'):null;foreach(int cell in l.masks[i].cells)b[cell]=l.twoColor?colors[l.masksB[i].cells.Contains(cell)?1:0]:settings[i];r.frames.Add(new Frame{type="stamp",machine=i,index=i,board=(string[])b.Clone()});if(l.rotateAfter==i+1){var before=(string[])b.Clone();b=Rotate(b,l.cols);r.frames.Add(new Frame{type="rotate",after=i+1,before=before,board=(string[])b.Clone()});}}
    r.board=b;r.success=b.SequenceEqual(l.target);return r;
   }
   if(l.game=="hero"){
    var cmds=(string[])l.program.Clone();for(int i=0;i<4;i++)cmds[l.editable[i]]=settings[i];var h=Initial(l);
    for(int i=0;i<cmds.Length;i++){var f=Step(l,h,cmds[i],i);r.frames.Add(f);h=f.hero;if(h.failed)break;}r.hero=h;r.success=h.escaped&&!h.failed;return r;
   }
   var positions=l.boards.Select(b=>b.start).ToArray();for(int i=0;i<settings.Length;i++){
    var from=(Cell[])positions.Clone();var distances=new int[positions.Length];for(int j=0;j<positions.Length;j++){var b=l.boards[j];Cell p=positions[j];while(true){var next=p+Delta(settings[i]);if(!Inside(next,b.size)||Wall(b.walls,next))break;p=next;distances[j]++;}positions[j]=p;}
    r.frames.Add(new Frame{type="slide",index=i,command=settings[i],from=from,positions=(Cell[])positions.Clone(),distances=distances});
   }r.positions=positions;r.success=positions.Select((p,i)=>p.Equals(l.boards[i].goal)).All(v=>v);return r;
  }
 }
}
