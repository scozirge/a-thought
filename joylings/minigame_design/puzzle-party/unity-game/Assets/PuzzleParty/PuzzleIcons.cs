using UnityEngine;

namespace Together {
 public partial class PuzzleParty {
  string StepNumber(int i)=>new[]{"①","②","③","④"}[Mathf.Clamp(i,0,3)];
  string ShortOwner(int i)=>!Online?"":room.mySlot==i?"你":StepGroup(i)=="老師組"?"老師":StepGroup(i).Replace("第 ","").Replace(" 組","組");
  string ShortIdentity()=>!Online?"":room.isHost?"老師":room.mySlot<0?"等下一題":"你："+StepNumber(room.mySlot);
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
