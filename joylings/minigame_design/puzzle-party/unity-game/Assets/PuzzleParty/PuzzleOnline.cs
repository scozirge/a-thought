using System;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;

namespace Together {
 public partial class PuzzleParty {
  PuzzleConnection connection;RoomSnapshot room;bool applyingRoom;Result roomPlan;int paintedRun=-1;float receivedAt,nextRoomUi;
  bool Online=>connection!=null&&connection.Connected&&room!=null&&room.connected;
  bool CanLead=>!Online||room.isHost;
  bool CanChoose(int slot)=>!playing&&(!Online||room.isHost||room.myGroup==slot);
  void InitOnline(){connection=gameObject.AddComponent<PuzzleConnection>();connection.Initialize(levels);connection.StateChanged+=ApplyRoom;}
  bool Route(RoomAction action){if(applyingRoom||!Online)return false;action.roundId=room.roundId;connection.Send(action);return true;}
  void GoHome(){if(Route(new RoomAction{type="home"}))return;Stop();game="";scroll=Vector2.zero;}
  void TogglePause(){if(Route(new RoomAction{type=paused?"resume":"pause"}))return;if(playing)paused=!paused;}
  void ChangeSpeed(){float next=speed==1?2:1;if(Route(new RoomAction{type="speed",speed=next}))return;speed=next;PlayerPrefs.SetFloat("speed",speed);PlayerPrefs.Save();}
  void ClearChoices(){if(Route(new RoomAction{type="clear"}))return;if(playing||level==null)return;for(int i=0;i<settings.Length;i++)PlayerPrefs.DeleteKey(level.id+":"+i);settings=new string[level.Decisions];selected=3;ResetScene();PlayerPrefs.Save();}
  [Serializable] class RoomRequest {public string type,code,name;public int group;}
  public void RoomCommand(string json){
   try{var request=JsonUtility.FromJson<RoomRequest>(json);if(request.type=="leave"){answerVisible=false;connection.Leave();return;}
    if(request.type=="create"||request.type=="join"){answerVisible=false;StopAllCoroutines();playing=false;paused=false;connection.Connect(request.type=="create",request.code,request.name,request.group);}
   }catch(Exception){Debug.LogWarning("無法讀取連線操作，請重新按一次。");}
  }
  [DllImport("__Internal")] static extern void PuzzleOpenRoom();
  [DllImport("__Internal")] static extern void PuzzleRoomStatus(string json);
  void ShowRoom(){
   #if UNITY_WEBGL && !UNITY_EDITOR
   PuzzleOpenRoom();
   #endif
  }
  [Serializable] class RoomUi {public bool ready,busy,connected,isHost;public string code,error;public int myGroup;public RoomMember[] members;}
  void Update(){
   if(Online&&room.phase=="playing")PaintRoom();
   if(Time.realtimeSinceStartup<nextRoomUi)return;nextRoomUi=Time.realtimeSinceStartup+.15f;
   #if UNITY_WEBGL && !UNITY_EDITOR
   PuzzleRoomStatus(JsonUtility.ToJson(new RoomUi{ready=true,busy=connection.Busy,connected=Online,isHost=Online&&room.isHost,code=Online?room.code:connection.Code,error=connection.Error,myGroup=Online?room.myGroup:3,members=Online?room.members:new RoomMember[0]}));
   #endif
  }
  void ApplyRoom(RoomSnapshot next){
   if(next==null||!next.connected){bool was=room!=null;room=null;roomPlan=null;paintedRun=-1;if(was){applyingRoom=true;Stop();game="";scroll=Vector2.zero;applyingRoom=false;}return;}
   bool changed=room==null||next.roundId!=room.roundId||next.game!=game||next.index!=levelIndex;
   bool settingsChanged=room==null||!settings.SequenceEqual(next.settings);
   string oldPhase=room?.phase;room=next;receivedAt=Time.realtimeSinceStartup;
   applyingRoom=true;
   if(changed){if(string.IsNullOrEmpty(next.game)){Stop();game="";scroll=Vector2.zero;}else Open(next.game,next.index);roomPlan=null;paintedRun=-1;}
   settings=(string[])next.settings.Clone();speed=next.speed;selected=next.isHost?Mathf.Clamp(selected,0,3):next.myGroup;
   if(string.IsNullOrEmpty(game)){applyingRoom=false;return;}
   if(next.phase=="planning"){
    if(changed||settingsChanged||oldPhase!="planning"){StopAllCoroutines();playing=false;paused=false;ResetScene();roomPlan=null;}
   }else{
    if(roomPlan==null||paintedRun!=next.runId){roomPlan=Rules.Run(level,settings);paintedRun=next.runId;StopAllCoroutines();if(next.phase=="playing")scroll.y=stageScrollY;}
    playing=next.phase=="playing";paused=next.paused;PaintRoom();
   }
   applyingRoom=false;
  }
  void PaintRoom(){
   if(roomPlan==null||level==null||string.IsNullOrEmpty(game))return;
   result=null;active=-1;currentStep=-1;
   if(room.phase=="result"){
    result=roomPlan;playing=false;paused=false;
    if(game=="sticker")stickerBoard=roomPlan.board;
    else icePositions=roomPlan.positions.Select(p=>p.Vec()).ToArray();
    Cue(result.success?"計畫成功！":"再看一次結果",result.success?(game=="sticker"?"每一格都與目標相同！":"四步結束，全部企鵝都停在家裡！"):(game=="sticker"?"驚嘆號是不同的格子。各組設定都保留，可以改一處再試。":"還有企鵝沒回家。各組設定都保留，可以改一處再試。"),result.success?"safe":"fire");return;
   }
   float elapsed=Mathf.Min(room.durationMs,room.elapsedMs+(room.paused?0:(Time.realtimeSinceStartup-receivedAt)*1000*room.speed));
   for(int i=0;i<roomPlan.frames.Count;i++){
    var frame=roomPlan.frames[i];float moving=game=="sticker"?300:180+110*Math.Max(1,frame.distances.Max());float span=game=="sticker"?900:moving+260;
    if(elapsed>=span&&i<roomPlan.frames.Count-1){elapsed-=span;continue;}
    active=i;currentStep=i;
    if(game=="sticker"){
     stickerBoard=elapsed>=300?frame.board:i==0?new string[level.cols*level.rows]:roomPlan.frames[i-1].board;
     Cue("第 "+(i+1)+" 張 · "+Rules.Group(i),"貼上"+Rules.Label(settings[i])+"色，後貼蓋前貼。","hero");
    }else{
     float progress=Mathf.Clamp01(elapsed/moving),max=Math.Max(1,frame.distances.Max());
     for(int b=0;b<icePositions.Length;b++)icePositions[b]=Vector2.Lerp(frame.from[b].Vec(),frame.positions[b].Vec(),frame.distances[b]==0?0:Mathf.Min(1,progress*max/frame.distances[b]));
     Cue("第 "+(i+1)+" 步 · "+Rules.Group(i),elapsed<moving?"一起"+Rules.Label(frame.command)+"滑，碰冰塊或邊界才停。":string.Join("；",frame.distances.Select((d,b)=>(b==0?"小紅":"小藍")+(d==0?"被擋住，留在原地":"滑了 "+d+" 格"))),"hero");
    }
    break;
   }
  }
 }
}
