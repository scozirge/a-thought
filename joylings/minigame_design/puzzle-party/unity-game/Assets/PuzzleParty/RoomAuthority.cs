using System;
using System.Collections.Generic;
using System.Linq;

namespace Together {
 [Serializable] public class RoomAction {
  public string type,game,value,name,playerId;
  public int index,slot,roundId,group;
  public float speed;
 }
 [Serializable] public class RoomMember {
  public string id,name;
  public int group;
  public bool isHost;
 }
 [Serializable] public class RoomSnapshot {
  public string code,game,phase,error;
  public int revision,roundId,runId,index,myGroup,mySlot;
  public int[] slotGroups;
  public bool isHost,connected,paused,success;
  public float speed,elapsedMs,durationMs;
  public string[] settings;
  public RoomMember[] members;
 }

 // Pure room state: the Fusion adapter supplies the authenticated sender ID and
 // advances this authority only on the teacher's device. No answers are sent.
 public sealed class RoomAuthority {
  readonly Level[] levels;
  readonly string code,hostId;
  readonly List<RoomMember> members=new List<RoomMember>();
  string game="",phase="planning";
  int index,revision=1,roundId=1,runId;
  bool paused,closed;
  float speed=1,elapsedMs,durationMs;
  string[] settings=new string[4];
  string[] slotOwners;
  Result result;
  Level level;

  public RoomAuthority(Level[] levels,string code,string hostId,string hostName) {
   if(levels==null)throw new ArgumentNullException(nameof(levels));
   if(string.IsNullOrWhiteSpace(hostId))throw new ArgumentException("老師身分不可留空。",nameof(hostId));
   this.levels=levels;this.code=code??"";this.hostId=hostId;slotOwners=Enumerable.Repeat(hostId,4).ToArray();
   string name=CleanName(hostName);
   if(name.Length==0)throw new ArgumentException("請輸入組別名稱。",nameof(hostName));
   members.Add(new RoomMember{id=hostId,name=name,group=3,isHost=true});
  }

  public static string CleanName(string value) {
   string name=new string((value??"").Where(c=>!char.IsControl(c)).ToArray()).Trim();
   return name.Substring(0,Math.Min(16,name.Length));
  }
  public static string TeamLabel(RoomMember member)=>member.name+" 小隊("+(member.isHost?"老師組":"第"+(member.group+1)+"組")+")";
  static bool Reject(out string error,string message){error=message;return false;}
  static bool Finite(float value)=>!float.IsNaN(value)&&!float.IsInfinity(value);
  void ResetPlayback(){phase="planning";paused=false;elapsedMs=0;durationMs=0;result=null;}
  void AssignSlots(){var students=members.Where(m=>!m.isHost).ToArray();slotOwners=Enumerable.Range(0,4).Select(i=>i<students.Length?students[i].id:hostId).ToArray();}
  void NextRound(){roundId++;ResetPlayback();}

  public bool TryJoin(string id,string name,out string error) {
   error=null;
   if(closed)return Reject(out error,"老師已結束房間，請重新加入。");
   if(string.IsNullOrWhiteSpace(id))return Reject(out error,"無法確認連線身分。");
   var existing=members.FirstOrDefault(m=>m.id==id);
   if(existing!=null)return true;
   name=CleanName(name);
   if(name.Length==0)return Reject(out error,"請輸入組別名稱。");
   int group=Enumerable.Range(0,3).Where(g=>!members.Any(m=>m.group==g)).DefaultIfEmpty(-1).First();
   if(group<0)return Reject(out error,"房間已滿，請選擇其他房間。");
   members.Add(new RoomMember{id=id,name=name,group=group,isHost=false});
   revision++;return true;
  }

  // Student disconnects free their seat without erasing the group's answer.
  // A teacher disconnect closes the room; the transport then disconnects peers.
  public void Remove(string id) {
   if(!members.Any(m=>m.id==id))return;
   if(id==hostId){closed=true;members.Clear();NextRound();}
   else {members.RemoveAll(m=>m.id==id);for(int i=0;i<slotOwners.Length;i++)if(slotOwners[i]==id)slotOwners[i]=hostId;}
   revision++;
  }

