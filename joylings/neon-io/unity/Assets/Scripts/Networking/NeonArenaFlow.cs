using Fusion;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Neon.Networking
{
    // Exists before the match object so a new master can finish creating a queue after a disconnect.
    public sealed class NeonArenaFlow : MonoBehaviour
    {
        public static bool Searching { get; private set; }
        static NeonArenaFlow instance;
        float stageStarted;
        string stage;
        bool monitoring, returnToLobby;
        public static bool Starting => instance && instance.monitoring;
        static NeonArena visualMatch;
        static NeonQueueProgress queueProgress;
        public static int QueueFilled
        {
            get
            {
                var match = NeonArena.Instance;
                if (!Searching || !match || match.Deadline <= 0) return 0;
                if (match.Phase != ArenaPhase.Waiting) return NeonArenaRules.PlayerSeats;
                if (match != visualMatch || queueProgress == null)
                { visualMatch = match; queueProgress = new NeonQueueProgress(match.MatchId.ToString()); }
                return queueProgress.CountAt((float)(NeonArenaRules.QueueSeconds - (match.Deadline - PhotonNetwork.Time)));
            }
        }
        public static bool Active => PhotonLauncher.SelectGameType == GameType.Arena;
        public static bool CombatBlocked => Active && (!NeonArena.Instance || NeonArena.Instance.Phase != ArenaPhase.Running);
        public static void Search()
        {
            if (Searching || PhotonNetwork.IsDisconnecting || PhotonNetwork.InRoom) return;
            if (!instance) { instance = new GameObject("Arena flow").AddComponent<NeonArenaFlow>(); DontDestroyOnLoad(instance); }
            NeonArenaRating.RecoverAbandoned();
            PhotonLauncher.SelectGameType = GameType.Arena;
            PhotonNetwork.NickName = MyPlayer.Name;
            Searching = true; instance.monitoring = true; instance.returnToLobby = false;
            instance.stage = null; instance.SetStage("connecting"); visualMatch = null; queueProgress = null;
            AudioPlayer.PlayBattleMusic(MyPlayer.ChooseBattleSong);
            PhotonLauncher.JoinTheRandomRoom();
        }
        public static void Cancel()
        {
            Searching = false;
            if (instance) instance.monitoring = false;
            RestoreLobbyMusic();
            PhotonLauncher.CancelJoin();
            PhotonNetwork.Disconnect();
        }
        public static void Disconnected()
        {
            if (Searching) RestoreLobbyMusic();
            Searching = false;
            if (instance) instance.monitoring = false;
        }
        static void RestoreLobbyMusic()
        {
            if (SceneManager.GetActiveScene().name != "Lobby" || !AudioPlayer.IsInit || AudioPlayer.CheckMusicKeyIfExit("Lobby")) return;
            AudioPlayer.StopAllMusic();
            AudioPlayer.PlayLoopMusicAtSecond_Static(GameDictionary.GetMusic("Lobby"), "Lobby", 8);
        }
        void Update()
        {
            if (returnToLobby && !PhotonNetwork.IsDisconnecting && !PhotonNetwork.InRoom)
            {
                returnToLobby = false;
                if (SceneManager.GetActiveScene().name != "Lobby" && !BattleManager.BM)
                    ScenePlayer.GoToScene_Static(MyScene.Lobby);
            }
            if (!monitoring) return;
            if (!Active) { monitoring = false; Searching = false; return; }
            if (SceneManager.GetActiveScene().name == "Battle") Searching = false;
            var match = NeonArena.Instance;
            string nextStage = !PhotonNetwork.IsReadyForGameplay ? "connecting" : !match ? "waiting-match" :
                match.Phase == ArenaPhase.Waiting ? "queue" : match.Phase == ArenaPhase.Loading ? "loading-battle" : "running";
            SetStage(nextStage);
            if (stage == "running") { monitoring = false; Searching = false; return; }
            if (Time.unscaledTime - stageStarted > NeonConnectionPolicy.StageTimeout(stage))
            {
                FailStartup("ARENA_" + stage.Replace('-', '_').ToUpperInvariant() + "_TIMEOUT", "戰場準備逾時，請重新配對。連線紀錄已保留。");
                return;
            }
            if (!PhotonNetwork.InRoom) return;
            if (PhotonNetwork.IsReadyForGameplay && PhotonNetwork.IsMasterClient && !NeonArena.Instance)
            {
                // The synchronous provider cannot spawn while a scene is being loaded.
                if (PhotonNetwork.Runner.SceneManager.IsBusy) return;
                var prefab = Resources.Load<GameObject>("Networking/NeonArena");
                if (!prefab) { FailStartup("ARENA_PREFAB_MISSING", "戰場資料未完成載入，請重新整理遊戲。"); return; }
                try { PhotonNetwork.Runner.Spawn(prefab, flags: NetworkSpawnFlags.SharedModeStateAuthMasterClient | NetworkSpawnFlags.DontDestroyOnLoad); }
                catch (System.Exception error)
                {
                    NeonConnectionDiagnostics.Step("match-spawn-exception", error.GetType().Name);
                    FailStartup("ARENA_SPAWN_FAILED", "戰場建立失敗，請重新配對。連線紀錄已保留。");
                }
            }
        }
        void SetStage(string next)
        {
            if (stage == next) return;
            stage = next; stageStarted = Time.unscaledTime;
            NeonConnectionDiagnostics.Step(next);
        }
        public static void FailStartup(string code, string message)
        {
            PhotonNetwork.LastError = NeonConnectionDiagnostics.Fail(code, message);
            if (instance) { instance.monitoring = false; instance.returnToLobby = true; }
            Searching = false;
            RestoreLobbyMusic();
            PhotonLauncher.CancelJoin();
            PhotonNetwork.Disconnect();
        }
    }
}
