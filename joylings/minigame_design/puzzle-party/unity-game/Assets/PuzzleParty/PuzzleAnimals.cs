using System;
using System.Linq;
using UnityEngine;

namespace Together {
 public partial class PuzzleParty {
  string[] animalOrder;Vector2[] animalPositions;float cameraFlash;
  static string AnimalName(string id){switch(id){case "cat":return "貓咪";case "dog":return "小狗";case "rabbit":return "兔子";case "bear":return "小熊";default:return "熊貓";}}
  static string AnimalAction(string id)=>id=="swap"?"前兩隻交換":id=="cycle"?"隊長到最後":"選一個";
  Color AnimalColor(string id)=>C(id=="cat"?"efbb76":id=="rabbit"?"e8b6c0":id=="dog"?"b99376":id=="bear"?"bf977c":"d5dfe0");
  void AnimalFace(Rect r,string id){
   float u=r.width/80f;Color c=AnimalColor(id);
   Rect Part(float x,float y,float w,float h)=>new Rect(r.x+x*u,r.y+y*u,w*u,h*u);
   if(id=="rabbit"){Round(Part(20,0,14,40),c,9*u);Round(Part(46,0,14,40),c,9*u);}
   else if(id=="cat"){Round(Part(14,10,18,33),c,3*u);Round(Part(48,10,18,33),c,3*u);}
   else if(id=="dog"){Round(Part(6,19,22,48),c,12*u);Round(Part(52,19,22,48),c,12*u);}
   else{Round(Part(6,13,24,24),id=="panda"?ink:c,12*u);Round(Part(50,13,24,24),id=="panda"?ink:c,12*u);}
   Round(Part(14,24,52,48),c,23*u);
   if(id=="panda"){Round(Part(20,31,18,24),ink,10*u);Round(Part(42,31,18,24),ink,10*u);}
   Round(Part(24,49,32,20),C("fff8e9"),12*u);
   Round(Part(26,40,6,6),id=="panda"?paper:ink,3*u);Round(Part(48,40,6,6),id=="panda"?paper:ink,3*u);
   Round(Part(36,52,8,6),ink,3*u);Round(Part(39,57,2,7),ink,0);
  }
  void AnimalRow(Rect r,string[] order,bool positions){
   int n=order.Length;float unit=r.width/n,size=Mathf.Min(68,unit-6);
   for(int a=0;a<n;a++){
    string id=order[a];Vector2 pos=positions?animalPositions[Array.IndexOf(level.lineup,id)]:new Vector2(a,0);
    float x=r.x+(pos.x+.5f)*unit-size/2,y=r.y+pos.y;
    AnimalFace(new Rect(x,y,size,size),id);
    bool wrong=positions&&result!=null&&id!=level.target[a];
    Text(new Rect(x-5,y+size,size+10,32),AnimalName(id),18,wrong?C("ae4739"):ink,true,TextAnchor.MiddleCenter);
    if(wrong)Text(new Rect(x+size-8,y+6,20,26),"!",20,C("ae4739"),true,TextAnchor.MiddleCenter);
   }
  }
  void DrawAnimal(Rect r){
   Text(new Rect(r.x+18,r.y+86,r.width-36,36),"目標照片 · 從左邊開始數",20,C("775c7e"),true);
   Panel(new Rect(r.x+14,r.y+126,r.width-28,160),C("f2ecf5"));
   AnimalRow(new Rect(r.x+20,r.y+143,r.width-40,95),level.target,false);
   float unit=(r.width-40)/level.lineup.Length;
   for(int i=0;i<level.lineup.Length;i++)Text(new Rect(r.x+20+i*unit,r.y+251,unit,25),(i+1).ToString(),18,muted,false,TextAnchor.MiddleCenter);
   Text(new Rect(r.x+18,r.y+303,r.width-36,64),"目前排隊 · 左邊是最前面\n每次動作都看當時的位置。",18,ink);
   var stage=new Rect(r.x+14,r.y+381,r.width-28,200);Panel(stage,C("f8f5e9"));
   for(int i=0;i<level.lineup.Length;i++)Text(new Rect(r.x+20+i*unit,stage.yMax-34,unit,28),(i+1).ToString(),18,muted,false,TextAnchor.MiddleCenter);
   AnimalRow(new Rect(r.x+20,stage.y+65,r.width-40,100),animalOrder,true);
   if(cameraFlash>0)Round(stage,new Color(1,1,.95f,cameraFlash*.7f),12);
   float fw=(r.width-36)/4f;
   for(int i=0;i<4;i++){
    var box=new Rect(r.x+18+i*fw,r.y+601,fw-5,83);Panel(box,active==i?gold:C("f3eef3"));
    Text(new Rect(box.x,box.y+7,box.width,28),Rules.Groups[i],18,ink,true,TextAnchor.MiddleCenter);
    Text(new Rect(box.x,box.y+43,box.width,29),settings[i]=="swap"?"交換":settings[i]=="cycle"?"到最後":"？",18,C("775c7e"),false,TextAnchor.MiddleCenter);
   }
   CueBox(new Rect(r.x+16,r.y+704,r.width-32,180));
   Text(new Rect(r.x+18,r.y+905,r.width-36,110),level.note,18,muted);
  }
 }
}
