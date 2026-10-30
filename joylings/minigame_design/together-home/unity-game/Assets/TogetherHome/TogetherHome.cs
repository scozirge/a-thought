using System;
using System.Linq;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Newtonsoft.Json;
using UnityEngine;
namespace CatDog {
 public partial class TogetherHome : MonoBehaviour {
  Level[] levels;Tape[] tapes;State state,previousView;Connection room;Keys keys=new Keys(),demoKeys=new Keys();
  HashSet<string> completed=new HashSet<string>();bool initialized,tips,demo,paused,available=true,remoteAvailable=true,roomStarted;
  string phase="intro";double storyTime,accumulator;int mask,epoch=1,revision,demoIndex,demoRemaining,demoMask,remoteMask;
  int jumps,flips,inputSequence,remoteJumps,remoteFlips;bool remoteJump,remoteFlip;float nextPublish,nextInput,lastRemote,viewAt;
  [Serializable] class Options {public bool tips;public int level=-1;public string[] completed;}
  [Serializable] class ControlState {public int mask;}
  #if UNITY_WEBGL && !UNITY_EDITOR
  [DllImport("__Internal")] static extern void TogetherPublish(string json);
  [DllImport("__Internal")] static extern void TogetherReady();
  #else
  static void TogetherPublish(string json){} static void TogetherReady(){}
  #endif
  void Awake(){
   Application.targetFrameRate=60;Application.runInBackground=true;
   #if UNITY_WEBGL && !UNITY_EDITOR
   WebGLInput.captureAllKeyboardInput=false;
   #endif
   levels=JsonConvert.DeserializeObject<Level[]>(Resources.Load<TextAsset>("levels").text);tapes=JsonConvert.DeserializeObject<Tape[]>(Resources.Load<TextAsset>("solutions").text);
   room=gameObject.AddComponent<Connection>();room.Snapshot+=Receive;room.InputReceived+=Remote;room.GuestChanged+=Guests;room.Disconnected+=Offline;
   state=Rules.Fresh(levels[0],0);InitDrawing();Debug.Log("CATDOG_UNITY_READY "+levels.Length+" levels");
  }
  void Start(){TogetherReady();Publish();}
  public void Configure(string json){try{var config=JsonConvert.DeserializeObject<Options>(json);tips=config.tips;completed=new HashSet<string>((config.completed??Array.Empty<string>()).Where(k=>levels.Skip(1).Any(l=>l.saveKey==k)));if(config.level>=0&&config.level<levels.Length)Reset(config.level);else if(tips)Reset(1);initialized=true;Publish();}catch(Exception e){Debug.LogWarning(e.GetType().Name);}}
  bool CanControl=>!room.Connected||room.IsHost;
  bool Waiting=>room.Connected&&(!room.GuestPresent||!remoteAvailable);
  void Clear(){mask=remoteMask=0;keys.Clear();demoKeys.Clear();remoteJump=remoteFlip=false;jumps=flips=remoteJumps=remoteFlips=0;}
  void Reset(int index){
   state=Rules.Fresh(levels[index],index);previousView=null;phase="game";storyTime=0;epoch++;demo=paused=false;demoIndex=demoRemaining=demoMask=0;accumulator=0;Clear();remoteAvailable=true;lastRemote=Time.realtimeSinceStartup;nextPublish=0;
  }
  public void InputState(string json){
   try{
    int value=JsonConvert.DeserializeObject<ControlState>(json).mask&255;if(demo||phase!="game"||!available)return;
    if(room.Connected){value=(value&15)|((value>>4)&15);int pressed=value&~mask;if((pressed&4)!=0)jumps++;if((pressed&8)!=0)flips++;mask=value;if(room.IsHost)keys.Set(value);else SendInput();}
    else{mask=value;keys.Set(value);}
   }catch(Exception){}
  }
  public void Availability(string value){
   bool next=value=="true";if(next==available)return;available=next;mask=0;keys.Clear();accumulator=0;
   if(demo&&next){demoKeys.Set(demoMask);demoKeys.Consume();}
   if(room.Connected&&!room.IsHost)SendInput();nextPublish=0;
  }
  void OnApplicationFocus(bool focus){Availability(focus?"true":"false");}
  void SendInput(){room.SendInput(new RemoteInput{epoch=epoch,sequence=++inputSequence,mask=mask,jumps=jumps,flips=flips,available=available});nextInput=Time.realtimeSinceStartup+.1f;}
  void Remote(RemoteInput input){
   if(input.epoch!=epoch||demo)return;
   remoteAvailable=input.available;lastRemote=Time.realtimeSinceStartup;remoteMask=input.available?input.mask&15:0;
   if(input.available){remoteJump|=input.jumps>remoteJumps;remoteFlip|=input.flips>remoteFlips;}else remoteJump=remoteFlip=false;
   remoteJumps=Math.Max(remoteJumps,input.jumps);remoteFlips=Math.Max(remoteFlips,input.flips);
  }
  void Guests(){
   if(!room.IsHost)return;Clear();lastRemote=Time.realtimeSinceStartup;remoteAvailable=true;
   if(room.GuestPresent){int current=state.level;Reset(current);if(!roomStarted&&current==0&&!tips){phase="intro";storyTime=0;}roomStarted=true;}
   nextPublish=0;
  }
  void Offline(){Reset(state.level);nextPublish=0;}
  void Receive(RoomFrame frame){
   bool changed=frame.epoch!=epoch;previousView=changed?null:state;viewAt=Time.realtimeSinceStartup;state=frame.state;epoch=frame.epoch;revision=frame.revision;
   phase=frame.phase;storyTime=frame.storyTime;demo=frame.demo;paused=frame.paused;remoteAvailable=!frame.waiting;
   if(changed){Clear();SendInput();}
   if(state.won&&!demo&&state.level>0)completed.Add(levels[state.level].saveKey);
  }
  public void RoomCommand(string json){
   try{var request=JsonConvert.DeserializeObject<RoomRequest>(json);switch(request.type){case "browse":room.Browse();break;case "leave":room.Leave();break;case "create":roomStarted=false;room.Connect(true,"",request.name);break;case "join":room.Connect(false,request.code,request.name);break;}}catch(Exception){}
  }
  public void GameAction(string action){
   if(!CanControl)return;
   if(action.StartsWith("level:")&&int.TryParse(action.Substring(6),out int level)&&level>=0&&level<levels.Length){Reset(level);return;}
   switch(action){
    case "restart":Reset(state.level);break;
    case "next":if(state.won)Reset(state.level==20?1:state.level+1);break;
    case "skip":if(phase=="intro")Reset(0);else if(phase=="ending"){phase="game";storyTime=0;}break;
    case "ending":if(completed.Count==20){phase="ending";storyTime=0;Clear();}break;
    case "stop":if(demo)Reset(state.level);break;
    case "demo":
     if(!tips)return;
     if(demo&&!state.won&&!state.failed){paused=!paused;keys.Clear();accumulator=0;}
     else{Reset(state.level);demo=true;demoKeys.Clear();}
     break;
   }
  }
  Command[] DemoInput(){
   if(demoRemaining==0){var actions=tapes[state.level].actions;if(demoIndex>=actions.Length){paused=true;return null;}var a=actions[demoIndex++];demoRemaining=a[0];demoMask=a[1];}
   demoKeys.Set(demoMask);demoRemaining--;var input=demoKeys.Read();demoKeys.Consume();return input;
  }
  void Update(){
   float now=Time.realtimeSinceStartup;
   if(room.Connected&&!room.IsHost){if(now>=nextInput)SendInput();}
   else if(available&&!Waiting&&!room.Busy){
    if(phase!="game"){
     storyTime+=Math.Min(Time.unscaledDeltaTime,.05);
     if(phase=="intro"&&storyTime>=14)Reset(0);
    }else if(!paused){
     accumulator+=Math.Min(Time.unscaledDeltaTime,.05);
     while(accumulator>=Rules.Dt){
      accumulator-=Rules.Dt;var input=demo?DemoInput():keys.Read();keys.Consume();if(input==null)break;
      if(room.Connected&&room.IsHost&&!demo){
       if(now-lastRemote>.5f){remoteMask=0;remoteJump=remoteFlip=false;}
       input[1]=new Command{axis=((remoteMask&2)!=0?1:0)-((remoteMask&1)!=0?1:0),jump=remoteJump,special=remoteFlip};remoteJump=remoteFlip=false;
      }
      bool won=state.won;state=Rules.Step(state,input,levels[state.level]);
      if(!won&&state.won){keys.Clear();mask=0;if(!demo&&state.level>0){bool wasComplete=completed.Count==20;completed.Add(levels[state.level].saveKey);if(!wasComplete&&completed.Count==20){phase="ending";storyTime=0;}}}
      if(state.won||state.failed){accumulator=0;break;}
     }
    }
   }else accumulator=0;
   if(now>=nextPublish){nextPublish=now+.05f;Publish();}
  }
  void Publish(){
   if(state==null)return;revision++;
   if(room.Connected&&room.IsHost)room.Publish(new RoomFrame{state=state,epoch=epoch,revision=revision,hostMask=mask,demo=demo,paused=paused,waiting=Waiting||!available,phase=phase,storyTime=storyTime,completed=levels.Select((l,i)=>completed.Contains(l.saveKey)?i:-1).Where(i=>i>0).ToArray()});
   var l=levels[state.level];
   TogetherPublish(JsonConvert.SerializeObject(new{initialized,state,epoch,revision,phase,storyTime,tips,demo,paused,waiting=Waiting||!available,mask=demo?demoMask:room.Connected?(room.IsHost?mask:mask<<4):mask,
    name=l.name,hint=l.hint,solution=tips?l.solution:Array.Empty<string>(),jumpSwap=l.jumpSwap,gravityFlip=l.gravityFlip,phaseOnJump=l.phaseOnJump||l.switches.Length>0,
    levels=levels.Select((entry,i)=>new{index=i,name=entry.name,saveKey=entry.saveKey}).ToArray(),completed=completed.ToArray(),
    room=new{connected=room.Connected,busy=room.Busy,isHost=room.IsHost,guest=room.GuestPresent,code=room.Code,error=room.Error,hostName=room.HostName,guestName=room.GuestName,rooms=room.Rooms,lobbyBusy=room.LobbyBusy,lobbyReady=room.LobbyReady,lobbyError=room.LobbyError}}));
  }
 }
}
