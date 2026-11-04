using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Fusion;
using Fusion.Matchmaking;
using Fusion.Sockets;
using Photon.Realtime;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace ShapeStudio {
    [Serializable] public class Wire {
        public string type, phase, token, ink, title;
        public int round, seq, member, avatar, deadline, winner, card=-1, stamp;
        public bool final;
        public Portrait[] people;
    }
    [Serializable] public class Portrait {
        public int id, avatar, revision; public bool online, drawn;
    }
    public sealed class StudioLink : MonoBehaviour, INetworkRunnerCallbacks {
        const string Session = "shape-studio-classroom";
        public bool Host { get; private set; }
        public bool Connected { get; private set; }
        public bool Busy { get; private set; }
        public event Action Changed, Opened;
        public event Action<string> Closed;
        public event Action<PlayerRef> Departed;
        public event Action<PlayerRef,Wire> Received;
        public int Now => peer?.RealtimePeer.ServerTimeInMilliseconds ?? Environment.TickCount;
        NetworkRunner runner;
        RealtimeClient peer;
        int sequence;
        bool closing;
        public async void Connect(bool host) {
            if(Busy || runner) return;
            Busy=true; Host=host; Changed?.Invoke();
            var active=new GameObject("Studio transport").AddComponent<NetworkRunner>();
            runner=active;active.ProvideInput=false;active.AddCallbacks(this);
            var timer=new CancellationTokenSource(TimeSpan.FromSeconds(35));
            try {
                var app=Fusion.Photon.Realtime.PhotonAppSettings.Global.AppSettings.GetCopy();
                app.FixedRegion="asia";app.AppVersion="shape-studio-v1";
                peer=new RealtimeClient().SetupForFusion(app);
                NetworkRunner.CloudConnectionLostCurrentMode=NetworkRunner.CloudConnectionLostMode.Disabled;
                var config=NetworkProjectConfig.Global; config.AllowClientServerModesInWebGL=true;
                var result=await active.StartGame(new StartGameArgs {
                    GameMode=host?GameMode.Host:GameMode.Client,SessionName=Session,PlayerCount=21,
                    EnableClientSessionCreation=false, IsVisible=false, IsOpen=true, Config=config,
                    Scene=SceneRef.FromIndex(SceneManager.GetActiveScene().buildIndex),
                    SceneManager=active.gameObject.AddComponent<NetworkSceneManagerDefault>(),
                    RealtimeClient=peer,CustomPhotonAppSettings=app,StartGameCancellationToken=timer.Token
                });
                if(runner!=active)return;
                if(!result.Ok){await Close(Error(result.ShutdownReason));return;}
                if(host && peer.CurrentRoom!=null)peer.CurrentRoom.PlayerTtl=0;
                Connected=true; Busy=false;Opened?.Invoke();Changed?.Invoke();
            } catch(Exception ex) {
                Debug.LogWarning("Studio connection: "+ex.GetType().Name);
                if(runner==active)await Close("連線失敗，請再試一次。");
            } finally {timer.Dispose();}
        }
        static string Error(ShutdownReason reason) {
            switch(reason){
                case ShutdownReason.GameNotFound:return "還沒有人開房。";
                case ShutdownReason.GameIdAlreadyExists:return "已有人開房，請按「加入」。";
                case ShutdownReason.GameIsFull:return "教室已滿，請稍後再加入。";
                case ShutdownReason.GameClosed:return "教室已關閉。";
                default:return "連線中斷，請重新加入。";
            }
        }
        public async Task Close(string notice) {
            if(closing)return;
            closing=true;Busy=true;Connected=false;
            var active=runner;runner=null;
            if(active){active.RemoveCallbacks(this);try{await active.Shutdown();}catch(Exception){}if(active)Destroy(active.gameObject);}
            Host=false;Busy=false;closing=false;peer=null;Closed?.Invoke(notice);Changed?.Invoke();
        }
        public void Send(PlayerRef to,Wire message) {
            if(!runner || !runner.IsRunning)return;
            var key=ReliableKey.FromInts(0x504150,++sequence,0,0);
            byte[] bytes=Encoding.UTF8.GetBytes(JsonUtility.ToJson(message));
            if(Host)runner.SendReliableDataToPlayer(to,key,bytes);
            else runner.SendReliableDataToServer(key,bytes);
        }
        public void Broadcast(Wire message) {
            if(!Host || !runner || !runner.IsRunning)return;
            foreach(var p in runner.ActivePlayers)if(p!=runner.LocalPlayer)Send(p,message);
        }
        public void OnReliableDataReceived(NetworkRunner r,PlayerRef sender,ReliableKey key,ReadOnlySpan<byte> bytes){
            if(r!=runner || bytes.Length>18000)return;
            Wire msg;try{msg=JsonUtility.FromJson<Wire>(Encoding.UTF8.GetString(bytes.ToArray()));}catch(ArgumentException){return;}
            if(msg!=null)Received?.Invoke(sender,msg);
        }
        public void OnPlayerLeft(NetworkRunner r,PlayerRef p){if(r==runner && Host && p!=r.LocalPlayer)Departed?.Invoke(p);}
        public void OnShutdown(NetworkRunner r,ShutdownReason reason) {
            // StartGame reports the precise error itself while connecting.
            if(r!=runner || !Connected)return;
            r.RemoveCallbacks(this);runner=null;peer=null;Connected=false;Host=false;Busy=false;
            Destroy(r.gameObject);Closed?.Invoke(reason==ShutdownReason.Ok?"房主已關房。":Error(reason));Changed?.Invoke();
        }
        public void OnConnectRequest(NetworkRunner r,NetworkRunnerCallbackArgs.ConnectRequest request,byte[] token){request.Accept();}
        public void OnPlayerJoined(NetworkRunner r,PlayerRef p){}
        public void OnConnectedToServer(NetworkRunner r){}
        public void OnDisconnectedFromServer(NetworkRunner r,NetDisconnectReason reason){}
        public void OnConnectFailed(NetworkRunner r,NetAddress address,NetConnectFailedReason reason){}
        public void OnInput(NetworkRunner r,NetworkInput input){}
        public void OnInputMissing(NetworkRunner r,PlayerRef p,NetworkInput input){}
        public void OnCustomAuthenticationResponse(NetworkRunner r,Dictionary<string,object> data){}
        public void OnHostMigration(NetworkRunner r,HostMigrationToken token){}
        public void OnReliableDataProgress(NetworkRunner r,PlayerRef p,ReliableKey key,float progress){}
        public void OnSceneLoadDone(NetworkRunner r){}
        public void OnSceneLoadStart(NetworkRunner r){}
        public void OnObjectEnterAOI(NetworkRunner r,NetworkObject obj,PlayerRef p){}
        public void OnObjectExitAOI(NetworkRunner r,NetworkObject obj,PlayerRef p){}
        public void OnSessionListUpdated(NetworkRunner r,List<SessionInfo> sessions){}
    }
}
