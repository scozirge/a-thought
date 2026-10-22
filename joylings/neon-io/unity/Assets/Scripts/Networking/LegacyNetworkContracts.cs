using System;
using System.Collections.Generic;
using UnityEngine;

namespace Neon.Networking
{
    // Compatibility vocabulary for the original game. All transport and durable state live in Fusion.
    [AttributeUsage(AttributeTargets.Method, Inherited = true)]
    public sealed class PunRPC : Attribute { }
    public enum RpcTarget { All, Others, AllBuffered, OthersBuffered, MasterClient }
    public enum ReceiverGroup { Others, All, MasterClient }
    public enum DisconnectCause { None, DisconnectByClientLogic, Exception, ServerTimeout, ClientTimeout }
    public sealed class RaiseEventOptions { public ReceiverGroup Receivers = ReceiverGroup.Others; }
    public struct SendOptions { public bool Reliability; }
    public sealed class EventData { public byte Code; public object CustomData; public int Sender; }
    public sealed class RoomOptions { public byte MaxPlayers = 10; }
    public sealed class Hashtable : System.Collections.Hashtable { }
    public sealed class NetworkEvents
    {
        public event Action<EventData> EventReceived;
        internal void Dispatch(EventData data) { EventReceived?.Invoke(data); }
    }
    public static class PhotonPeer
    {
        public static bool RegisterType(Type type, byte code, Func<object, byte[]> serialize, Func<byte[], object> deserialize) { return true; }
    }
    public struct PhotonMessageInfo
    {
        public double SentServerTime;
        public PhotonView photonView;
        public Player Sender;
    }
    public interface IPunObservable { void OnPhotonSerializeView(PhotonStream stream, PhotonMessageInfo info); }
    public sealed class PhotonStream
    {
        readonly List<object> values;
        int cursor;
        public bool IsWriting { get; private set; }
        public PhotonStream(bool writing, object[] data = null) { IsWriting = writing; values = new List<object>(data ?? Array.Empty<object>()); }
        public void SendNext(object value) { if (IsWriting) values.Add(value); }
        public object ReceiveNext() { return cursor < values.Count ? values[cursor++] : null; }
        public object[] ToArray() { return values.ToArray(); }
    }
    public class MonoBehaviourPunCallbacks : MonoBehaviour
    {
        PhotonView cachedView;
        public PhotonView photonView { get { if (!cachedView) cachedView = GetComponent<PhotonView>(); return cachedView; } }
        public virtual void OnEnable() { PhotonNetwork.Register(this); }
        public virtual void OnDisable() { PhotonNetwork.Unregister(this); }
        public virtual void OnConnectedToMaster() { }
        public virtual void OnDisconnected(DisconnectCause cause) { }
        public virtual void OnJoinRandomFailed(short returnCode, string message) { }
        public virtual void OnJoinedRoom() { }
        public virtual void OnLeftRoom() { }
        public virtual void OnPlayerEnteredRoom(Player player) { }
        public virtual void OnPlayerLeftRoom(Player player) { }
        public virtual void OnMasterClientSwitched(Player player) { }
        public virtual void OnPlayerPropertiesUpdate(Player player, Hashtable changes) { }
    }
    public sealed class Player
    {
        public int ActorNumber { get; internal set; }
        public string NickName { get; set; } = "Player";
        public Hashtable CustomProperties { get; } = new Hashtable();
        public bool IsLocal { get { return this == PhotonNetwork.LocalPlayer; } }
        internal NeonPlayerSession Session;
        public bool SetCustomProperties(Hashtable changes)
        {
            if (changes == null) return false;
            // Only the owning session may publish properties. A missing remote session
            // during join/leave must not permit a local callback posing as that player.
            if (!IsLocal) return false;
            foreach (System.Collections.DictionaryEntry entry in changes) CustomProperties[entry.Key] = entry.Value;
            if (IsLocal && PhotonNetwork.Runtime) PhotonNetwork.Runtime.PublishLocalProperties();
            PhotonNetwork.Dispatch(x => x.OnPlayerPropertiesUpdate(this, changes));
            return true;
        }
        public override string ToString() { return NickName + " (#" + ActorNumber + ")"; }
    }
    public sealed class Room
    {
        public Dictionary<int, Player> Players { get { return PhotonNetwork.Players; } }
        public int PlayerCount { get { return PhotonNetwork.Runner ? System.Linq.Enumerable.Count(PhotonNetwork.Runner.ActivePlayers) : 0; } }
        public bool IsOpen
        {
            get { return PhotonNetwork.InRoom && PhotonNetwork.Runner.SessionInfo.IsOpen; }
            set { if (PhotonNetwork.InRoom && PhotonNetwork.IsMasterClient) PhotonNetwork.Runner.SessionInfo.IsOpen = value; }
        }
    }
    public sealed class LegacyAppSettings { public string FixedRegion = "asia"; }
    public sealed class LegacyServerSettings { public LegacyAppSettings AppSettings = new LegacyAppSettings(); }
}
