using System;
using System.Linq;
using UnityEngine;

namespace Together {
 public partial class PuzzleParty {
  float DrawCompactHeader(bool narrow){
   float y=narrow?50:12;
   Text(new Rect(20,12,narrow?viewWidth-40:viewWidth-370,36),GameName(game)+" · "+(levelIndex+1),22,ink,true);
   float x=narrow?20:viewWidth-342;
   if(Button(new Rect(x,y,80,40),levelPicker?"收起":"選關","level-picker"))levelPicker=!levelPicker;
   if(Button(new Rect(x+88,y,88,40),Online?"房間":"連線","room"))ShowRoom();
   GUI.enabled=CanLead;if(Button(new Rect(x+184,y,66,40),"選單","home"))GoHome();GUI.enabled=true;
   if(CanReveal&&Button(new Rect(x+258,y,44,40),"?","answer"))ToggleAnswer();
   y+=50;
   if(levelPicker){
    var list=levels.Where(l=>l.game==game).ToArray();int cols=Math.Max(1,(int)((viewWidth-40)/52));
    for(int i=0;i<list.Length;i++){
     GUI.enabled=CanLead;
     if(Button(new Rect(20+i%cols*52,y+i/cols*48,44,40),(i+1).ToString(),"level:"+i,i==levelIndex?green:C("e9ede2"),i==levelIndex?Color.white:ink)){Open(game,i);levelPicker=false;}
     GUI.enabled=true;
    }
    y+=Mathf.Ceil(list.Length/(float)cols)*48+8;
   }
   return y;
  }
  void StickerMask(Rect r,int i){
   float cell=r.width/level.cols;
   for(int c=0;c<level.cols*level.rows;c++){
    bool occupied=level.masks[i].cells.Contains(c),b=level.twoColor&&level.masksB[i].cells.Contains(c);
    Rect tile=new Rect(r.x+c%level.cols*cell,r.y+c/level.cols*cell,cell-3,cell-3);
    Round(tile,occupied?(level.twoColor?(b?C("f4dea1"):C("ceded4")):C("789687")):Color.white,3);
    if(occupied&&level.twoColor)Text(tile,b?"B":"A",18,ink,true,TextAnchor.MiddleCenter);
   }
  }
  void StickerColors(Rect r,int i){
   var parts=Rules.ColorParts(settings[i]);int areas=level.twoColor?2:1;
   for(int area=0;area<areas;area++){
    float y=r.y+area*78,left=r.x;
    if(level.twoColor){Text(new Rect(left,y,r.width,32),area==0?"A 區":"B 區",18,ink,true);y+=32;}
    float w=r.width/level.palette.Length;
    for(int j=0;j<level.palette.Length;j++){
     string color=level.palette[j];bool chosen=(level.twoColor?parts[area]:settings[i])==color;GUI.enabled=CanChoose(i);
     string id=level.twoColor?$"color:{i}:{area}:{color}":$"choose:{i}:{color}";
     if(Button(new Rect(left+j*w,y,w-4,42),Rules.Label(color),id,chosen?ColorOf(color):paper)){
      if(level.twoColor){var next=Rules.ColorParts(settings[i]);next[area]=color;Set(i,string.Join("|",next));}else Set(i,color);
     }
     GUI.enabled=true;
     if(chosen)Border(new Rect(left+j*w,y,w-4,42),ink,2);
    }
   }
  }
  void DrawStickerOverview(float y,bool narrow,int count){
   float width=viewWidth-40,gap=10,cardWidth=(width-gap*(narrow?1:3))/(narrow?2:4);
   float mask=Mathf.Min(narrow?96:120,cardWidth-24),cardHeight=64+mask+(narrow?10:level.twoColor?168:56);
   float cardsY=narrow?y:y+218;
   for(int i=0;i<4;i++){
    Rect r=new Rect(20+i%(narrow?2:4)*(cardWidth+gap),cardsY+i/(narrow?2:4)*(cardHeight+gap),cardWidth,cardHeight);
    Panel(r,active==i?gold:selected==i?C("e5efde"):C("f1f3ea"));
    Text(new Rect(r.x+10,r.y+5,r.width-20,28),"第 "+(i+1)+" 張"+(i<3?" →":""),20,ink,true);
    Text(new Rect(r.x+10,r.y+32,r.width-20,28),StepGroup(i)+(Online&&room.mySlot==i?" · 你":""),18,ink);
    Rect grid=new Rect(r.x+(r.width-mask)/2,r.y+62,mask,mask);StickerMask(grid,i);
    Rect pick=new Rect(r.x,r.y,r.width,64+mask);HitBox(pick,"role:"+i);
    if(!answerVisible&&CanChoose(i)&&GUI.Button(pick,"",GUIStyle.none))selected=i;
    if(!narrow)StickerColors(new Rect(r.x+10,grid.yMax+8,r.width-20,150),i);
   }
   float boardY=narrow?cardsY+2*(cardHeight+gap)+8:y;
   float size=narrow?Mathf.Min(150,(width-18)/2):176;
   float right=20+size+18;
   Text(new Rect(20,boardY,size,28),"目標",18,muted,false,TextAnchor.MiddleCenter);
   Text(new Rect(right,boardY,size,28),"播放結果",18,muted,false,TextAnchor.MiddleCenter);
   Tiles(new Rect(20,boardY+28,size,size),level.target,level.cols);
   var matrix=GUI.matrix;if(rotating)RotateLocal(rotation,new Vector2(right+size/2,boardY+28+size/2));
   Tiles(new Rect(right,boardY+28,size,size),stickerBoard,level.cols,result!=null);GUI.matrix=matrix;
   if(!narrow){
    float infoX=right+size+28,infoWidth=viewWidth-infoX-24;
    Text(new Rect(infoX,boardY+4,infoWidth,76),"先看四張的格子，再選顏色。\n後貼的會蓋住前面。",20,ink,true);
    Text(new Rect(infoX,boardY+82,infoWidth,60),RoleIdentity()+"\n"+AssignmentHint(),18,muted);
    Text(new Rect(infoX,boardY+150,infoWidth,58),playing?(paused?"已暫停":cue):result!=null?(result.success?"成功！四張一起完成了。":"再比一比目標，改一處試試。"):"填好四張後，按播放看看。",20,ink,true);
   }
   float bottom=narrow?boardY+size+40:cardsY+cardHeight+10;
   if(narrow){
    selected=Mathf.Clamp(selected,0,3);
    Panel(new Rect(20,bottom,width,level.twoColor?196:106));
    Text(new Rect(30,bottom+6,width-20,28),"第 "+(selected+1)+" 張 · "+StepGroup(selected),20,ink,true);
    StickerColors(new Rect(30,bottom+40,width-20,150),selected);
    bottom+=level.twoColor?206:116;
   }
   float playWidth=narrow?width-152:220;
   GUI.enabled=CanLead&&(playing||Rules.Complete(level,settings));
   if(Button(new Rect(20,bottom,playWidth,44),playing?(paused?"繼續":"暫停"):"播放看看",playing?"pause":"play",green,Color.white)){if(playing)TogglePause();else Play();}GUI.enabled=true;
   GUI.enabled=CanLead;
   if(Button(new Rect(28+playWidth,bottom,82,44),playing?"停止":"清空",playing?"stop":"clear")){if(playing)Stop();else ClearChoices();}
   if(Button(new Rect(118+playWidth,bottom,54,44),speed+"×","speed"))ChangeSpeed();GUI.enabled=true;
   if(result!=null&&result.success&&CanLead){
    float nextY=narrow?bottom+54:bottom;
    if(Button(new Rect(narrow?20:playWidth+190,nextY,narrow?width:150,44),levelIndex<count-1?"下一關 →":"回選單","next")){if(levelIndex<count-1)Open(game,levelIndex+1);else GoHome();}
    if(narrow)bottom+=54;
   }
   if(narrow){Text(new Rect(20,bottom+54,width,76),playing?cue:result!=null?(result.success?"成功！":"再比一比目標，改一處試試。"):"點上方貼紙設定顏色；後貼蓋前貼。",18,ink);bottom+=86;}
   stageScrollY=0;contentHeight=bottom+64;
  }
 }
}
