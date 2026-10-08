using UnityEngine;

namespace Together {
 public static class TutorialGuide {
  public static int PageCount(string game)=>game=="sticker"?5:game=="penguin"?4:0;
 }
 public partial class PuzzleParty {
  string tutorialGame="";int tutorialPage;Vector2 beforeTutorialScroll;
  bool TutorialVisible=>!string.IsNullOrEmpty(tutorialGame);
  const float TutorialHeight=710;
  void SyncTutorial(string next,int page){
   next=next??"";if(next==tutorialGame&&page==tutorialPage)return;
   if(!TutorialVisible&&next!="")beforeTutorialScroll=scroll;
   scroll=next==""?beforeTutorialScroll:Vector2.zero;
   tutorialGame=next;tutorialPage=page;answerVisible=false;cancelPointer=true;
  }
  void ShowTutorial(string target,int page){
   if(!CanLead||playing||page<0||page>=TutorialGuide.PageCount(target))return;
   if(Route(new RoomAction{type="tutorial",game=target,index=page}))return;
   SyncTutorial(target,page);
  }
  void CloseTutorial(){
   if(!CanLead)return;
   if(Route(new RoomAction{type="tutorial-close"}))return;
   SyncTutorial("",0);
  }
  void DrawTutorial(){
   float width=Mathf.Min(640,viewWidth-48),x=(viewWidth-18-width)/2;
   int pages=TutorialGuide.PageCount(tutorialGame);
   Text(new Rect(x,18,width,38),GameName(tutorialGame)+" · 一起學",24,ink,true);
   Text(new Rect(x,64,width,30),(tutorialPage+1)+" / "+pages,18,green);
   Panel(new Rect(x,110,width,458));
   bool sticker=tutorialGame=="sticker";
   string[] titles=sticker?new[]{"把它做得一樣！","選一個顏色","藍色蓋住紅色","一樣就過關！","A、B 都要選"}:new[]{"箭頭指哪，就往哪","碰冰塊或邊邊才停","走完四步，再看家","兩隻企鵝一起滑"};
   string[] captions=sticker?new[]{"看「目標」，記住顏色。","找你的名字，按顏色。","沒被蓋住的，還是紅色。","一模一樣，就成功！","A 選一色，B 選一色。"}:new[]{"按 →，往右滑。","經過家，還會繼續滑！","四步後在家，就成功！","兩隻都回家，才成功！"};
   Text(new Rect(x+16,128,width-32,76),titles[tutorialPage],28,ink,true,TextAnchor.MiddleCenter);
   Rect artBox=new Rect(x+16,218,width-32,250);
   if(sticker)TutorialStickers(artBox);else TutorialPenguins(artBox);
   Text(new Rect(x+18,489,width-36,64),captions[tutorialPage],22,ink,true,TextAnchor.MiddleCenter);
   Text(new Rect(x,582,width,36),Online?"跟著老師，一起看。":"慢慢看，再試試。",18,muted,false,TextAnchor.MiddleCenter);
   if(CanLead){
    float gap=8,bw=(width-gap*2)/3;
    GUI.enabled=tutorialPage>0;
    if(Button(new Rect(x,642,bw,46),"上一頁","tutorial-prev"))ShowTutorial(tutorialGame,tutorialPage-1);
    GUI.enabled=true;
    if(Button(new Rect(x+bw+gap,642,bw,46),"關閉教學","tutorial-close"))CloseTutorial();
    if(Button(new Rect(x+(bw+gap)*2,642,bw,46),tutorialPage==pages-1?"看完了":"下一頁","tutorial-next",green,Color.white)){
     if(tutorialPage==pages-1)CloseTutorial();else ShowTutorial(tutorialGame,tutorialPage+1);
    }
   }else Text(new Rect(x,642,width,46),"老師會帶大家翻頁",20,green,true,TextAnchor.MiddleCenter);
  }
  // A tiny example keeps the same square in the same place in every picture.
  void TutorialGrid(Rect r,string[] colors){
   float cell=r.width/2;
   for(int i=0;i<4;i++){
    Rect tile=new Rect(r.x+i%2*cell,r.y+i/2*cell,cell-3,cell-3);
    Round(tile,string.IsNullOrEmpty(colors[i])?C("f0f1eb"):ColorOf(colors[i]),5);
    if(string.IsNullOrEmpty(colors[i]))Border(tile,line,1);
   }
  }
  void TutorialStickers(Rect r){
   string[] target={"blue","red","red","red"},red={"red","red","red","red"};
   float center=r.center.x;
   if(tutorialPage==0){
    Text(new Rect(r.x,r.y,r.width,32),"目標",22,green,true,TextAnchor.MiddleCenter);
    TutorialGrid(new Rect(center-82,r.y+42,164,164),target);
    Text(new Rect(r.x,r.y+215,r.width,30),"要做成這個樣子",20,muted,false,TextAnchor.MiddleCenter);
   }else if(tutorialPage==1){
    Rect card=new Rect(center-110,r.y+3,220,242);Panel(card,C("e5efde"));Border(card,green,3);
    Text(new Rect(card.x+12,card.y+8,card.width-24,32),"① 小兔（你的名字）",18,ink,true,TextAnchor.MiddleCenter);
    TutorialGrid(new Rect(center-49,card.y+48,98,98),red);
    Text(new Rect(card.x+8,card.y+150,card.width-16,28),"例如：選紅色",18,ink,false,TextAnchor.MiddleCenter);
    Rect chosen=new Rect(card.x+14,card.y+188,92,40);Round(chosen,ColorOf("red"),7);Border(chosen,ink,3);Text(chosen,"紅 ✓",20,ink,true,TextAnchor.MiddleCenter);
    Rect blue=new Rect(card.x+114,card.y+188,92,40);Round(blue,ColorOf("blue"),7);Text(blue,"藍",20,ink,true,TextAnchor.MiddleCenter);
   }else if(tutorialPage==2){
    float left=center-Mathf.Min(220,r.width/2),w=Mathf.Min(440,r.width);
    string[][] boards={red,new[]{"blue",null,null,null},target};
    string[] labels={"① 先貼紅色","② 再貼小藍片","左上角變藍了！"};
    for(int i=0;i<3;i++){
     float y=r.y+i*84;TutorialGrid(new Rect(left,y,72,72),boards[i]);
     Text(new Rect(left+88,y+8,w-88,56),labels[i],22,i==2?green:ink,true,TextAnchor.MiddleLeft);
     if(i<2)DrawDirection(new Rect(left+26,y+71,20,16),"down",muted);
    }
   }else if(tutorialPage==3){
    float size=Mathf.Min(132,(r.width-38)/2),left=center-size-19;
    Text(new Rect(left,r.y,size,30),"目標",20,ink,true,TextAnchor.MiddleCenter);
    Text(new Rect(left+size+38,r.y,size,30),"貼好的作品",20,ink,true,TextAnchor.MiddleCenter);
    TutorialGrid(new Rect(left,r.y+38,size,size),target);TutorialGrid(new Rect(left+size+38,r.y+38,size,size),target);
    Text(new Rect(center-17,r.y+64,34,52),"=",28,green,true,TextAnchor.MiddleCenter);
    Text(new Rect(r.x,r.y+181,r.width,30),"① ② ③ ④ 都選好",20,ink,true,TextAnchor.MiddleCenter);
    Text(new Rect(r.x,r.y+216,r.width,32),"老師按 ▶ 播放",22,green,true,TextAnchor.MiddleCenter);
   }else{
    float left=center-115;
    Round(new Rect(left,r.y+16,110,144),ColorOf("red"),8);Round(new Rect(left+120,r.y+16,110,144),ColorOf("blue"),8);
    Text(new Rect(left,r.y+56,110,62),"A",40,ink,true,TextAnchor.MiddleCenter);Text(new Rect(left+120,r.y+56,110,62),"B",40,ink,true,TextAnchor.MiddleCenter);
    Text(new Rect(left,r.y+182,110,38),"A 選紅色",20,ink,true,TextAnchor.MiddleCenter);Text(new Rect(left+120,r.y+182,110,38),"B 選藍色",20,ink,true,TextAnchor.MiddleCenter);
   }
  }
  void TutorialIceRow(Rect r,int penguin,int house,bool ice,string sprite){
   float cell=Mathf.Min(58,r.width/5),left=r.center.x-cell*2.5f;
   for(int i=0;i<5;i++){
    Rect tile=new Rect(left+i*cell,r.y,cell-3,cell-3);Round(tile,ice&&i==4?C("98c3d3"):C("edf7f7"),5);
    if(ice&&i==4)Border(new Rect(tile.x+7,tile.y+7,tile.width-14,tile.height-14),C("c3e6f0"),2);
    if(i==house)DrawSymbol(new Rect(tile.x+3,tile.y+3,tile.width-6,tile.height-6),"house",green);
   }
   Image(new Rect(left+penguin*cell-3,r.y-5,cell+3,cell+3),sprite);
  }
  void TutorialPenguins(Rect r){
   if(tutorialPage<2){
    bool ice=tutorialPage==1;
    Text(new Rect(r.x,r.y,r.width,30),"按一下 →",22,green,true,TextAnchor.MiddleCenter);
    TutorialIceRow(new Rect(r.x,r.y+40,r.width,60),0,ice?2:4,ice,"penguinRed");
    DrawDirection(new Rect(r.center.x-18,r.y+108,36,32),"down",muted);
    TutorialIceRow(new Rect(r.x,r.y+152,r.width,60),ice?3:4,ice?2:4,ice,"penguinRed");
    Text(new Rect(r.x,r.y+216,r.width,32),ice?"碰到冰塊前，停！":"滑到邊邊，停！",22,green,true,TextAnchor.MiddleCenter);
   }else if(tutorialPage==2){
    for(int i=0;i<4;i++){
     Rect step=new Rect(r.x+i*r.width/4,r.y+8,r.width/4-5,84);Panel(step);
     Text(new Rect(step.x,step.y+3,step.width,27),StepNumber(i),20,ink,true,TextAnchor.MiddleCenter);
     DrawDirection(new Rect(step.x+7,step.y+35,step.width-14,40),new[]{"right","down","left","up"}[i],ink);
    }
    Text(new Rect(r.x,r.y+108,r.width,32),"老師按 ▶ 播放",22,ink,true,TextAnchor.MiddleCenter);
    DrawSymbol(new Rect(r.center.x-44,r.y+151,88,88),"house",green);Image(new Rect(r.center.x-33,r.y+161,66,66),"penguinRed");
   }else{
    Text(new Rect(r.x,r.y,r.width,32),"同一個 →",22,green,true,TextAnchor.MiddleCenter);
    TutorialIceRow(new Rect(r.x,r.y+50,r.width,60),0,4,false,"penguinRed");
    DrawDirection(new Rect(r.center.x-18,r.y+62,36,32),"right",ink);
    TutorialIceRow(new Rect(r.x,r.y+154,r.width,60),0,4,false,"penguinBlue");
    DrawDirection(new Rect(r.center.x-18,r.y+166,36,32),"right",ink);
   }
  }
 }
}
