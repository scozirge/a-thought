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
        float started;
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
            PhotonLauncher.SelectGameType = GameType.Arena;
            PhotonNetwork.NickName = MyPlayer.Name;
            Searching = true; instance.started = Time.unscaledTime; visualMatch = null; queueProgress = null;
            PhotonLauncher.JoinTheRandomRoom();
        }
        public static void Cancel()
        {
            Searching = false;
            PhotonLauncher.CancelJoin();
            PhotonNetwork.Disconnect();
        }
        public static void Disconnected() { Searching = false; }
        void Update()
        {
            if (!Searching) return;
            if (SceneManager.GetActiveScene().name == "Battle") { Searching = false; return; }
            if (!PhotonNetwork.InRoom)
            {
                if (Time.unscaledTime - started > 45) { Cancel(); PopupUI.ShowClickCancel("配對連線逾時，請重試。 / Connection timed out. Please retry.", null); }
                return;
            }
            if (PhotonNetwork.IsReadyForGameplay && PhotonNetwork.IsMasterClient && !NeonArena.Instance)
            {
                var prefab = Resources.Load<GameObject>("Networking/NeonArena");
                if (prefab) PhotonNetwork.Runner.Spawn(prefab, flags: NetworkSpawnFlags.SharedModeStateAuthMasterClient | NetworkSpawnFlags.DontDestroyOnLoad);
            }
        }
    }
}
