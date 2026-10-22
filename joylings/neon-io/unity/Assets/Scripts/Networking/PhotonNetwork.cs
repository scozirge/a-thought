using System;
using System.Collections.Generic;
using System.Linq;
using Fusion;
using UnityEngine;

namespace Neon.Networking
{
    public static class PhotonNetwork
    {
        internal static NeonFusionRuntime Runtime;
        internal static readonly Dictionary<int, Player> Players = new Dictionary<int, Player>();
        static readonly HashSet<MonoBehaviourPunCallbacks> Callbacks = new HashSet<MonoBehaviourPunCallbacks>();
        static Player local = NewPlayer(0);
        internal static bool Connected;
        public static NetworkRunner Runner { get { return Runtime ? Runtime.Runner : null; } }
        public static bool IsConnected { get { return Connected || InRoom || IsDisconnecting; } }
        public static bool IsDisconnecting { get { return Runtime && Runtime.IsDisconnecting; } }
        public static bool IsReadyForGameplay { get { return Runtime && Runtime.IsReadyForGameplay; } }
        public static bool InRoom { get { return Runner && Runner.IsRunning; } }
        public static bool IsMasterClient { get { return InRoom && Runner.IsSharedModeMasterClient; } }
        public static bool AutomaticallySyncScene { get; set; } = true;
        public static string GameVersion { get; set; } = "neon-fusion-1";
        public static string CloudRegion { get { return InRoom ? Runner.SessionInfo.Region : PhotonServerSettings.AppSettings.FixedRegion; } }
        public static string NickName { get { return local.NickName; } set { local.NickName = string.IsNullOrWhiteSpace(value) ? "Player" : value.Substring(0, Math.Min(value.Length, 48)); if (Runtime) Runtime.PublishLocalProperties(); } }
        public static Player LocalPlayer { get { return local; } }
        public static Player MasterClient { get { return InRoom ? GetPlayer(Runner.GetMasterClient()) : local; } }
        public static Player[] PlayerList { get { return Players.Values.ToArray(); } }
        public static Room CurrentRoom { get; } = new Room();
        public static NetworkEvents NetworkingClient { get; } = new NetworkEvents();
        public static LegacyServerSettings PhotonServerSettings { get; } = new LegacyServerSettings();
        public static double Time { get { return InRoom ? Runner.SimulationTime : UnityEngine.Time.realtimeSinceStartupAsDouble; } }
        public static string LastError { get; internal set; } = "";
        public static bool IsConnecting { get { return Runtime && Runtime.IsConnecting; } }
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void ResetStaticState()
        {
            Runtime = null; Players.Clear(); Callbacks.Clear(); local = NewPlayer(0); Connected = false; LastError = "";
        }
        public static int GetPing() { return InRoom ? Mathf.RoundToInt((float)Runner.GetPlayerRtt(Runner.LocalPlayer) * 1000) : 0; }
        internal static void Register(MonoBehaviourPunCallbacks callback) { Callbacks.Add(callback); }
        internal static void Unregister(MonoBehaviourPunCallbacks callback) { Callbacks.Remove(callback); }
        internal static void Dispatch(Action<MonoBehaviourPunCallbacks> action)
        {
            foreach (var callback in Callbacks.ToArray())
            {
                if (!callback || !callback.isActiveAndEnabled) continue;
                try { action(callback); } catch (Exception error) { Debug.LogException(error, callback); }
            }
        }
        internal static NeonFusionRuntime EnsureRuntime()
        {
            if (!Runtime) Runtime = new GameObject("Neon Fusion connection").AddComponent<NeonFusionRuntime>();
            return Runtime;
        }
        public static bool ConnectUsingSettings() { EnsureRuntime().Connect(); return true; }
        public static bool JoinRandomRoom() { EnsureRuntime().Join(); return true; }
        public static bool CreateRoom(string name, RoomOptions options) { EnsureRuntime().Join(name, options == null ? 0 : options.MaxPlayers); return true; }
        public static void Disconnect() { if (Runtime) Runtime.Disconnect(false); else Connected = false; }
        public static void LeaveRoom() { if (Runtime) Runtime.Disconnect(true); }
        public static void LoadLevel(string sceneName) { EnsureRuntime().LoadLevel(sceneName); }
        public static GameObject Instantiate(string prefabName, Vector3 position, Quaternion rotation, byte group = 0) { return EnsureRuntime().Spawn(prefabName, position, rotation, false); }
        public static GameObject InstantiateSceneObject(string prefabName, Vector3 position, Quaternion rotation, byte group = 0) { return EnsureRuntime().Spawn(prefabName, position, rotation, true); }
        public static void Destroy(GameObject instance)
        {
            if (!instance) return;
            var net = instance.GetComponent<NetworkObject>();
            if (InRoom && net && net.IsValid) { if (net.HasStateAuthority) Runner.Despawn(net); }
            else UnityEngine.Object.Destroy(instance);
        }
        public static bool RaiseEvent(byte code, object data, RaiseEventOptions options, SendOptions sendOptions)
        {
            if (!Runtime || !Runtime.LocalSession) return false;
            Runtime.LocalSession.SendEvent(code, data, options == null ? ReceiverGroup.Others : options.Receivers);
            return true;
        }
        internal static Player GetPlayer(PlayerRef reference)
        {
            if (reference.IsMasterClient && InRoom) reference = Runner.GetMasterClient();
            int actor = reference.RawEncoded;
            if (InRoom && reference == Runner.LocalPlayer)
            {
                local.ActorNumber = actor;
                Players[actor] = local;
                return local;
            }
            if (!Players.TryGetValue(actor, out var player)) { player = NewPlayer(actor); Players[actor] = player; }
            return player;
        }
        static Player NewPlayer(int actor)
        {
            var result = new Player { ActorNumber = actor };
            result.CustomProperties["Kills"] = 0; result.CustomProperties["GainExp"] = 0;
            result.CustomProperties["Head"] = 0; result.CustomProperties["Body"] = 0; result.CustomProperties["Back"] = 0;
            result.CustomProperties["Buffers"] = ""; result.CustomProperties["GodState"] = 0; result.CustomProperties["GodStateTime"] = 0f;
            return result;
        }
        internal static void ResetRoom()
        {
            Players.Clear(); local.ActorNumber = 0; local.Session = null; Connected = false;
        }
    }
}