  public bool Apply(string sender,RoomAction action,out string error) {
   error=null;
   if(closed)return Reject(out error,"老師已結束房間，請重新加入。");
   var member=members.FirstOrDefault(m=>m.id==sender);
   if(member==null)return Reject(out error,"請先加入房間。");
   if(action==null)return Reject(out error,"沒有收到操作，請再試一次。");
   if(action.roundId!=roundId)return Reject(out error,"題目已更新，請依目前畫面重新操作。");
   if(action.type!="set"&&!member.isHost)return Reject(out error,"這個操作交給老師。");

   switch(action.type) {
    case "open": {
     if(action.game!="sticker"&&action.game!="penguin")return Reject(out error,"找不到這個遊戲。");
     var next=levels.FirstOrDefault(l=>l.game==action.game&&l.index==action.index);
     if(next==null||next.Decisions!=4||next.options==null||next.options.Length<2||next.rotateAfter!=0)
      return Reject(out error,"找不到可供四組作答的題目。");
     level=next;game=next.game;index=next.index;settings=new string[4];AssignSlots();NextRound();break;
    }
    case "home":
     game="";level=null;index=0;settings=new string[4];NextRound();break;
    case "set":
     if(level==null)return Reject(out error,"請等老師選擇題目。");
     if(phase=="playing")return Reject(out error,"正在播放，先看完再修改。");
     if(action.slot<0||action.slot>=4)return Reject(out error,"找不到這個作答位置。");
     if(!member.isHost&&slotOwners[action.slot]!=sender)return Reject(out error,"你只能設定自己這一組。");
     if(!Rules.ValidChoice(level,action.value))return Reject(out error,"請選擇畫面上的選項。");
     settings[action.slot]=action.value;ResetPlayback();break;
    case "play":
     if(level==null)return Reject(out error,"請先選擇題目。");
     if(phase=="playing")return Reject(out error,"已經開始播放了。");
     if(settings.Any(s=>s==null||!level.options.Contains(s)))return Reject(out error,"四組都選好才可以播放；缺席組別可由老師代答。");
     result=Rules.Run(level,settings);
     durationMs=game=="sticker"?result.frames.Count*900f:result.frames.Sum(f=>440f+110f*Math.Max(1,f.distances.Max()));
     elapsedMs=0;phase="playing";paused=false;runId++;break;
    case "pause":
     if(phase!="playing")return Reject(out error,"目前沒有正在播放。");
     paused=true;break;
    case "resume":
     if(phase!="playing")return Reject(out error,"目前沒有暫停中的播放。");
     paused=false;break;
    case "stop":
     if(level==null)return Reject(out error,"請先選擇題目。");
     NextRound();break;
    case "clear":
     if(level==null)return Reject(out error,"請先選擇題目。");
     settings=new string[4];NextRound();break;
    case "speed":
     if(!Finite(action.speed)||(action.speed!=1&&action.speed!=2))return Reject(out error,"播放速度只能選擇 1 倍或 2 倍。");
     speed=action.speed;break;
    case "remove":
     if(action.playerId==hostId||!members.Any(m=>m.id==action.playerId))return Reject(out error,"無法移除這個組別。");
     Remove(action.playerId);return true;
    default:return Reject(out error,"不認得這個操作。");
   }
   revision++;return true;
  }

  public void Advance(float deltaMs) {
   if(closed||phase!="playing"||paused||!Finite(deltaMs)||deltaMs<=0)return;
   elapsedMs=Math.Min(durationMs,elapsedMs+deltaMs*speed);
   if(elapsedMs>=durationMs){phase="result";paused=false;}
   revision++;
  }

  public RoomSnapshot View(string playerId) {
   var player=members.FirstOrDefault(m=>m.id==playerId);
   return new RoomSnapshot {
    code=code,game=game,phase=phase,error="",revision=revision,roundId=roundId,runId=runId,index=index,
    mySlot=player==null?-1:Array.IndexOf(slotOwners,playerId),slotGroups=slotOwners.Select(id=>members.FirstOrDefault(m=>m.id==id)?.group??3).ToArray(),
    myGroup=player==null?-1:player.group,isHost=player!=null&&player.isHost,connected=!closed&&player!=null,
    paused=paused,speed=speed,elapsedMs=elapsedMs,durationMs=durationMs,
    settings=(string[])settings.Clone(),members=members.OrderBy(m=>m.group).Select(m=>new RoomMember{id=m.id,name=m.name,group=m.group,isHost=m.isHost}).ToArray(),
    success=phase=="result"&&result!=null&&result.success
   };
  }
 }
}
