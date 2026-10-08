using System.Linq;
using UnityEngine;

namespace Together {
 public partial class PuzzleParty {
  bool answerVisible;string answerLevel;string[] answer;
  bool CanReveal=>game!=""&&level!=null&&Rules.MayReveal(connection.Busy,connection.Connected,connection.IsHost);
  void ToggleAnswer(){
   if(!CanReveal){answerVisible=false;return;}
   if(answerLevel!=level.id){answer=Rules.Solve(level);answerLevel=level.id;}
   answerVisible=!answerVisible;
  }
  void DrawAnswer(float height){
   if(!answerVisible||!CanReveal)return;
   // Modal input blocker: answer stays local and never changes the room plan.
   Rect screen=new Rect(0,0,viewWidth,height);
   Round(screen,new Color(.09f,.20f,.16f,.65f),0);
   float width=Mathf.Min(480,viewWidth-32),h=Mathf.Min(430,height-24);
   Rect box=new Rect((viewWidth-width)/2,(height-h)/2,width,h);Panel(box);
   Text(new Rect(box.x+20,box.y+18,width-40,38),"老師參考答案",26,ink,true);
   for(int i=0;i<(answer?.Length??0);i++)Text(new Rect(box.x+20,box.y+72+i*48,width-40,44),(i+1)+". "+StepGroup(i)+"："+Rules.Label(answer[i]),20,ink);
   Text(new Rect(box.x+20,box.y+274,width-40,70),game=="penguin"?"同一方向讓兩邊一起滑。到家後仍繼續，四步結束才算通關。":level.twoColor?"A、B 各選一色，依四張順序貼上。":"每張選一色，後貼蓋前貼。",18,muted);
   if(Button(new Rect(box.x+20,box.yMax-66,width-40,46),"收起答案","answer-close"))answerVisible=false;
  }
  void DrawTwoColor(Rect r,int i){
   Text(new Rect(r.x+10,r.y+8,r.width-20,32),StepGroup(i)+" · 第 "+(i+1)+" 張",20,ink,true);
   float cell=26;var parts=Rules.ColorParts(settings[i]);
   for(int c=0;c<level.cols*level.rows;c++){
    Rect t=new Rect(r.x+10+c%level.cols*cell,r.y+46+c/level.cols*cell,cell-2,cell-2);
    bool occupied=level.masks[i].cells.Contains(c),b=level.masksB[i].cells.Contains(c);
    Round(t,occupied?(b?C("f4dea1"):C("ceded4")):Color.white,2);
    if(occupied)Text(t,b?"B":"A",18,ink,true,TextAnchor.MiddleCenter);
   }
   Text(new Rect(r.x+124,r.y+58,r.width-134,86),"A、B 兩區\n各選一色",20,ink);
   for(int area=0;area<2;area++){
    float y=r.y+160+area*84;Text(new Rect(r.x+10,y,r.width-20,34),(area==0?"A":"B")+" 區",18,ink,true);
    float w=(r.width-20)/level.palette.Length;
    for(int j=0;j<level.palette.Length;j++){
     string color=level.palette[j];bool chosen=parts[area]==color;GUI.enabled=CanChoose(i);
     if(Button(new Rect(r.x+10+j*w,y+34,w-5,44),Rules.Label(color)+(chosen?" ✓":""),$"color:{i}:{area}:{color}",chosen?ColorOf(color):paper)){
      var next=Rules.ColorParts(settings[i]);next[area]=color;Set(i,string.Join("|",next));
     }GUI.enabled=true;
    }
   }
  }
 }
}
