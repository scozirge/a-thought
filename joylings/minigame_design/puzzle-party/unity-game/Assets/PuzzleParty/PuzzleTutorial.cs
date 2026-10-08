using UnityEngine;

namespace Together {
 public partial class PuzzleParty {
  string tutorialGame="";int tutorialPage;Vector2 beforeTutorialScroll;
  bool TutorialVisible=>!string.IsNullOrEmpty(tutorialGame);
  const float TutorialHeight=690;
  void SyncTutorial(string next,int page){
   next=next??"";if(next==tutorialGame&&page==tutorialPage)return;
   if(!TutorialVisible&&next!="")beforeTutorialScroll=scroll;
   scroll=next==""?beforeTutorialScroll:Vector2.zero;
   tutorialGame=next;tutorialPage=page;answerVisible=false;cancelPointer=true;
  }
  void ShowTutorial(string target,int page){
   if(!CanLead||playing||(target!="sticker"&&target!="penguin")||page<0||page>2)return;
   if(Route(new RoomAction{type="tutorial",game=target,index=page}))return;
   SyncTutorial(target,page);
  }
  void CloseTutorial(){
   if(!CanLead)return;
   if(Route(new RoomAction{type="tutorial-close"}))return;
   SyncTutorial("",0);
  }
  void DrawTutorial(){
   float width=Mathf.Min(680,viewWidth-48),x=(viewWidth-18-width)/2;
   Text(new Rect(x,18,width,38),GameName(tutorialGame)+" · 教學",24,ink,true);
   Text(new Rect(x,64,width,30),Online?"全房一起看 · "+(tutorialPage+1)+" / 3":"一起學會玩 · "+(tutorialPage+1)+" / 3",18,green);
   Rect card=new Rect(x,110,width,420);Panel(card);
   bool sticker=tutorialGame=="sticker";
   string[] titles=sticker?new[]{"① 看目標，選顏色","② 後貼的，蓋住前面的","③ 四張貼完，比一比"}:new[]{"① 選箭頭，帶企鵝回家","② 一滑就滑到底","③ 四步做完，才算成功"};
   string[] descriptions=sticker?new[]{"先看看目標的顏色。\n每張貼紙選一個顏色，讓結果跟目標一樣。","依①②③④的順序貼上。\n重疊的地方，只會看到最後貼上的顏色。","有 A、B 的貼紙，兩區都要選色。\n四步選好，老師按播放；每一格都跟目標一樣就成功！"}:new[]{"先找到企鵝和牠的家。\n依①②③④選四個方向，排好回家的路。","企鵝會一直滑，碰到冰塊或邊界才停。\n不是只走一格，也不會在家門口自動停下。","兩隻企鵝會一起照同一個箭頭滑。\n早到家也要繼續走；四步結束，全都在家才成功！"};
   Text(new Rect(x+16,130,width-32,66),titles[tutorialPage],24,ink,true);
   Rect artBox=new Rect(x+16,205,width-32,155);
   if(sticker)TutorialStickers(artBox);else TutorialPenguins(artBox);
   Text(new Rect(x+18,382,width-36,132),descriptions[tutorialPage],20,ink);
   Text(new Rect(x,546,width,62),Online?(CanLead?"大家先討論。老師翻頁，全班一起看。":"跟著老師看教學，關閉後再作答。"):"先討論再選。沒成功，改一個地方再試！",18,muted);
   if(CanLead){
    float gap=8,bw=(width-gap*2)/3;
    GUI.enabled=tutorialPage>0;
    if(Button(new Rect(x,622,bw,46),"上一頁","tutorial-prev"))ShowTutorial(tutorialGame,tutorialPage-1);
    GUI.enabled=true;
    if(Button(new Rect(x+bw+gap,622,bw,46),"關閉教學","tutorial-close"))CloseTutorial();
    if(Button(new Rect(x+(bw+gap)*2,622,bw,46),tutorialPage==2?"看完了":"下一頁", "tutorial-next",green,Color.white)){
     if(tutorialPage==2)CloseTutorial();else ShowTutorial(tutorialGame,tutorialPage+1);
    }
   }else Text(new Rect(x,622,width,46),"老師會帶大家翻頁",20,green,true,TextAnchor.MiddleCenter);
  }
  void TutorialGrid(Rect r,string[] colors){
   float c=r.width/2;for(int i=0;i<4;i++)Round(new Rect(r.x+i%2*c,r.y+i/2*c,c-3,c-3),ColorOf(colors[i]),5);
  }
  void TutorialStickers(Rect r){
   float size=Mathf.Min(104,(r.width-60)/2),left=r.x+(r.width-size*2-42)/2;
   if(tutorialPage==0){
    TutorialGrid(new Rect(left,r.y,size,size),new[]{"red","blue","red","blue"});
    Text(new Rect(left,r.y+110,size,30),"目標",18,ink,true,TextAnchor.MiddleCenter);
    for(int i=0;i<4;i++)Round(new Rect(left+size+42+i%2*(size/2),r.y+i/2*(size/2),size/2-4,size/2-4),ColorOf(new[]{"red","blue","yellow","green"}[i]),8);
    Text(new Rect(left+size+42,r.y+110,size,30),"選顏色",18,ink,true,TextAnchor.MiddleCenter);
   }else if(tutorialPage==1){
    TutorialGrid(new Rect(left,r.y,size,size),new[]{"red","red","red","red"});
    DrawDirection(new Rect(left+size+3,r.y+30,34,40),"right",ink);
    TutorialGrid(new Rect(left+size+42,r.y,size,size),new[]{"blue","red","red","red"});
    Text(new Rect(left,r.y+110,size,30),"先貼紅色",18,ink,true,TextAnchor.MiddleCenter);
    Text(new Rect(left+size+30,r.y+110,size+24,30),"再蓋上藍色",18,ink,true,TextAnchor.MiddleCenter);
   }else{
    Round(new Rect(left,r.y,size/2-2,size),ColorOf("red"),5);Round(new Rect(left+size/2,r.y,size/2-2,size),ColorOf("blue"),5);
    Text(new Rect(left,r.y+26,size/2,42),"A",24,ink,true,TextAnchor.MiddleCenter);Text(new Rect(left+size/2,r.y+26,size/2,42),"B",24,ink,true,TextAnchor.MiddleCenter);
    Text(new Rect(left,r.y+110,size,30),"兩區選色",18,ink,true,TextAnchor.MiddleCenter);
    Text(new Rect(left+size+42,r.y+8,size,72),"✓",50,green,true,TextAnchor.MiddleCenter);
    Text(new Rect(left+size+30,r.y+110,size+24,30),"對照目標",18,ink,true,TextAnchor.MiddleCenter);
   }
  }
  void TutorialPenguins(Rect r){
   float cell=Mathf.Min(54,(r.width-8)/5),left=r.x+(r.width-cell*5)/2;
   if(tutorialPage==2){
    for(int i=0;i<4;i++){
     Rect step=new Rect(r.x+i*r.width/4,r.y,r.width/4-5,65);Panel(step);DrawDirection(new Rect(step.x+8,step.y+4,step.width-16,37),new[]{"right","down","left","up"}[i],ink);
     Text(new Rect(step.x,step.y+40,step.width,24),StepNumber(i),18,ink,true,TextAnchor.MiddleCenter);
    }
    Image(new Rect(r.x+r.width/2-94,r.y+78,62,66),"penguinRed");Image(new Rect(r.x+r.width/2-28,r.y+78,62,66),"penguinBlue");DrawSymbol(new Rect(r.x+r.width/2+42,r.y+83,54,54),"house",green);
    return;
   }
   for(int i=0;i<5;i++)Round(new Rect(left+i*cell,r.y+20,cell-2,cell-2),C("e0eef1"),5);
   Image(new Rect(left,r.y+16,cell,cell),"penguinRed");
   if(tutorialPage==0){DrawSymbol(new Rect(left+4*cell,r.y+23,cell-6,cell-6),"house",green);DrawDirection(new Rect(left+2*cell,r.y+26,cell-12,cell-12),"right",ink);}
   else{
    DrawSymbol(new Rect(left+2*cell,r.y+24,cell-8,cell-8),"house",green);
    DrawDirection(new Rect(left+cell,r.y+24,cell-8,cell-8),"right",ink);
    Image(new Rect(left+3*cell,r.y+16,cell,cell),"penguinRed");Round(new Rect(left+4*cell+3,r.y+23,cell-8,cell-8),C("80b6cf"),5);
   }
   Text(new Rect(r.x,r.y+96,r.width,52),tutorialPage==0?"看位置，再排方向":"經過家 → 碰冰塊才停",20,green,true,TextAnchor.MiddleCenter);
  }
 }
}
