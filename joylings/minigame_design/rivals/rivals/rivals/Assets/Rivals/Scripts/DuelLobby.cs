using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public partial class DuelSession {
    public const string NetworkVersion="rivals-web-17-touch-controls";
    public static string RoomTitle(string name)=>DuelNames.Clean(name)+"的房間";
    public string PlayerName="貓貓";
    NetworkRunner lobbyRunner;
    bool lobbyConnecting,lobbyReady,lobbyHiddenReported;
    float nextLobbyReport,nextLobbyRetry;
    string lobbyStatus="";
    string LobbyMessage=>string.IsNullOrEmpty(Message)?lobbyStatus:Message;
    readonly List<SessionInfo> rooms=new List<SessionInfo>();
    Vector2 roomScroll;
    [Serializable] class LobbyRequest {public string action,name,room;}
    [Serializable] class RoomView {public string id,name;public int players,max;public bool open;}
    [Serializable] class LobbyView {public bool visible,busy,ready;public string name,room,message;public RoomView[] rooms;}
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern void RivalsReportLobby(string json);
#endif
    Fusion.Photon.Realtime.FusionAppSettings AppSettings() {
      var settings=Fusion.Photon.Realtime.PhotonAppSettings.Global.AppSettings.GetCopy();
      settings.FixedRegion=Region;settings.AppVersion=NetworkVersion;return settings;
    }
    async Task OpenLobby() {
      if(started||busy||lobbyRunner||lobbyConnecting||smoke)return;
      lobbyConnecting=true;lobbyStatus="正在取得房間清單…";
      var r=new GameObject("Room browser").AddComponent<NetworkRunner>();lobbyRunner=r;r.AddCallbacks(this);
      try {
        using(var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(ConnectionTimeoutSeconds))) {
          var result=await r.JoinSessionLobby(SessionLobby.ClientServer,customAppSettings:AppSettings(),cancellationToken:timeout.Token);
          if(!this||r!=lobbyRunner)return;
          lobbyReady=result.Ok;lobbyStatus=result.Ok?"選擇房間，或建立自己的房間。":"無法取得清單，稍後會重試，也可按重新整理。";
        }
      }catch(Exception e){
        Debug.LogWarning("RIVALS_LOBBY "+e.Message);
        if(this&&r==lobbyRunner){lobbyReady=false;lobbyStatus="暫時連不上房間清單，正在重試。";}
      } finally {
        if(!this||r!=lobbyRunner||!lobbyReady) {
          if(this&&r==lobbyRunner)lobbyRunner=null;
          await DisposeRunner(r);
        }
        if(this){lobbyConnecting=false;nextLobbyRetry=Time.unscaledTime+LobbyRetrySeconds;nextLobbyReport=0;}
      }
    }
    async Task CloseLobby() {
      var r=lobbyRunner;lobbyRunner=null;lobbyReady=false;rooms.Clear();
      await DisposeRunner(r);
    }
    [UnityEngine.Scripting.Preserve]
    public void LobbyCommand(string json) {
      if(started||busy||lobbyConnecting)return;
      LobbyRequest request;
      try{request=JsonUtility.FromJson<LobbyRequest>(json);}catch(ArgumentException){return;}
      if(request==null)return;
      if(request.action=="random"){PlayerName=DuelNames.RandomName();Room=RoomTitle(PlayerName);nextLobbyReport=0;return;}
      PlayerName=DuelNames.Clean(request.name);
      if(request.action=="rename"){Room=RoomTitle(PlayerName);nextLobbyReport=0;return;}
      if(request.action=="refresh"){_=RefreshLobby();return;}
      if(request.action=="create"){Room=RoomTitle(PlayerName);_=Connect(GameMode.Host);}
      if(request.action=="join"){
        // A listing has a unique connection id even when two hosts share a name.
        var room=rooms.FirstOrDefault(r=>r.Name==request.room);
        if(room==null){Message="這個房間已離開清單，請重新選擇。";return;}
        if(!room.IsOpen||room.PlayerCount>=room.MaxPlayers){Message="這個房間已滿或關閉，請重新選擇。";return;}
        Room=room.Name;_=Connect(GameMode.Client);
      }
    }
    async Task RefreshLobby(){
      if(lobbyConnecting||busy||started)return;
      lobbyConnecting=true;Message="";
      try{await CloseLobby();}
      finally{if(this)lobbyConnecting=false;}
      if(this)await OpenLobby();
    }
    void TickLobby() {
      if(!started&&!busy&&!lobbyRunner&&!lobbyConnecting&&!smoke&&Time.unscaledTime>=nextLobbyRetry)_=OpenLobby();
#if UNITY_WEBGL && !UNITY_EDITOR
      // The hidden room list does not change during a match. Avoid serializing
      // and sending the same lobby JSON four times per second while playing.
      if(started&&lobbyHiddenReported)return;
      if(Time.unscaledTime<nextLobbyReport)return;
      nextLobbyReport=Time.unscaledTime+.25f;
      var snapshot=new LobbyView{visible=!started&&!showSettings&&!showCredits,busy=busy||lobbyConnecting,ready=lobbyReady,name=PlayerName,room=Room,message=LobbyMessage,
        rooms=rooms.Select(r=>new RoomView{id=r.Name,name=ListingTitle(r),players=r.PlayerCount,max=r.MaxPlayers,open=r.IsOpen}).ToArray()};
      RivalsReportLobby(JsonUtility.ToJson(snapshot));
      lobbyHiddenReported=started;
#endif
    }
    static string ListingTitle(SessionInfo room)=>room.Properties.TryGetValue("host",out var host)?RoomTitle((string)host):room.Name;
    void DrawLobby() {
#if UNITY_WEBGL && !UNITY_EDITOR
      return; // Native HTML inputs support Chinese IME and accessible room buttons.
#else
      Panel(new Rect(170,90,940,555));GUI.Label(new Rect(200,108,880,60),"一起來對戰",title);
      GUI.Label(new Rect(200,184,170,40),"你的名字",text);PlayerName=GUI.TextField(new Rect(375,184,380,42),PlayerName,10);
      if(GUI.Button(new Rect(780,184,280,42),"隨機名字",button))PlayerName=DuelNames.RandomName();
      Room=RoomTitle(PlayerName);GUI.Label(new Rect(200,245,555,40),Room,text);
      GUI.enabled=!busy&&!lobbyConnecting;
      if(GUI.Button(new Rect(780,245,280,42),"建立房間",button))_=Connect(GameMode.Host);
      roomScroll=GUI.BeginScrollView(new Rect(200,312,870,235),roomScroll,new Rect(0,0,835,Mathf.Max(230,rooms.Count*58)));
      for(int i=0;i<rooms.Count;i++){var room=rooms[i];GUI.Label(new Rect(0,i*58,570,48),$"{ListingTitle(room)}　真人 {room.PlayerCount}/{room.MaxPlayers}",text);GUI.enabled=!busy&&room.IsOpen&&room.PlayerCount<room.MaxPlayers;if(GUI.Button(new Rect(610,i*58,210,46),"加入房間",button)){Room=room.Name;_=Connect(GameMode.Client);}}
      GUI.EndScrollView();GUI.enabled=true;GUI.Label(new Rect(200,564,870,50),LobbyMessage,text);
#endif
    }
    public void ShuffleTeams() {
      if(!Runner||!Runner.IsServer)return;
      var previousTeams=Players.ToDictionary(p=>p,p=>p.Team);
      var humans=Players.Where(p=>!p.IsBot).OrderBy(_=>UnityEngine.Random.value).ToArray();
      var bots=Players.Where(p=>p.IsBot).OrderBy(_=>UnityEngine.Random.value).ToArray();
      int flip=UnityEngine.Random.Range(0,2),index=0;
      foreach(var p in humans.Concat(bots)){int seat=index++;p.Seat=seat^flip;}
      if(Players.All(p=>p.Team==previousTeams[p]))foreach(var p in Players)p.Seat^=1;
      registeredPlayers.Sort((a,b)=>a.Seat.CompareTo(b.Seat));Players=registeredPlayers.ToArray();
    }
    internal sealed class SeatSnapshot {
      public int health,weapon,ammo,spawnSequence;public Vector3 position,spawnPoint;public Vector2 look,spawnLook;
      public TickTimer respawn;public bool eliminationRecorded;
      public SeatSnapshot(DuelPlayer p){health=p.Health;weapon=p.Weapon;ammo=p.Ammo;position=p.transform.position;look=p.Look;respawn=p.RespawnTimer;spawnSequence=p.SpawnSequence;spawnPoint=p.SpawnPoint;spawnLook=p.SpawnLook;eliminationRecorded=p.EliminationRecorded;}
      public void Apply(DuelPlayer p){
        p.CollectWeapon(weapon);p.Health=health;p.Look=look;
        p.RespawnTimer=respawn;p.SpawnSequence=spawnSequence;p.SpawnPoint=spawnPoint;p.SpawnLook=spawnLook;p.EliminationRecorded=eliminationRecorded;
        var hitbox=p.GetComponent<HitboxRoot>();if(hitbox)hitbox.HitboxRootActive=health>0;
        if(weapon==0)p.RifleAmmo=ammo;if(weapon==1)p.PistolAmmo=ammo;if(weapon==3)p.ShotgunAmmo=ammo;if(weapon==4)p.SniperAmmo=ammo;
        p.GetComponent<NetworkCharacterController>().Teleport(position,Quaternion.Euler(0,look.x,0));
      }
    }
    string NameFor(PlayerRef player) {
      var token=Runner.GetPlayerConnectionToken(player);
      return player==Runner.LocalPlayer?PlayerName:token!=null?DuelNames.Clean(Encoding.UTF8.GetString(token)):DuelNames.RandomName();
    }
  }
}
