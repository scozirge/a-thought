using System.Linq;
using UnityEngine;

namespace Together {
 public partial class PuzzleParty {
  string StepNumber(int i)=>new[]{"①","②","③","④"}[Mathf.Clamp(i,0,3)];
  string ShortOwner(int i)=>Online&&room.slotNames!=null&&i<room.slotNames.Length?room.slotNames[i]:"";
  bool OtherStep(int i)=>Online&&!room.isHost&&room.mySlot!=i;
  bool MyStep(int i)=>Online&&!room.isHost&&room.mySlot==i;
  void StepPanel(Rect r,int i){
   Panel(r,active==i?gold:OtherStep(i)?C("e6e8e3"):MyStep(i)||selected==i?C("e5efde"):C("f1f3ea"));
   if(MyStep(i))Border(r,green,3);
  }
  bool SlotReady(int i)=>level!=null&&settings[i]!=null&&level.options.Contains(settings[i]);
  string ShortIdentity()=>Online&&!room.isHost&&room.mySlot<0?"等下一題":"";
  float OwnerExtra(float width)=>!Online?0:Mathf.Max(0,Enumerable.Range(0,4).Max(i=>TextHeight(ShortOwner(i),width,18))-28);
  void ReadyBadge(Rect r,int i){Text(r,SlotReady(i)?"✓":"…",22,SlotReady(i)?green:C("af6a28"),true,TextAnchor.MiddleCenter);}
  string ShortStatus()=>playing?(paused?"暫停":active>=0?StepNumber(active):"▶"):result!=null?(result.success?"成功！":"再試試"):Online&&!room.isHost&&room.mySlot<0?"等下一題":"";
  void DrawDirection(Rect r,string direction,Color color){
   if(string.IsNullOrEmpty(direction)){Text(r,"?",28,color,true,TextAnchor.MiddleCenter);return;}
   DrawSymbol(r,direction,color);
  }
  readonly System.Collections.Generic.Dictionary<string,Texture2D> symbols=new System.Collections.Generic.Dictionary<string,Texture2D>();
  void DrawSymbol(Rect r,string symbol,Color color){
   if(!symbols.TryGetValue(symbol,out var texture)){
    texture=new Texture2D(64,64,TextureFormat.RGBA32,false);texture.filterMode=FilterMode.Bilinear;texture.wrapMode=TextureWrapMode.Clamp;
    Vector2 direction=symbol=="house"?Vector2.zero:Rules.Delta(symbol).Vec();direction.y=-direction.y;
    for(int y=0;y<64;y++)for(int x=0;x<64;x++){
     Vector2 p=new Vector2((x-31.5f)/32,(y-31.5f)/32);bool fill;
     if(symbol=="house"){
      fill=(Mathf.Abs(p.y-(.65f-Mathf.Abs(p.x)))<.06f&&Mathf.Abs(p.x)<.72f)
       ||(Mathf.Abs(Mathf.Abs(p.x)-.45f)<.06f&&p.y<.06f&&p.y>-.65f)
       ||(Mathf.Abs(p.y+.6f)<.06f&&Mathf.Abs(p.x)<.5f);
     }else{
      float along=Vector2.Dot(p,direction),side=Mathf.Abs(Vector2.Dot(p,new Vector2(-direction.y,direction.x)));
      fill=(along>-.7f&&along<.35f&&side<.1f)||(along>0&&along<.75f&&side<(.75f-along)*.85f);
     }
     texture.SetPixel(x,y,fill?Color.white:Color.clear);
    }
    texture.Apply();symbols[symbol]=texture;
   }
   var old=GUI.color;GUI.color=color;GUI.DrawTexture(r,texture,ScaleMode.ScaleToFit,true);GUI.color=old;
  }

  bool DirectionButton(Rect r,string direction,string id,bool chosen){
   bool enabled=GUI.enabled;
   bool clicked=Button(r,"",id,chosen?C("cde1bc"):paper);
   DrawDirection(r,direction,enabled?ink:C("8f9b8a"));
   if(chosen)Border(r,green,2);
   return clicked;
  }
  void HouseIcon(Rect r,Color color){
   DrawSymbol(new Rect(r.x+r.width*.16f,r.y+r.height*.16f,r.width*.68f,r.height*.68f),"house",color);
  }
 }
}
