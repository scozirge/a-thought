using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Fusion;
using Fusion.Sockets;
using UnityEngine;
using UnityEngine.SceneManagement;
using Starbro.NeonIO;

namespace Neon.Networking
{
    public sealed class NeonFusionRuntime : MonoBehaviour, INetworkRunnerCallbacks
    {
        public NetworkRunner Runner { get; private set; }
        public NeonPlayerSession LocalSession { get; internal set; }
        public bool IsConnecting { get; private set; }
        public bool IsDisconnecting { get; private set; }
        public bool IsReadyForGameplay { get { return joined && !IsDisconnecting && LocalSession && LocalSession.Object && LocalSession.Object.IsValid; } }
        readonly Dictionary<int, PhotonView> views = new Dictionary<int, PhotonView>();
        readonly Dictionary<int, Player> viewOwners = new Dictionary<int, Player>();
        readonly Dictionary<int, RetiredView> retiredViews = new Dictionary<int, RetiredView>();
        struct RetiredView { public Player owner; public float expires; }
        readonly Dictionary<string, GameObject> prefabs = new Dictionary<string, GameObject>();
        readonly HashSet<int> notifiedPlayers = new HashSet<int>();
        CancellationTokenSource connectionCancellation;
        Task shutdownTask = Task.CompletedTask;
        int generation;
        int previousMaster;
        float joinStartedAt;
        const float ConnectionTimeoutSeconds = 40f;
        bool joined;
        bool intentionalDisconnect;
        bool leavingRoom;
        bool connectNotificationPending;
        string pendingScene;
        void Awake()
        {
            if (PhotonNetwork.Runtime && PhotonNetwork.Runtime != this) { Destroy(gameObject); return; }
            PhotonNetwork.Runtime = this;
            DontDestroyOnLoad(gameObject);
            var catalog = Resources.Load<NeonPrefabCatalog>("Networking/NeonPrefabCatalog");
            if (catalog) foreach (var prefab in catalog.Prefabs) if (prefab) prefabs[prefab.name] = prefab;
        }
        public void Connect()
        {
            if (IsConnecting || connectNotificationPending) return;
            connectNotificationPending = true;
            StartCoroutine(ConnectedNextFrame(generation));
        }
        IEnumerator ConnectedNextFrame(int expectedGeneration)
        {
            yield return null;
            if (expectedGeneration != generation) yield break;
            connectNotificationPending = false;
            PhotonNetwork.Connected = true;
            PhotonNetwork.Dispatch(x => x.OnConnectedToMaster());
        }
        public void Join(string sessionName = null, int maximumPlayers = 0)
        {
            if (IsConnecting || (Runner && Runner.IsRunning)) return;
            if (string.IsNullOrEmpty(sessionName) && !string.IsNullOrEmpty(NeonWebBridge.ValidationRoom))
                sessionName = NeonWebBridge.ValidationRoom + "-" + (int)PhotonLauncher.SelectGameType;
            if (string.IsNullOrEmpty(sessionName))
            {
                string[] args = Environment.GetCommandLineArgs();
                for (int i = 0; i + 1 < args.Length; i++) if (args[i] == "-neonRoom") { sessionName = args[i + 1]; break; }
            }
            _ = JoinAsync(sessionName, maximumPlayers);
        }
        async Task JoinAsync(string sessionName, int maximumPlayers)
        {
            IsConnecting = true; joined = false; intentionalDisconnect = false; leavingRoom = false;
            connectNotificationPending = false;
            PhotonNetwork.LastError = "";
            int attempt = ++generation;
            joinStartedAt = UnityEngine.Time.realtimeSinceStartup;
            // Web has no managed Timer callbacks. Update drives this deadline on
            // the Unity thread; each attempt owns its token until its finally block.
            var cancellation = new CancellationTokenSource();
            connectionCancellation = cancellation;
            NetworkRunner runner = null;
            try
            {
                await shutdownTask;
                if (attempt != generation || !this) return;
                cancellation.Token.ThrowIfCancellationRequested();
                IsDisconnecting = false;
                var runnerObject = new GameObject("Neon Fusion Runner");
                DontDestroyOnLoad(runnerObject);
                runner = runnerObject.AddComponent<NetworkRunner>();
                Runner = runner;
                runner.AddCallbacks(this);
                runner.ProvideInput = false;
                var sceneManager = runnerObject.AddComponent<NetworkSceneManagerDefault>();
                var settings = Fusion.Photon.Realtime.PhotonAppSettings.Global.AppSettings.GetCopy();
                settings.AppVersion = "neon-io/binary-2/" + PhotonNetwork.GameVersion;
                settings.FixedRegion = PhotonNetwork.PhotonServerSettings.AppSettings.FixedRegion.ToLowerInvariant();
                int mode = (int)PhotonLauncher.SelectGameType;
                if (maximumPlayers <= 0) maximumPlayers = PhotonLauncher.SelectGameType == GameType.Challenge ? 2 : 10;
                var result = await runner.StartGame(new StartGameArgs
                {
                    GameMode = GameMode.Shared,
                    SessionName = sessionName,
                    PlayerCount = maximumPlayers,
                    CustomPhotonAppSettings = settings,
                    CustomLobbyName = "neon-io-fusion",
                    SessionProperties = new Dictionary<string, SessionProperty> { { "mode", mode }, { "schema", 2 } },
                    SceneManager = sceneManager,
                    EnableClientSessionCreation = true,
                    StartGameCancellationToken = cancellation.Token,
                    IsOpen = true,
                    IsVisible = string.IsNullOrEmpty(NeonWebBridge.ValidationRoom)
                });
                if (attempt != generation || !this) { await DisposeRunner(runner); return; }
                if (!result.Ok) throw new InvalidOperationException("Fusion connection failed: " + result.ShutdownReason);
                // A late join can already be loading the room's Battle scene when StartGame completes.
                // The default Fusion provider intentionally refuses synchronous spawns during this interval.
                while (runner.SceneManager.IsBusy)
                {
                    cancellation.Token.ThrowIfCancellationRequested();
                    if (!runner.IsRunning || attempt != generation) throw new OperationCanceledException();
                    await Task.Yield();
                }
                foreach (var player in runner.ActivePlayers) PhotonNetwork.GetPlayer(player);
                var sessionPrefab = Resources.Load<GameObject>("Networking/NeonPlayerSession");
                if (!sessionPrefab) throw new InvalidOperationException("Missing baked Networking/NeonPlayerSession prefab. Run Neon migration preparation.");
                var sessionObject = runner.Spawn(sessionPrefab, flags: NetworkSpawnFlags.DontDestroyOnLoad | NetworkSpawnFlags.SharedModeStateAuthLocalPlayer);
                LocalSession = sessionObject.GetComponent<NeonPlayerSession>();
                LocalSession.Publish();
                // Fusion retains this token for startup/shutdown. Its deadline belongs
                // only to connection establishment, never to an already playable session.
                cancellation.Token.ThrowIfCancellationRequested();
                previousMaster = runner.GetMasterClient().RawEncoded;
                PhotonNetwork.Connected = true;
                joined = true; IsConnecting = false;
                Debug.Log("NEON_FUSION_JOINED mode=" + PhotonLauncher.SelectGameType + " room=" + runner.SessionInfo.Name + " region=" + runner.SessionInfo.Region);
                PhotonNetwork.Dispatch(x => x.OnJoinedRoom());
                foreach (var player in PhotonNetwork.PlayerList) if (!player.IsLocal && player.Session) NotifySessionReady(player);
                if (!string.IsNullOrEmpty(pendingScene)) { string scene = pendingScene; pendingScene = null; LoadLevel(scene); }
            }
            catch (Exception error)
            {
                if (attempt != generation) return;
                PhotonNetwork.LastError = error is OperationCanceledException ? "連線逾時，請重試。" : error.Message;
                Debug.LogWarning("NEON_FUSION_CONNECT_FAILED " + PhotonNetwork.LastError);
                intentionalDisconnect = true;
                IsDisconnecting = true;
                shutdownTask = DisposeRunner(runner);
                await shutdownTask;
                if (attempt != generation || !this) return;
                if (Runner == runner) Runner = null;
                LocalSession = null;
                views.Clear(); viewOwners.Clear(); retiredViews.Clear(); notifiedPlayers.Clear();
                PhotonNetwork.ResetRoom();
                IsConnecting = false; IsDisconnecting = false;
                PhotonNetwork.Dispatch(x => x.OnDisconnected(DisconnectCause.Exception));
            }
            finally
            {
                if (ReferenceEquals(connectionCancellation, cancellation)) connectionCancellation = null;
                cancellation.Dispose();
                if (attempt == generation) IsConnecting = false;
            }
        }
        static async Task DisposeRunner(NetworkRunner runner)
        {
            if (!runner) return;
            try { await runner.Shutdown(); } catch (Exception error) { Debug.LogWarning(error.Message); }
            if (runner) Destroy(runner.gameObject);
        }
        public async void Disconnect(bool leaveRoom)
        {
            if (intentionalDisconnect && !Runner) return;
            intentionalDisconnect = true; leavingRoom = leaveRoom; joined = false;
            IsDisconnecting = true;
            int disconnectGeneration = ++generation;
            connectNotificationPending = false;
            connectionCancellation?.Cancel();
            var old = Runner;
            Runner = null; LocalSession = null; IsConnecting = false; pendingScene = null;
            views.Clear(); viewOwners.Clear(); retiredViews.Clear(); notifiedPlayers.Clear(); PhotonNetwork.ResetRoom();
            shutdownTask = DisposeRunner(old);
            await shutdownTask;
            if (!this || generation != disconnectGeneration) return;
            IsDisconnecting = false;
            if (leaveRoom) PhotonNetwork.Dispatch(x => x.OnLeftRoom());
            PhotonNetwork.Dispatch(x => x.OnDisconnected(DisconnectCause.DisconnectByClientLogic));
        }
        void Update()
        {
            CheckConnectionDeadline(UnityEngine.Time.realtimeSinceStartup);
            if (!Runner || !Runner.IsRunning || !joined) return;
            int master = Runner.GetMasterClient().RawEncoded;
            if (master != previousMaster)
            {
                previousMaster = master;
                foreach (var pair in views) if (pair.Value && pair.Value.IsReady) viewOwners[pair.Key] = pair.Value.Owner;
                Debug.Log("NEON_FUSION_MASTER_CHANGED actor=" + master + " local=" + Runner.IsSharedModeMasterClient + " entities=" + views.Count);
                PhotonNetwork.Dispatch(x => x.OnMasterClientSwitched(PhotonNetwork.MasterClient));
            }
        }
        internal void CheckConnectionDeadline(float now)
        {
            if (IsConnecting && connectionCancellation != null && !connectionCancellation.IsCancellationRequested &&
                now - joinStartedAt >= ConnectionTimeoutSeconds)
                connectionCancellation.Cancel();
        }
        void OnDestroy()
        {
            ++generation;
            connectionCancellation?.Cancel();
            if (PhotonNetwork.Runtime == this) PhotonNetwork.Runtime = null;
        }
        public void LoadLevel(string sceneName)
        {
            if (!Runner || !Runner.IsRunning) { pendingScene = sceneName; return; }
            if (!Runner.IsSharedModeMasterClient) return;
            for (int i = 0; i < SceneManager.sceneCountInBuildSettings; i++)
            {
                string path = SceneUtility.GetScenePathByBuildIndex(i);
                if (System.IO.Path.GetFileNameWithoutExtension(path) != sceneName) continue;
                if (sceneName == "Challenge") Runner.SessionInfo.IsOpen = false;
                Runner.LoadScene(SceneRef.FromIndex(i), LoadSceneMode.Single);
                return;
            }
            Debug.LogError("Scene missing from Build Settings: " + sceneName);
        }
        public GameObject Spawn(string prefabName, Vector3 position, Quaternion rotation, bool shared)
        {
            if (!Runner || !Runner.IsRunning) throw new InvalidOperationException("Cannot spawn before joining a Fusion room.");
            if (shared && !Runner.IsSharedModeMasterClient) return null;
            if (!prefabs.TryGetValue(prefabName, out var prefab)) prefab = Resources.Load<GameObject>(prefabName);
            if (!prefab || !prefab.GetComponent<NetworkObject>()) throw new InvalidOperationException("Unregistered Fusion prefab: " + prefabName);
            var spawned = Runner.Spawn(prefab, position, rotation, flags: shared ? NetworkSpawnFlags.SharedModeStateAuthMasterClient : NetworkSpawnFlags.SharedModeStateAuthLocalPlayer);
            return spawned.gameObject;
        }
        internal void Register(PhotonView view) { views[view.ViewID] = view; viewOwners[view.ViewID] = view.Owner; }
        internal void Unregister(PhotonView view)
        {
            int id = 0;
            foreach (var pair in views) if (pair.Value == view) { id = pair.Key; break; }
            if (id == 0) return;
            if (viewOwners.TryGetValue(id, out var owner)) retiredViews[id] = new RetiredView { owner = owner, expires = UnityEngine.Time.unscaledTime + 2f };
            views.Remove(id); viewOwners.Remove(id);
            // Keep only the short acknowledgement window, never an unbounded object history.
            foreach (int expired in retiredViews.Where(x => x.Value.expires < UnityEngine.Time.unscaledTime).Select(x => x.Key).ToArray()) retiredViews.Remove(expired);
        }
        internal Player FindViewOwner(int id)
        {
            if (views.TryGetValue(id, out var view) && view && view.IsReady) return view.Owner;
            return retiredViews.TryGetValue(id, out var retired) && retired.expires >= UnityEngine.Time.unscaledTime ? retired.owner : null;
        }
        internal PhotonView FindView(int id) { views.TryGetValue(id, out var view); return view; }
        public void PublishLocalProperties() { if (LocalSession && LocalSession.Object && LocalSession.Object.IsValid) LocalSession.Publish(); }
        internal void NotifySessionReady(Player player)
        {
            if (!joined || player.IsLocal || !notifiedPlayers.Add(player.ActorNumber)) return;
            PhotonNetwork.Dispatch(x => x.OnPlayerEnteredRoom(player));
        }
        public void OnPlayerJoined(NetworkRunner runner, PlayerRef player) { if (Runner == runner) PhotonNetwork.GetPlayer(player); }
        public void OnPlayerLeft(NetworkRunner runner, PlayerRef player)
        {
            if (Runner != runner) return;
            var leaving = PhotonNetwork.GetPlayer(player);
            PhotonNetwork.Players.Remove(player.RawEncoded); notifiedPlayers.Remove(player.RawEncoded);
            PhotonNetwork.Dispatch(x => x.OnPlayerLeftRoom(leaving));
        }
        public async void OnShutdown(NetworkRunner runner, ShutdownReason reason)
        {
            Debug.Log("NEON_FUSION_SHUTDOWN reason=" + reason + " current=" + (Runner == runner) +
                " intentional=" + intentionalDisconnect + " joining=" + IsConnecting +
                " startupCancelled=" + (connectionCancellation != null && connectionCancellation.IsCancellationRequested) +
                " ageSeconds=" + (UnityEngine.Time.realtimeSinceStartup - joinStartedAt).ToString("F2", System.Globalization.CultureInfo.InvariantCulture) +
                " entities=" + views.Count);
            // StartGame owns its failure path. Reporting here as well would dispatch disconnect twice.
            if (Runner != runner || intentionalDisconnect || IsConnecting) return;
            int shutdownGeneration = ++generation;
            IsDisconnecting = true;
            Runner = null; LocalSession = null; joined = false; IsConnecting = false;
            views.Clear(); viewOwners.Clear(); retiredViews.Clear(); notifiedPlayers.Clear(); PhotonNetwork.ResetRoom();
            PhotonNetwork.LastError = "連線已中斷：" + reason;
            shutdownTask = CleanupStoppedRunner(runner);
            await shutdownTask;
            if (!this || generation != shutdownGeneration) return;
            IsDisconnecting = false;
            PhotonNetwork.Dispatch(x => x.OnDisconnected(DisconnectCause.ServerTimeout));
        }
        static async Task CleanupStoppedRunner(NetworkRunner runner)
        {
            // Let Fusion finish dispatching shutdown before destroying its persistent GameObject.
            await Task.Yield();
            if (runner) Destroy(runner.gameObject);
        }
        public void OnDisconnectedFromServer(NetworkRunner runner, NetDisconnectReason reason) { Debug.LogWarning("NEON_FUSION_DISCONNECTED " + reason); }
        public void OnConnectRequest(NetworkRunner runner, NetworkRunnerCallbackArgs.ConnectRequest request, byte[] token) { request.Accept(); }
        public void OnConnectFailed(NetworkRunner runner, NetAddress address, NetConnectFailedReason reason) { }
        public void OnConnectedToServer(NetworkRunner runner) { }
        public void OnInput(NetworkRunner runner, NetworkInput input) { }
        public void OnInputMissing(NetworkRunner runner, PlayerRef player, NetworkInput input) { }
        public void OnSessionListUpdated(NetworkRunner runner, List<SessionInfo> list) { }
        public void OnCustomAuthenticationResponse(NetworkRunner runner, Dictionary<string, object> data) { }
        public void OnHostMigration(NetworkRunner runner, HostMigrationToken token) { }
        public void OnReliableDataReceived(NetworkRunner runner, PlayerRef player, ReliableKey key, ReadOnlySpan<byte> data) { }
        public void OnReliableDataProgress(NetworkRunner runner, PlayerRef player, ReliableKey key, float progress) { }
        public void OnObjectExitAOI(NetworkRunner runner, NetworkObject obj, PlayerRef player) { }
        public void OnObjectEnterAOI(NetworkRunner runner, NetworkObject obj, PlayerRef player) { }
        public void OnSceneLoadStart(NetworkRunner runner) { }
        public void OnSceneLoadDone(NetworkRunner runner) { Debug.Log("NEON_FUSION_SCENE_READY " + SceneManager.GetActiveScene().name); }
    }
}
