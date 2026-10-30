using System;
using System.Linq;
using System.Text;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Fusion;
using Fusion.Matchmaking;
using Fusion.Sockets;
using UnityEngine;
using UnityEngine.SceneManagement;
using Newtonsoft.Json;
namespace CatDog {
 [Serializable] public class RemoteInput {public int epoch,sequence,mask,jumps,flips;public bool available=true;}
 [Serializable] public class RoomFrame {public State state;public int epoch,revision,hostMask;public bool demo,paused,waiting;public string phase="game";public double storyTime;public int[] completed;}
 [Serializable] public class RoomRequest {public string type,code,name;}
 public sealed class Connection : MonoBehaviour,INetworkRunnerCallbacks {
  public const string Version="catdog-online-v1";
  public bool Busy,Connected,IsHost,GuestPresent,LobbyBusy,LobbyReady;
  public string Error="",Code="",HostName="",GuestName="",LobbyError="";
  [Serializable] public class Listing {public string code,name;public bool open;public int count;}
  public Listing[] Rooms=Array.Empty<Listing>();
  public event Action<RoomFrame> Snapshot;public event Action<RemoteInput> InputReceived;public event Action GuestChanged;public event Action Disconnected;
  NetworkRunner runner,lobby;PlayerRef guest;int epoch,lobbyEpoch,serial,received,guestSequence;bool leaving;
  CancellationTokenSource connectTimeout,lobbyTimeout;RoomFrame latest;
  [Serializable] class Hello {public string name;}
  [Serializable] class Packet {public string type,error;public int serial;public RemoteInput input;public RoomFrame frame;}
  Fusion.Photon.Realtime.FusionAppSettings Settings(){var app=Fusion.Photon.Realtime.PhotonAppSettings.Global.AppSettings.GetCopy();app.FixedRegion="asia";app.AppVersion=Version;return app;}
  static string Clean(string value)=>new string((value??"").Where(c=>!char.IsControl(c)).Take(16).ToArray()).Trim();
  public async void Browse(){
   if(Busy||Connected||LobbyBusy||leaving)return;LobbyBusy=true;LobbyError="";await CloseLobby();
   if(Busy||Connected||leaving)return;
   int attempt=++lobbyEpoch;LobbyBusy=true;var active=new GameObject("CatDog room list").AddComponent<NetworkRunner>();lobby=active;active.AddCallbacks(this);
   var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(25));lobbyTimeout=timeout;
   try{var result=await active.JoinSessionLobby(SessionLobby.ClientServer,customAppSettings:Settings(),cancellationToken:timeout.Token);if(attempt!=lobbyEpoch)return;LobbyReady=result.Ok;if(!result.Ok)LobbyError="暫時找不到房間，請重新整理。";}
   catch(Exception){if(attempt==lobbyEpoch)LobbyError="無法取得房間，請檢查網路。";}
   finally{timeout.Dispose();if(attempt==lobbyEpoch){lobbyTimeout=null;LobbyBusy=false;if(!LobbyReady)await CloseLobby();}}
  }
  async Task CloseLobby(){++lobbyEpoch;var active=lobby;lobby=null;lobbyTimeout?.Cancel();lobbyTimeout=null;LobbyReady=false;Rooms=Array.Empty<Listing>();await Cleanup(active);LobbyBusy=false;}
  public async void Connect(bool host,string code,string name){
   if(Busy||leaving||runner)return;name=Clean(name);code=(code??"").Trim();
   if(name.Length==0){Error="請輸入名字。";return;}
   if(!host&&(code.Length!=6||code.Any(c=>c<'0'||c>'9'))){Error="請輸入六位房號。";return;}
   int attempt=++epoch;Busy=true;Connected=false;IsHost=host;Error="";GuestPresent=false;guest=default;latest=null;received=guestSequence=0;
   Code=host?UnityEngine.Random.Range(100000,1000000).ToString():code;
   if(host){HostName=name;GuestName="";}else GuestName=name;
   await CloseLobby();if(attempt!=epoch)return;
   var active=new GameObject("CatDog Photon connection").AddComponent<NetworkRunner>();runner=active;active.ProvideInput=false;active.AddCallbacks(this);
   var scenes=active.gameObject.AddComponent<NetworkSceneManagerDefault>();
   var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(35));connectTimeout=timeout;
   try{
    NetworkRunner.CloudConnectionLostCurrentMode=NetworkRunner.CloudConnectionLostMode.Disabled;
    var app=Settings();var realtime=new Photon.Realtime.RealtimeClient().SetupForFusion(app);var config=NetworkProjectConfig.Global;config.AllowClientServerModesInWebGL=true;
    var result=await active.StartGame(new StartGameArgs{GameMode=host?GameMode.Host:GameMode.Client,SessionName="catdog-"+Code,PlayerCount=2,IsVisible=true,IsOpen=true,EnableClientSessionCreation=false,
     SessionProperties=host?new Dictionary<string,SessionProperty>{{"host",name}}:null,ConnectionToken=Encoding.UTF8.GetBytes(JsonUtility.ToJson(new Hello{name=name})),
     Scene=SceneRef.FromIndex(SceneManager.GetActiveScene().buildIndex),SceneManager=scenes,Config=config,CustomPhotonAppSettings=app,RealtimeClient=realtime,StartGameCancellationToken=timeout.Token});
    if(attempt!=epoch||runner!=active)return;
    if(!result.Ok){Error=Message(result.ShutdownReason);await Cleanup(active);return;}
    if(realtime.CurrentRoom!=null&&host)realtime.CurrentRoom.PlayerTtl=0;
    Connected=true;if(host)GuestChanged?.Invoke();Debug.Log("CATDOG_CONNECTED "+(host?"cat":"dog"));
   }catch(OperationCanceledException){if(attempt==epoch){Error="連線逾時，請再試一次。";await Cleanup(active);}}
   catch(Exception e){Debug.LogWarning("CATDOG_CONNECT "+e.GetType().Name);if(attempt==epoch){Error="無法連線，請檢查網路後再試。";await Cleanup(active);}}
   finally{timeout.Dispose();if(attempt==epoch){connectTimeout=null;Busy=false;}}
  }
  async Task Cleanup(NetworkRunner active){
   if(!active)return;active.RemoveCallbacks(this);if(active==runner){runner=null;Connected=false;GuestPresent=false;}
   try{await active.Shutdown();}catch(Exception e){Debug.LogWarning("CATDOG_CLEANUP "+e.GetType().Name);}finally{if(active)Destroy(active.gameObject);}
  }
  public async void Leave(){
   if(leaving)return;leaving=true;++epoch;Busy=true;connectTimeout?.Cancel();connectTimeout=null;
   var active=runner;if(active&&active.IsRunning&&IsHost&&GuestPresent)Send(guest,new Packet{type="closed",error="朋友已關閉房間。"});
   await CloseLobby();await Cleanup(active);Busy=false;Connected=false;IsHost=false;GuestPresent=false;Code="";Error="";leaving=false;Disconnected?.Invoke();
  }
  async void Fail(string error){
   if(leaving)return;leaving=true;int attempt=++epoch;Busy=true;Error=error;await Cleanup(runner);
   if(attempt!=epoch)return;Busy=false;IsHost=false;leaving=false;Disconnected?.Invoke();
  }
  void Send(PlayerRef player,Packet packet){if(!runner||!runner.IsRunning)return;packet.serial=++serial;var data=Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(packet));runner.SendReliableDataToPlayer(player,ReliableKey.FromInts(0x434154,serial,0,0),data);}
  public void Publish(RoomFrame frame){latest=frame;if(IsHost&&Connected&&GuestPresent)Send(guest,new Packet{type="state",frame=frame});}
  public void SendInput(RemoteInput input){if(!Connected||IsHost||!runner||!runner.IsRunning)return;var packet=new Packet{type="input",serial=++serial,input=input};runner.SendReliableDataToServer(ReliableKey.FromInts(0x434154,serial,0,0),Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(packet)));}
  public void OnPlayerJoined(NetworkRunner active,PlayerRef player){
   if(active!=runner||!active.IsServer||player==active.LocalPlayer)return;
   if(GuestPresent&&player==guest)return;
   Hello hello=null;try{var token=active.GetPlayerConnectionToken(player);if(token!=null&&token.Length<512)hello=JsonUtility.FromJson<Hello>(Encoding.UTF8.GetString(token));}catch(ArgumentException){}
   if(GuestPresent||hello==null||Clean(hello.name).Length==0){active.Disconnect(player);return;}
   guest=player;GuestName=Clean(hello.name);GuestPresent=true;guestSequence=0;GuestChanged?.Invoke();if(latest!=null)Publish(latest);
  }
  public void OnPlayerLeft(NetworkRunner active,PlayerRef player){if(active!=runner||!active.IsServer||!GuestPresent||player!=guest)return;GuestPresent=false;GuestName="";guest=default;guestSequence=0;GuestChanged?.Invoke();}
  public void OnReliableDataReceived(NetworkRunner active,PlayerRef sender,ReliableKey key,ReadOnlySpan<byte> bytes){
   if(active!=runner||bytes.Length>32768)return;Packet packet;try{packet=JsonConvert.DeserializeObject<Packet>(Encoding.UTF8.GetString(bytes.ToArray()));}catch(Exception){return;}if(packet==null)return;
   if(active.IsServer){if(packet.type!="input"||!GuestPresent||sender!=guest||packet.input==null||packet.input.sequence<=guestSequence)return;guestSequence=packet.input.sequence;InputReceived?.Invoke(packet.input);}
   else{if(packet.serial<=received)return;received=packet.serial;if(packet.type=="state"&&packet.frame?.state!=null){Connected=true;GuestPresent=true;Snapshot?.Invoke(packet.frame);}else if(packet.type=="closed")Fail(packet.error??"朋友已離開房間。");}
  }
  public void OnSessionListUpdated(NetworkRunner active,List<SessionInfo> sessions){if(active!=lobby)return;Rooms=sessions.Where(r=>r.IsVisible&&r.Name.StartsWith("catdog-")&&r.Name.Length==13&&r.Name.Substring(7).All(char.IsDigit)).OrderBy(r=>r.Name).Select(r=>new Listing{code=r.Name.Substring(7),name=r.Properties.TryGetValue("host",out var host)?(string)host:"朋友",count=r.PlayerCount,open=r.IsOpen&&r.PlayerCount<2}).ToArray();}
  public void OnShutdown(NetworkRunner active,ShutdownReason reason){
   if(active==lobby){lobby=null;LobbyBusy=LobbyReady=false;Rooms=Array.Empty<Listing>();LobbyError="房間清單中斷，請重新整理。";active.RemoveCallbacks(this);Destroy(active.gameObject);return;}
   if(active!=runner)return;runner=null;Connected=false;GuestPresent=false;Busy=false;if(!leaving){Error=Message(reason);IsHost=false;Disconnected?.Invoke();}if(active)Destroy(active.gameObject);
  }
  static string Message(ShutdownReason r){switch(r){case ShutdownReason.GameIsFull:return "這間已經有兩位玩家了。";case ShutdownReason.GameNotFound:return "找不到房間，請確認房號。";case ShutdownReason.GameClosed:return "朋友已關閉房間。";case ShutdownReason.GameIdAlreadyExists:return "房號重複，請再開一次。";default:return "連線中斷，請重新開房或加入。";}}
  public void OnConnectRequest(NetworkRunner r,NetworkRunnerCallbackArgs.ConnectRequest q,byte[] token){if(GuestPresent)q.Refuse();else q.Accept();}
  public void OnConnectedToServer(NetworkRunner r){}
  public void OnDisconnectedFromServer(NetworkRunner r,NetDisconnectReason reason){if(r==runner&&!leaving)Error="連線中斷，請重新加入房間。";}
  public void OnConnectFailed(NetworkRunner r,NetAddress address,NetConnectFailedReason reason){if(r==runner)Error="暫時無法連線，請再試一次。";}
  public void OnInput(NetworkRunner r,NetworkInput input){}
  public void OnInputMissing(NetworkRunner r,PlayerRef p,NetworkInput input){}
  public void OnCustomAuthenticationResponse(NetworkRunner r,Dictionary<string,object> data){}
  public void OnHostMigration(NetworkRunner r,HostMigrationToken token){}
  public void OnReliableDataProgress(NetworkRunner r,PlayerRef p,ReliableKey key,float progress){}
  public void OnSceneLoadDone(NetworkRunner r){}
  public void OnSceneLoadStart(NetworkRunner r){}
  public void OnObjectEnterAOI(NetworkRunner r,NetworkObject obj,PlayerRef p){}
  public void OnObjectExitAOI(NetworkRunner r,NetworkObject obj,PlayerRef p){}
 }
}
