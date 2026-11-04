using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
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
        public string type, phase, token, ink;
        public int round, seq, member, avatar, deadline, winner, card=-1, stamp;
        public int promptVersion;public int[] deckHistory;
        public int showAt;public int[] showOrder;public bool wallOpen;
        public bool final, done, rename;
        public Portrait[] people;
        public SeatCopy[] seats;
    }
    [Serializable] public class SeatCopy {
        public int peer,id,avatar,revision,playedRound;
        public string token,ink;
        public bool online,drawn,done;
    }
    [Serializable] public class Portrait {
        public int id, avatar, revision; public bool online, drawn, done, participating;
    }
    public sealed class StudioLink : MonoBehaviour, INetworkRunnerCallbacks {
        const string Session = "shape-studio-classroom";
        public bool Host { get; private set; }
        public bool WantsHost { get; private set; }
        public bool Connected { get; private set; }
        public bool Busy { get; private set; }
        public event Action Changed, Opened;
        public event Action<string> Closed;
        public event Action<int> Departed;
        public event Action<int,Wire> Received;
        public event Action<Wire> Promoted;
        public event Func<Wire> SaveRoom;
        public event Action TeacherChanged;
        public int Now => peer?.RealtimePeer.ServerTimeInMilliseconds ?? Environment.TickCount;
        NetworkRunner runner;
        RealtimeClient peer;
        readonly HashSet<int> knownActors=new HashSet<int>();
        bool closing;
        int teacher;
        float nextPoll,nextOffer,missingSince;
        const string CandidateKey="studio.open", LeaderKey="studio.lead";
        const string PeerKey="studio.peer";

        // Server-assigned Photon actor numbers increase on each entry and are never
        // reused in a live room. They identify both the election order and recipient.
        Player Latest(string key) => peer.CurrentRoom.Players.Values
            .Where(p=>!p.IsInactive && p.CustomProperties.ContainsKey(key) && p.CustomProperties[key] is bool flag && flag)
            .OrderByDescending(p=>p.ActorNumber).FirstOrDefault();
        public bool Present(int actor) => peer?.CurrentRoom!=null && peer.CurrentRoom.Players.TryGetValue(actor,out var player) && !player.IsInactive;
        void SetFlag(string key){
            if(!peer.LocalPlayer.SetCustomProperties(new Photon.Client.PhotonHashtable{{key,true}}))
                throw new InvalidOperationException("Cannot publish classroom role");
        }
        void Promote(Wire saved){
            try{SetFlag(LeaderKey);}catch(Exception){_ = Close("接手失敗，請重新開房。");return;}
            Host=true;teacher=peer.LocalPlayer.ActorNumber;Promoted?.Invoke(saved);
        }
        void Update(){
            if(!Connected || closing || peer?.CurrentRoom==null || Time.unscaledTime<nextPoll)return;
            nextPoll=Time.unscaledTime+.2f;
            var lead=Latest(LeaderKey);var candidate=Latest(CandidateKey);
            int selected=lead?.ActorNumber??0,localActor=peer.LocalPlayer.ActorNumber;
            foreach(int actor in knownActors.Where(id=>!Present(id)).ToArray()){
                knownActors.Remove(actor);if(Host)Departed?.Invoke(actor);
            }
            foreach(var actor in peer.CurrentRoom.Players.Keys)if(Present(actor))knownActors.Add(actor);
            if(WantsHost && lead!=null && lead.ActorNumber>localActor){
                _ = Close("新出題者已接手，你已離開教室。");return;
            }
            if(Host){
                if(candidate!=null && candidate.ActorNumber>localActor && Time.unscaledTime>=nextOffer){
                    var saved=SaveRoom?.Invoke();
                    if(saved!=null){Send(candidate.ActorNumber,saved);nextOffer=Time.unscaledTime+1.5f;}
                }
                return;
            }
            if(WantsHost){
                // Only the elected new opener can receive the private original.
                if(lead==null && candidate?.ActorNumber==localActor &&
                    (runner.IsSharedModeMasterClient || Time.unscaledTime-missingSince>3))Promote(null);
                if(!Host && Time.unscaledTime-missingSince>45)_ = Close("尚未收到教室資料，請重新開房。");
                return;
            }
            if(lead!=null){
                missingSince=Time.unscaledTime;
                if(teacher!=selected){teacher=selected;TeacherChanged?.Invoke();}
            }else if(Time.unscaledTime-missingSince>5){
                _ = Close("出題者已離開，教室已關閉。");
            }
        }
        public async void Connect(bool host) {
            if(Busy || runner) return;
            Busy=true;Host=false;WantsHost=host;teacher=0;knownActors.Clear();nextPoll=nextOffer=0;Changed?.Invoke();
            var active=new GameObject("Studio transport").AddComponent<NetworkRunner>();
            active.gameObject.AddComponent<StudioMailbox>().Link=this;
            runner=active;active.ProvideInput=false;active.AddCallbacks(this);
            var timer=new CancellationTokenSource(TimeSpan.FromSeconds(35));
            try {
                var app=Fusion.Photon.Realtime.PhotonAppSettings.Global.AppSettings.GetCopy();
                app.FixedRegion="asia";app.AppVersion="shape-studio-v7";
                peer=new RealtimeClient().SetupForFusion(app);
                NetworkRunner.CloudConnectionLostCurrentMode=NetworkRunner.CloudConnectionLostMode.Disabled;
                var config=NetworkProjectConfig.Global; config.AllowClientServerModesInWebGL=true;
                var result=await active.StartGame(new StartGameArgs {
                    GameMode=GameMode.Shared,SessionName=Session,PlayerCount=22,
                    EnableClientSessionCreation=host, IsVisible=false, IsOpen=true, Config=config,
                    Scene=SceneRef.FromIndex(SceneManager.GetActiveScene().buildIndex),
                    SceneManager=active.gameObject.AddComponent<NetworkSceneManagerDefault>(),
                    RealtimeClient=peer,CustomPhotonAppSettings=app,StartGameCancellationToken=timer.Token
                });
                if(runner!=active)return;
                if(!result.Ok){await Close(Error(result.ShutdownReason));return;}
                peer.LocalPlayer.SetCustomProperties(new Photon.Client.PhotonHashtable{{PeerKey,active.LocalPlayer.RawEncoded}});
                if(host)SetFlag(CandidateKey);
                missingSince=Time.unscaledTime;
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
            Host=WantsHost=false;Busy=false;closing=false;peer=null;Closed?.Invoke(notice);Changed?.Invoke();
        }
        const int MaxTransfer=4*1024*1024;
        PlayerRef PeerOf(Player actor) => actor!=null && actor.CustomProperties.ContainsKey(PeerKey) &&
            actor.CustomProperties[PeerKey] is int id ? PlayerRef.FromEncoded(id) : PlayerRef.None;
        public void Send(int to,Wire message) {
            if(!runner || !runner.IsRunning)return;
            byte[] bytes=Encoding.UTF8.GetBytes(JsonUtility.ToJson(message));
            int target=to==0?teacher:to;
            if(target==0 || target==peer.LocalPlayer.ActorNumber || !Present(target))return;
            var recipient=PeerOf(peer.CurrentRoom.Players[target]);
            if(recipient!=PlayerRef.None)StudioMailbox.Rpc_Paper(runner,recipient,peer.LocalPlayer.ActorNumber,bytes);
        }
        public void Broadcast(Wire message) {
            if(!Host || !runner || !runner.IsRunning)return;
            foreach(var p in peer.CurrentRoom.Players.Keys)if(p!=peer.LocalPlayer.ActorNumber)Send(p,message);
        }
        public void ReceivePacket(int sender,PlayerRef source,byte[] bytes){
            if(!Connected || peer?.CurrentRoom==null || !Present(sender) || bytes==null || bytes.Length>MaxTransfer)return;
            int lead=Latest(LeaderKey)?.ActorNumber??0;
            if(PeerOf(peer.CurrentRoom.Players[sender])!=source || source==PlayerRef.None)return;
            Wire msg;try{msg=JsonUtility.FromJson<Wire>(Encoding.UTF8.GetString(bytes));}catch(ArgumentException){return;}
            if(msg==null)return;
            if(msg.type=="handoff"){
                if(!Host && WantsHost && sender==lead && Latest(CandidateKey)?.ActorNumber==peer.LocalPlayer.ActorNumber)Promote(msg);
                return;
            }
            if(bytes.Length>65536 || (!Host && (WantsHost || sender!=lead)))return;
            if(!Host && teacher!=lead){teacher=lead;TeacherChanged?.Invoke();}
            Received?.Invoke(sender,msg);
        }
        public void OnReliableDataReceived(NetworkRunner r,PlayerRef p,ReliableKey key,ReadOnlySpan<byte> bytes){}
        public void OnPlayerLeft(NetworkRunner r,PlayerRef p){}
        public void OnShutdown(NetworkRunner r,ShutdownReason reason) {
            // StartGame reports the precise error itself while connecting.
            if(r!=runner || !Connected)return;
            r.RemoveCallbacks(this);runner=null;peer=null;Connected=false;Host=WantsHost=false;Busy=false;
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
