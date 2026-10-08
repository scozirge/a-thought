using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Fusion;
using Fusion.Matchmaking;
using Fusion.Sockets;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Together {
 // The same Photon Host/Client transport as RIVALS. Only the teacher owns room
 // state; clients submit actions and receive a snapshot made for their identity.
 public sealed class PuzzleConnection : MonoBehaviour, INetworkRunnerCallbacks {
  public const string NetworkVersion="puzzle-party-v13-classroom";
  public bool Busy {get;private set;}
  public bool Connected {get;private set;}
  public bool IsHost {get;private set;}
  public string Error {get;private set;}="";
  public string Code {get;private set;}="";
  public event Action<RoomSnapshot> StateChanged;
  NetworkRunner runner;RoomAuthority authority;Level[] levels;
  RoomSnapshot latest;string displayName="";int epoch,serial,receivedSerial;
  NetworkRunner lobbyRunner;int lobbyEpoch;CancellationTokenSource lobbyTimeout;
  public bool LobbyBusy {get;private set;}
  public bool LobbyReady {get;private set;}
  public string LobbyError {get;private set;}="";
  [Serializable] public class RoomListing {public string code,name;public int students;public bool open;}
  public RoomListing[] Rooms {get;private set;}=new RoomListing[0];
  float lastTick,nextSend,lastReceive,lastUpdate;bool leaving;
  readonly HashSet<int> rejected=new HashSet<int>();
  readonly HashSet<int> admitted=new HashSet<int>();
  readonly Dictionary<int,int> actionSerials=new Dictionary<int,int>();
  [Serializable] sealed class Hello {public string name;}
  [Serializable] sealed class Packet {public string type,error;public int sequence;public RoomAction action;public RoomSnapshot state;}

  public void Initialize(Level[] book){levels=book;Application.runInBackground=true;}
  static string Id(PlayerRef player)=>player.RawEncoded.ToString();
  Fusion.Photon.Realtime.FusionAppSettings AppSettings(){
   var app=Fusion.Photon.Realtime.PhotonAppSettings.Global.AppSettings.GetCopy();
   app.FixedRegion="asia";app.AppVersion=NetworkVersion;return app;
  }
  public async void Browse(){
   if(Busy||Connected||leaving||LobbyBusy)return;
   LobbyBusy=true;LobbyError="";int request=lobbyEpoch+1;await CloseLobby();
   if(request!=lobbyEpoch||Busy||Connected||leaving)return;
   int attempt=++lobbyEpoch;LobbyBusy=true;
   var active=new GameObject("Puzzle room browser").AddComponent<NetworkRunner>();lobbyRunner=active;active.AddCallbacks(this);
   var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(25));lobbyTimeout=timeout;
   try{
    var result=await active.JoinSessionLobby(SessionLobby.ClientServer,customAppSettings:AppSettings(),cancellationToken:timeout.Token);
    if(attempt!=lobbyEpoch)return;
    LobbyReady=result.Ok;if(!result.Ok)LobbyError="無法取得房間清單，請按重新整理。";
   }catch(Exception){if(attempt==lobbyEpoch)LobbyError="暫時無法取得房間清單，請按重新整理。";}
   finally{
    timeout.Dispose();
    if(attempt==lobbyEpoch){lobbyTimeout=null;LobbyBusy=false;if(!LobbyReady)await CloseLobby();}
   }
  }
  async Task CloseLobby(){
   int closing=++lobbyEpoch;var active=lobbyRunner;lobbyRunner=null;
   lobbyTimeout?.Cancel();lobbyTimeout=null;LobbyReady=false;Rooms=new RoomListing[0];
   await Cleanup(active);if(closing==lobbyEpoch)LobbyBusy=false;
  }

  public async void Connect(bool host,string roomCode,string name){
   if(Busy||leaving||runner){Error="請先離開目前的房間。";NotifyError();return;}
   if(levels==null||levels.Length==0){Error="題庫還在載入，請稍後再試。";NotifyError();return;}
   roomCode=(roomCode??"").Trim();
   if(!host&&(roomCode.Length!=6||roomCode.Any(c=>c<'0'||c>'9'))){Error="請輸入老師的六位房號。";NotifyError();return;}
   name=RoomAuthority.CleanName(name);
   if(name.Length==0){Error="請輸入組別名稱。";NotifyError();return;}
   int attempt=++epoch;Busy=true;Connected=false;IsHost=host;Error="";leaving=false;latest=null;authority=null;rejected.Clear();admitted.Clear();actionSerials.Clear();receivedSerial=0;
   lastTick=lastReceive=lastUpdate=Time.realtimeSinceStartup;nextSend=0;
   Code=host?UnityEngine.Random.Range(100000,1000000).ToString():roomCode;
   displayName=name;
   await CloseLobby();if(attempt!=epoch)return;
   // Fusion may mark its runner DontDestroyOnLoad, which requires a root object.
   var go=new GameObject("Puzzle Photon connection");
   var active=go.AddComponent<NetworkRunner>();runner=active;active.ProvideInput=false;active.AddCallbacks(this);
   var sceneManager=go.AddComponent<NetworkSceneManagerDefault>();
   try {
    var app=AppSettings();
    // A classroom keeps its six-digit room identity. Handle a lost connection
    // explicitly instead of Fusion silently moving everyone into a new room.
    NetworkRunner.CloudConnectionLostCurrentMode=NetworkRunner.CloudConnectionLostMode.Disabled;
    var realtime=new Photon.Realtime.RealtimeClient().SetupForFusion(app);
    var config=NetworkProjectConfig.Global;config.AllowClientServerModesInWebGL=true;
    using(var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(35))){
     var result=await active.StartGame(new StartGameArgs {
      GameMode=host?GameMode.Host:GameMode.Client,SessionName="puzzle-"+Code,
      PlayerCount=4,IsVisible=true,IsOpen=true,EnableClientSessionCreation=false,
      SessionProperties=host?new Dictionary<string,SessionProperty>{{"host",displayName}}:null,
      ConnectionToken=Encoding.UTF8.GetBytes(JsonUtility.ToJson(new Hello{name=displayName})),
      Scene=SceneRef.FromIndex(SceneManager.GetActiveScene().buildIndex),SceneManager=sceneManager,
      Config=config,CustomPhotonAppSettings=app,RealtimeClient=realtime,StartGameCancellationToken=timeout.Token
     });
     if(attempt!=epoch||runner!=active)return;
     if(!result.Ok){Error=ConnectionMessage(result.ShutdownReason,host);await Cleanup(active);NotifyError();return;}
    }
    if(attempt!=epoch||runner!=active||!active.IsRunning)return;
    // Fusion 2.1 gives Host/Client rooms a 15-second inactive actor reservation.
    // Refreshing creates a new actor, so that reservation falsely fills a
    // four-seat classroom even after OnPlayerLeft freed its group. Release the
    // cloud seat at disconnect; game answers remain in RoomAuthority.
    if(host&&realtime.CurrentRoom!=null)realtime.CurrentRoom.PlayerTtl=0;
    if(realtime.CurrentRoom!=null)Debug.Log("PUZZLE_ROOM_PLAYER_TTL "+realtime.CurrentRoom.PlayerTtl);
    lastTick=lastReceive=lastUpdate=Time.realtimeSinceStartup;nextSend=0;
    if(host){EnsureAuthority(active);Connected=true;Broadcast();}
    Debug.Log("PUZZLE_ROOM_CONNECTED "+(host?"host":"student"));
   }catch(OperationCanceledException){if(attempt==epoch){Error="連線逾時，請檢查網路後再試。";await Cleanup(active);NotifyError();}}
   catch(Exception e){Debug.LogWarning("PUZZLE_ROOM_CONNECT "+e.GetType().Name);if(attempt==epoch){Error="目前無法連線，請稍後再試。";await Cleanup(active);NotifyError();}}
   finally{if(attempt==epoch)Busy=false;}
  }
  void EnsureAuthority(NetworkRunner active){
   if(authority==null)authority=new RoomAuthority(levels,Code,Id(active.LocalPlayer),displayName);
   admitted.Add(active.LocalPlayer.RawEncoded);
  }
  async Task Cleanup(NetworkRunner active){
   if(!active)return;active.RemoveCallbacks(this);
   if(runner==active){runner=null;authority=null;Connected=false;}
   try{await active.Shutdown();}catch(Exception e){Debug.LogWarning("PUZZLE_ROOM_CLEANUP "+e.GetType().Name);}
   finally{if(active)Destroy(active.gameObject);}
  }
  public async void Leave(){
   if(leaving)return;leaving=true;++epoch;Busy=true;
   var active=runner;
   if(active&&active.IsRunning&&IsHost)foreach(var player in active.ActivePlayers.Where(p=>p!=active.LocalPlayer))SendPacket(player,new Packet{type="closed",error="老師已關閉房間。"});
   await CloseLobby();await Cleanup(active);Connected=false;IsHost=false;Busy=false;Code="";Error="";latest=null;leaving=false;LobbyError="";
   StateChanged?.Invoke(new RoomSnapshot{connected=false,phase="offline",myGroup=3,error=""});
  }
  public void Send(RoomAction action){
   if(action==null)return;
   if(!Connected||!runner||!runner.IsRunning){Error="目前未連線，請先建立或加入房間。";NotifyError();return;}
   if(IsHost){Apply(runner.LocalPlayer,action);return;}
   int sequence=++serial;var bytes=Encoding.UTF8.GetBytes(JsonUtility.ToJson(new Packet{type="action",sequence=sequence,action=action}));
   runner.SendReliableDataToServer(ReliableKey.FromInts(0x50555A,sequence,0,0),bytes);
  }
  void Apply(PlayerRef sender,RoomAction action){
   if(authority==null)return;
   if(!authority.Apply(Id(sender),action,out var error)){
    var view=authority.View(Id(sender));view.error=error;
    if(sender==runner.LocalPlayer)Accept(view);else SendPacket(sender,new Packet{type="state",state=view});
    return;
   }
   Broadcast();
  }
  void SendPacket(PlayerRef player,Packet packet){
   if(!runner||!runner.IsRunning)return;
   packet.sequence=++serial;
   var bytes=Encoding.UTF8.GetBytes(JsonUtility.ToJson(packet));
   runner.SendReliableDataToPlayer(player,ReliableKey.FromInts(0x50555A,packet.sequence,0,0),bytes);
  }
  void Broadcast(){
   if(authority==null||!runner||!runner.IsRunning)return;
   foreach(var player in runner.ActivePlayers){
    // Fusion can expose a peer in ActivePlayers before its OnPlayerJoined
    // callback. Only admitted peers can be interpreted as authority removals.
    if(rejected.Contains(player.RawEncoded)||!admitted.Contains(player.RawEncoded))continue;
    var view=authority.View(Id(player));
    if(!view.connected&&player!=runner.LocalPlayer){admitted.Remove(player.RawEncoded);rejected.Add(player.RawEncoded);SendPacket(player,new Packet{type="closed",error="老師已將你移出房間。"});StartCoroutine(RejectLater(runner,player));continue;}
    if(player==runner.LocalPlayer)Accept(view);else SendPacket(player,new Packet{type="state",state=view});
   }
  }
  void Accept(RoomSnapshot state){
   if(state==null)return;latest=state;Connected=state.connected;IsHost=state.isHost;
   Error=state.error??"";lastReceive=Time.realtimeSinceStartup;StateChanged?.Invoke(state);
  }
  void NotifyError(){
   var state=latest==null?new RoomSnapshot{myGroup=-1,phase="offline"}:JsonUtility.FromJson<RoomSnapshot>(JsonUtility.ToJson(latest));
   state.error=Error;state.connected=Connected;StateChanged?.Invoke(state);
  }
  void Update(){
   if(!runner||!runner.IsRunning)return;
   float now=Time.realtimeSinceStartup;
   if(IsHost&&authority!=null){
    float elapsed=Mathf.Max(0,now-lastTick)*1000;lastTick=now;authority.Advance(elapsed);
    if(now>=nextSend){nextSend=now+.1f;Broadcast();}
   }else if(!IsHost){
    // StartGame owns its 35-second handshake timeout. Do not interpret the lack
    // of a teacher snapshot before the first connection as a disconnected host.
    if(Busy&&!Connected){lastUpdate=now;return;}
    // Browser suspension is not a dead teacher. Resume with a fresh grace period.
    if(now-lastUpdate>2)lastReceive=now;
    if(now-lastReceive>20){Error="老師連線已中斷，請重新加入房間。";FailConnection();}
   }
   lastUpdate=now;
  }
  async void FailConnection(){
   if(leaving)return;
   // Cleanup releases runner before Photon finishes shutting down. Keep the UI
   // busy so a new connection cannot be overwritten by this old continuation.
   leaving=true;Busy=true;int failureEpoch=++epoch;var active=runner;
   await Cleanup(active);
   if(failureEpoch!=epoch)return;
   Connected=false;Busy=false;IsHost=false;leaving=false;NotifyError();
  }
  IEnumerator RejectLater(NetworkRunner active,PlayerRef player){
   yield return new WaitForSecondsRealtime(.6f);
   if(active&&active==runner&&active.IsRunning&&active.IsServer&&rejected.Contains(player.RawEncoded))active.Disconnect(player);
  }
  public void OnPlayerJoined(NetworkRunner active,PlayerRef player){
   if(active!=runner||!active.IsServer)return;
   EnsureAuthority(active);
   if(player==active.LocalPlayer){Connected=true;return;}
   if(admitted.Contains(player.RawEncoded)||rejected.Contains(player.RawEncoded))return;
   string error="加入資訊不完整，請輸入組別名稱後重新加入。";Hello hello=null;
   try{var token=active.GetPlayerConnectionToken(player);if(token!=null&&token.Length<512)hello=JsonUtility.FromJson<Hello>(Encoding.UTF8.GetString(token));}catch(ArgumentException){}
   if(hello==null||!authority.TryJoin(Id(player),hello.name,out error)){
    rejected.Add(player.RawEncoded);SendPacket(player,new Packet{type="closed",error=error??"請重新加入房間。"});StartCoroutine(RejectLater(active,player));return;
   }
   admitted.Add(player.RawEncoded);Broadcast();
  }
  public void OnPlayerLeft(NetworkRunner active,PlayerRef player){
   if(active!=runner||!active.IsServer||authority==null)return;
   bool wasAdmitted=admitted.Remove(player.RawEncoded);rejected.Remove(player.RawEncoded);actionSerials.Remove(player.RawEncoded);
   if(wasAdmitted)authority.Remove(Id(player));Broadcast();
  }
  public void OnReliableDataReceived(NetworkRunner active,PlayerRef sender,ReliableKey key,ReadOnlySpan<byte> data){
   if(active!=runner||data.Length>32768)return;
   Packet packet;try{packet=JsonUtility.FromJson<Packet>(Encoding.UTF8.GetString(data.ToArray()));}catch(ArgumentException){return;}
   if(packet==null)return;
   if(active.IsServer){
    if(packet.type!="action"||rejected.Contains(sender.RawEncoded)||!admitted.Contains(sender.RawEncoded))return;
    if(actionSerials.TryGetValue(sender.RawEncoded,out int previous)&&packet.sequence<=previous)return;
    actionSerials[sender.RawEncoded]=packet.sequence;Apply(sender,packet.action);
   }else{
    // Reliable transfers may finish after newer small packets on a slow link.
    // A delayed snapshot must not rewind a level, selection, or playback clock.
    if(packet.sequence<=receivedSerial)return;receivedSerial=packet.sequence;
    if(packet.type=="state")Accept(packet.state);
    else if(packet.type=="closed"){Error=packet.error??"老師已關閉房間。";FailConnection();}
   }
  }
  public void OnShutdown(NetworkRunner active,ShutdownReason reason){
   if(active==lobbyRunner){lobbyRunner=null;LobbyReady=false;LobbyBusy=false;Rooms=new RoomListing[0];LobbyError="房間清單連線已中斷，請按重新整理。";active.RemoveCallbacks(this);Destroy(active.gameObject);return;}
   if(active!=runner)return;runner=null;authority=null;Connected=false;Busy=false;
   if(!leaving){Error=string.IsNullOrEmpty(Error)?ConnectionMessage(reason,IsHost):Error;IsHost=false;NotifyError();}
   if(active)Destroy(active.gameObject);
  }
  static string ConnectionMessage(ShutdownReason reason,bool host){
   switch(reason){
    case ShutdownReason.GameNotFound:return "找不到這個房間，請確認房號和老師是否在線。";
    case ShutdownReason.GameIsFull:return "房間已滿，三組與老師都已加入。";
    case ShutdownReason.GameIdAlreadyExists:case ShutdownReason.ServerInRoom:return "房號剛好重複了，請再按一次建立房間。";
    case ShutdownReason.GameClosed:return "老師已關閉房間。";
    case ShutdownReason.OperationCanceled:case ShutdownReason.OperationTimeout:case ShutdownReason.ConnectionTimeout:case ShutdownReason.PhotonCloudTimeout:return "連線逾時，請檢查網路後再試。";
    default:return host?"連線已中斷，請重新建立房間。":"連線已中斷，請重新加入房間。";
   }
  }
  public void OnConnectRequest(NetworkRunner active,NetworkRunnerCallbackArgs.ConnectRequest request,byte[] token){request.Accept();}
  public void OnConnectedToServer(NetworkRunner active){}
  public void OnDisconnectedFromServer(NetworkRunner active,NetDisconnectReason reason){if(active==runner&&!leaving&&string.IsNullOrEmpty(Error))Error="連線已中斷，請確認網路後重新加入房間。";}
  public void OnConnectFailed(NetworkRunner active,NetAddress address,NetConnectFailedReason reason){if(active==runner)Error="目前無法連線，請確認房號後再試。";}
  public void OnInput(NetworkRunner active,NetworkInput input){}
  public void OnInputMissing(NetworkRunner active,PlayerRef player,NetworkInput input){}
  public void OnSessionListUpdated(NetworkRunner active,List<SessionInfo> rooms){
   if(active!=lobbyRunner)return;
   Rooms=rooms.Where(r=>r.IsVisible&&r.Name.StartsWith("puzzle-")&&r.Name.Length==13&&r.Name.Substring(7).All(char.IsDigit))
    .OrderBy(r=>r.Name).Select(r=>new RoomListing{code=r.Name.Substring(7),name=r.Properties.TryGetValue("host",out var host)?(string)host:"老師",students=Math.Max(0,r.PlayerCount-1),open=r.IsOpen&&r.PlayerCount<r.MaxPlayers}).ToArray();
  }
  public void OnCustomAuthenticationResponse(NetworkRunner active,Dictionary<string,object> data){}
  public void OnHostMigration(NetworkRunner active,HostMigrationToken token){}
  public void OnReliableDataProgress(NetworkRunner active,PlayerRef player,ReliableKey key,float progress){}
  public void OnSceneLoadDone(NetworkRunner active){}
  public void OnSceneLoadStart(NetworkRunner active){}
  public void OnObjectEnterAOI(NetworkRunner active,NetworkObject obj,PlayerRef player){}
  public void OnObjectExitAOI(NetworkRunner active,NetworkObject obj,PlayerRef player){}
 }
}
