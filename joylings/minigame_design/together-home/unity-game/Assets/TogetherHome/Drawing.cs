using System;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
namespace CatDog {
 public partial class TogetherHome {
  Texture2D cat,dog,keyArt;Font font;GUIStyle label;double cameraX,cameraY,viewW,viewH;float zoom;
  static readonly string[] colors={"347da5","bc6c2d","8058ac","258472","b84e74","8a7236","4f62ae","5f8234"};
  Dictionary<string,int> links=new Dictionary<string,int>();Dictionary<string,(Thing pad,List<int> ids)> pads=new Dictionary<string,(Thing,List<int>)>();int linkedLevel=-1;
  static Color C(string value){ColorUtility.TryParseHtmlString("#"+value,out var c);return c;}
  void InitDrawing(){cat=Resources.Load<Texture2D>("Art/cat");dog=Resources.Load<Texture2D>("Art/dog");keyArt=Resources.Load<Texture2D>("Art/key");font=Resources.Load<Font>("NotoSansTC-Regular");}
  Rect R(double x,double y,double w,double h)=>new Rect((float)((x-cameraX)*zoom),(float)((y-cameraY)*zoom),(float)(w*zoom),(float)(h*zoom));
  static void Fill(Rect rect,Color color,float radius=0){GUI.DrawTexture(rect,Texture2D.whiteTexture,ScaleMode.StretchToFill,true,0,color,0,radius);}
  void Box(double x,double y,double w,double h,string color,float round=0){Fill(R(x,y,w,h),C(color),round*zoom);}
  static void Stroke(Vector2 a,Vector2 b,Color color,float width){var old=GUI.matrix;float angle=Mathf.Atan2(b.y-a.y,b.x-a.x)*Mathf.Rad2Deg;GUIUtility.RotateAroundPivot(angle,a);Fill(new Rect(a.x,a.y-width/2,Vector2.Distance(a,b),width),color);GUI.matrix=old;}
  void Line(double x,double y,double xx,double yy,string color,float width=2){var a=R(x,y,0,0);var b=R(xx,yy,0,0);Stroke(a.position,b.position,C(color),width*zoom);}
  void Text(string text,Rect r,int size=20,string color="514c41",TextAnchor align=TextAnchor.MiddleCenter){label.fontSize=size;label.alignment=align;label.normal.textColor=C(color);GUI.Label(r,text,label);}
  void Pet(double x,double y,int actor,double size=1,bool inverted=false,float alpha=1){var rect=R(x-9*size,y-8*size,52*size,56*size);var matrix=GUI.matrix;var color=GUI.color;GUI.color=new Color(1,1,1,alpha);if(inverted)GUIUtility.ScaleAroundPivot(new Vector2(1,-1),rect.center);GUI.DrawTexture(rect,actor==0?cat:dog);GUI.matrix=matrix;GUI.color=color;}
  static Thing[] Controls(Thing f)=>f.controls??f.buttons??f.pads??Array.Empty<Thing>();
  static string PadKey(Thing p)=>string.Join("/",p.x,p.y,p.w,p.owner,p.crateOnly,p.ceiling,p.dir);
  static string Signature(Thing f)=>string.Join(";",Controls(f).Select(PadKey).OrderBy(x=>x));
  void LinkGroups(Level l){
   if(linkedLevel==state.level)return;linkedLevel=state.level;links.Clear();pads.Clear();
   foreach(var f in l.gates.Concat(l.platforms).Concat(l.movers).Concat(l.lifts).Concat(l.rafts).OrderBy(f=>f.x)){
    string id=Signature(f);if(id.Length==0)continue;if(!links.ContainsKey(id))links[id]=links.Count;int index=links[id];
    foreach(var p in Controls(f)){string k=PadKey(p);if(!pads.ContainsKey(k))pads[k]=(p,new List<int>());if(!pads[k].ids.Contains(index))pads[k].ids.Add(index);}
   }
  }
  string LinkColor(Thing f,string fallback="b89462")=>links.TryGetValue(Signature(f),out int id)?colors[id%colors.Length]:fallback;
  void Badge(double x,double y,int id,double size=22){
   string color=colors[id%colors.Length];var r=R(x-size/2,y-size/2,size,size);
   if(id%4==0)Fill(r,C(color),r.width/2);
   else if(id%4==1){var m=GUI.matrix;GUIUtility.RotateAroundPivot(45,r.center);Fill(new Rect(r.x+r.width*.15f,r.y+r.height*.15f,r.width*.7f,r.height*.7f),C(color));GUI.matrix=m;}
   else if(id%4==2){Line(x-size/2,y+size/2,x,y-size/2,color,4);Line(x,y-size/2,x+size/2,y+size/2,color,4);Line(x-size/2,y+size/2,x+size/2,y+size/2,color,4);}
   else{Fill(r,C(color),2);Box(x-size*.25,y-size*.25,size*.5,size*.5,"fffdf4",1);}
  }
  void MechanismBadge(Thing f,double x,double y){if(links.TryGetValue(Signature(f),out int id))Badge(x,y,id);if(tips&&f.number>0)Text(f.number.ToString(),R(x-12,y-36,24,24),Math.Max(18,(int)(20*zoom)));}
  void Platform(State s,Thing f){bool active=Rules.Active(s,f);string color=LinkColor(f,f.mode.HasValue?f.mode==0?"d5a64d":"9b80b6":"b9915e");var old=GUI.color;if(!active)GUI.color=new Color(1,1,1,.22f);
   Box(f.x,f.y,f.w,Math.Max(f.h,12),color,4);Box(f.x+2,f.y+1,f.w-4,4,"fff4d3",2);GUI.color=old;MechanismBadge(f,f.x+f.w/2,f.y+Math.Max(f.h,12)+16);
   if(f.mode.HasValue)Text(f.mode==0?"☀":"☾",R(f.x+f.w/2-14,f.y-29,28,26),Math.Max(18,(int)(22*zoom)),color);
  }
  void CameraFor(State s,Level l){
   if(l.world==null){viewW=1000;viewH=480-(l.cameraTop??140);zoom=Math.Min(Screen.width/(float)viewW,Screen.height/(float)viewH);viewW=Screen.width/zoom;viewH=Screen.height/zoom;cameraX=(1000-viewW)/2;cameraY=400-viewH*.8;return;}
   var actors=s.players.Where(p=>!p.exited).ToArray();if(actors.Length==0)actors=s.players;
   double left=actors.Min(p=>p.x),right=actors.Max(p=>p.x+p.w),top=actors.Min(p=>p.y),bottom=actors.Max(p=>p.y+p.h);
   double baseW=Screen.width<700?750:1000,baseH=baseW*Screen.height/Math.Max(1.0,Screen.width);
   double scale=Math.Max(.65,Math.Min(1,Math.Min(baseW/(right-left+200),baseH/(bottom-top+180))));
   zoom=(float)(Screen.width/baseW*scale);viewW=Screen.width/zoom;viewH=Screen.height/zoom;
   cameraX=Math.Max(l.world.left,Math.Min(Math.Max(l.world.left,l.world.width-viewW),(left+right)/2-viewW/2+65));
   cameraY=Math.Max(l.world.top,Math.Min(Math.Max(l.world.top,l.world.bottom-viewH),(top+bottom)/2-viewH/2-20));
  }
  State ViewState(){
   if(!room.Connected||room.IsHost||previousView==null||previousView.level!=state.level)return state;
   var view=state.Copy();double t=Math.Min(1,(Time.realtimeSinceStartup-viewAt)/.05);
   for(int i=0;i<2;i++){view.players[i].x=previousView.players[i].x+(state.players[i].x-previousView.players[i].x)*t;view.players[i].y=previousView.players[i].y+(state.players[i].y-previousView.players[i].y)*t;}
   return view;
  }
  void OnGUI(){
   if(state==null||font==null||Event.current.type!=EventType.Repaint)return;
   label=new GUIStyle{font=font,wordWrap=true,richText=false};Fill(new Rect(0,0,Screen.width,Screen.height),C("f5f6e9"));
   if(phase!="game"){Story();return;}
   var s=ViewState();var l=levels[state.level];CameraFor(s,l);LinkGroups(l);
   Box(cameraX,cameraY+viewH*.5,viewW,viewH*.5,"e5edd6");
   Box(cameraX,400,viewW,Math.Max(1000,viewH),"527b93");
   foreach(var f in l.floor??new[]{new Thing{x=0,y=400,w=1000}}){Box(f.x,f.y,f.w,Math.Max(800,viewH),"e5d9b4");Box(f.x,f.y,f.w,8,l.ice?"a7dce9":"9dbb77");}
   foreach(var f in l.ceilingPieces??(l.gravityFlip?new[]{new Thing{x=0,y=l.ceiling-12,w=1000,h=12}}:Array.Empty<Thing>())){Box(f.x,f.y,f.w,f.h,"c8b9db",3);}
   foreach(var f in l.platforms.Concat(Rules.Moving(s,l)))Platform(s,f);
   foreach(var z in l.iceZones)Box(z.x,z.y,z.w,8,"a7dce9");
   for(int i=0;i<l.balances.Length;i++){var b=l.balances[i];Line(b.a.x+b.a.w/2,b.top-30,b.b.x+b.b.w/2,b.top-30,"b2936a",6);Line(b.a.x+b.a.w/2,b.top-30,b.a.x+b.a.w/2,s.balances[i][0],"b2936a",3);Line(b.b.x+b.b.w/2,b.top-30,b.b.x+b.b.w/2,s.balances[i][1],"b2936a",3);}
   foreach(var f in Rules.Balanced(s,l))Platform(s,f);
   for(int i=0;i<l.lifts.Length;i++){var f=l.lifts[i];Line(f.x+8,f.top,f.x+8,f.bottom+20,"c2bb9b",3);Line(f.x+f.w-8,f.top,f.x+f.w-8,f.bottom+20,"c2bb9b",3);var p=f.Copy();p.y=s.lifts[i];p.h=12;Platform(s,p);}
   foreach(var f in Rules.Rafts(s,l)){Box(f.x,f.y,f.w,f.h,"a9784f",7);Box(f.x+3,f.y+2,f.w-6,5,"e7c584",2);MechanismBadge(f,f.x+f.w/2,f.y+f.h+17);}
   for(int i=0;i<l.gates.Length;i++){var g=l.gates[i];bool open=Rules.Open(s,l,i);var old=GUI.color;if(open)GUI.color=new Color(1,1,1,.22f);Box(g.x,g.y,g.w,g.h,LinkColor(g,"a78a6e"),3);Box(g.x+5,g.y,4,g.h,"fff3d1");GUI.color=old;MechanismBadge(g,g.x+g.w/2,Math.Min(365,g.y+g.h-28));}
   foreach(var entry in pads.Values){var p=entry.pad;bool down=Rules.Weighted(s,p);double y=p.ceiling?p.y:p.y-9;Box(p.x,y,p.w,9,down?"75a97f":"e4dcc2",3);
    for(int i=0;i<entry.ids.Count;i++)Badge(p.x+p.w/2+(i-(entry.ids.Count-1)/2.0)*23,p.ceiling?p.y+26:p.y-25,entry.ids[i]);
    if(p.owner.HasValue)Pet(p.x+p.w/2-8,p.ceiling?p.y+36:p.y-67,p.owner.Value,.5);
    if(p.crateOnly){Box(p.x+p.w/2-8,p.y-57,16,16,"b58b56",2);Line(p.x+p.w/2-6,p.y-55,p.x+p.w/2+6,p.y-43,"ffe8ba");}
    if(p.dir!=0)Text(p.dir>0?"→":"←",R(p.x+p.w/2-16,p.y-67,32,30),Math.Max(18,(int)(24*zoom)));
   }
   foreach(var f in l.switches){Box(f.x,f.y-7,f.w,7,"bda5d2",2);Text("★",R(f.x,f.y-37,f.w,30),Math.Max(20,(int)(27*zoom)),"a17a3c");}
   for(int i=0;i<s.boxes.Length;i++){var b=s.boxes[i];Box(b.x,b.y,b.w,b.h,"ab8052",5);Box(b.x+4,b.y+4,b.w-8,b.h-8,"e8c89c",3);Line(b.x+7,b.y+7,b.x+b.w-7,b.y+b.h-7,"b48959",3);Line(b.x+b.w-7,b.y+7,b.x+7,b.y+b.h-7,"b48959",3);if(b.heavy)Text("2人",R(b.x,b.y,b.w,b.h),Math.Max(18,(int)(20*zoom)));}
   var door=l.door;Box(door.x-5,door.y-5,door.w+10,door.h+7,"9c795b",7);Box(door.x,door.y,door.w,door.h,"e1c18a",5);Box(door.x+12,door.y+15,door.w-24,door.h-15,"b19061",5);
   Line(door.x-10,door.y,door.x+door.w/2,door.y-30,"a47c60",10);Line(door.x+door.w/2,door.y-30,door.x+door.w+10,door.y,"a47c60",10);
   Text(s.key?"→":"⌂",R(door.x+9,door.y+25,door.w-18,30),Math.Max(20,(int)(28*zoom)),"fff6d7");
   for(int i=0;i<l.keys.Length;i++)if(!s.collected[i]){var k=l.keys[i];GUI.DrawTexture(R(k.x-18,k.y-13,48,30),keyArt);if(k.owner.HasValue)Pet(k.x-7,k.y-36,k.owner.Value,.4);}
   for(int i=0;i<2;i++){var p=s.players[i];Pet(p.x,p.y,i,1,s.gravity[i]==-1,p.exited?.45f:1);if(s.collectedBy.Any(owner=>owner==i))GUI.DrawTexture(R(p.x+3,p.y-30,34,21),keyArt);}
  }
  void Story(){
   zoom=Math.Min(Screen.width/1000f,Screen.height/440f);viewW=Screen.width/zoom;viewH=Screen.height/zoom;cameraX=(1000-viewW)/2;cameraY=0;
   Box(cameraX,330,viewW,viewH,"dae7cd");Box(cameraX,370,viewW,viewH,"e6d9b7");
   double t=Math.Min(1,storyTime/(phase=="intro"?2:7.5));double cx=phase=="intro"?250+t*170:280+t*290,dx=phase=="intro"?700-t*170:360+t*290;
   Pet(cx,280,0,1.8);Pet(dx,280,1,1.8);
   if(phase=="intro"){
    string text=storyTime<1.8?"貓狗一起回家":storyTime<5?"貓咪：咦？你也要回家嗎？":storyTime<8.2?"狗狗：對呀！我們一起走吧！":"貓咪：路上互相幫忙，一起回家！";
    Fill(new Rect(Math.Max(10,Screen.width*.1f),Screen.height*.12f,Screen.width*.8f,90),C("fffdf4"),20);Text(text,new Rect(Screen.width*.12f,Screen.height*.12f,Screen.width*.76f,90),Screen.width<600?22:30);
   }else{
    Box(760,200,140,170,"e3c492",10);Line(745,200,830,135,"9e7963",15);Line(830,135,915,200,"9e7963",15);Box(803,270,52,100,"ac875d",6);
    Text(storyTime>=7.5?"團結就是力量！":"我們回家了！",new Rect(10,Screen.height*.08f,Screen.width-20,60),Screen.width<600?28:36);
    if(storyTime>=7.5)Text("我們在一起的時候是最棒的！",new Rect(12,Screen.height*.25f,Screen.width-24,65),Screen.width<600?20:26);
   }
  }
 }
}
