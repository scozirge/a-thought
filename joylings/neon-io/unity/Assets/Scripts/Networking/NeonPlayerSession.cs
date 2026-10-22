using System;
using Fusion;
using UnityEngine;

namespace Neon.Networking
{
    public sealed class NeonPlayerSession : NetworkBehaviour
    {
        [Networked] public NetworkString<_64> PlayerName { get; set; }
        [Networked, Capacity(256)] public NetworkArray<int> PropertyWords => default;
        [Networked] public int PropertyLength { get; set; }
        [Networked] public int PropertyRevision { get; set; }
        [Networked, Capacity(5)] public NetworkArray<int> ChallengeSkills => default;
        [Networked] public NetworkBool HasChallengeSkills { get; set; }
        [Networked] public NetworkBool Ready { get; set; }
        int receivedRevision = -1;
        bool notified;
        bool skillsReceived;
        Player player;
        public override void Spawned()
        {
            Runner.MakeDontDestroyOnLoad(gameObject);
            player = PhotonNetwork.GetPlayer(Object.StateAuthority);
            player.Session = this;
            if (HasStateAuthority)
            {
                PhotonNetwork.Runtime.LocalSession = this;
                Publish();
            }
        }
        public void Publish()
        {
            if (!Object || !Object.IsValid || !HasStateAuthority) return;
            PlayerName = PhotonNetwork.LocalPlayer.NickName;
            byte[] bytes = NeonWireCodec.PackProperties(PhotonNetwork.LocalPlayer.CustomProperties);
            if (bytes.Length > PropertyWords.Length * 4) { Debug.LogError("Player properties exceed Fusion capacity."); return; }
            NeonPackedState.Write(PropertyWords, bytes);
            PropertyLength = bytes.Length;
            PropertyRevision++;
            Ready = true;
        }
        public override void Render()
        {
            if (!Ready) return;
            if (player == null) player = PhotonNetwork.GetPlayer(Object.StateAuthority);
            player.NickName = PlayerName.ToString();
            if (!HasStateAuthority && receivedRevision != PropertyRevision && PropertyLength > 0 && PropertyLength <= PropertyWords.Length * 4)
            {
                byte[] bytes = NeonPackedState.Read(PropertyWords, PropertyLength);
                try
                {
                    var properties = NeonWireCodec.UnpackProperties(bytes);
                    foreach (System.Collections.DictionaryEntry item in properties) player.CustomProperties[item.Key] = item.Value;
                    receivedRevision = PropertyRevision;
                    PhotonNetwork.Dispatch(x => x.OnPlayerPropertiesUpdate(player, properties));
                }
                catch (Exception error) { Debug.LogWarning("Invalid player state: " + error.Message); }
            }
            if (!notified)
            {
                PhotonNetwork.Runtime.NotifySessionReady(player);
                // The runtime also checks existing sessions immediately after joining.
                notified = PhotonNetwork.InRoom;
            }
            if (!HasStateAuthority && HasChallengeSkills && !skillsReceived)
            {
                skillsReceived = true;
                var ids = new int[5]; for (int i = 0; i < ids.Length; i++) ids[i] = ChallengeSkills[i];
                PhotonNetwork.NetworkingClient.Dispatch(new EventData { Code = 3, CustomData = ids, Sender = player.ActorNumber });
            }
        }
        public void SendEvent(byte code, object value, ReceiverGroup receivers)
        {
            if (!Object || !Object.IsValid || !HasStateAuthority) return;
            if (code == 3 && value is int[] ids && ids.Length == 5)
            {
                for (int i = 0; i < 5; i++) ChallengeSkills.Set(i, ids[i]);
                HasChallengeSkills = true;
            }
            RPC_Event(code, (byte)receivers, NeonWireCodec.Pack(value));
        }
        [Rpc(RpcSources.StateAuthority, RpcTargets.All, Channel = RpcChannel.Reliable)]
        public void RPC_Event(byte code, byte receivers, byte[] bytes, RpcInfo info = default)
        {
            var receiver = (ReceiverGroup)receivers;
            if (receiver == ReceiverGroup.Others && info.Source == Runner.LocalPlayer) return;
            if (receiver == ReceiverGroup.MasterClient && !Runner.IsSharedModeMasterClient) return;
            try
            {
                var values = NeonWireCodec.Unpack(bytes);
                if (values.Length != 1 || code < 1 || code > 3) return;
                if (code == 1)
                {
                    if (info.Source != Runner.GetMasterClient() || !(values[0] is object[] god) || god.Length != 2 ||
                        !(god[0] is int phase) || phase < 0 || phase > 10 || !(god[1] is float duration) ||
                        float.IsNaN(duration) || float.IsInfinity(duration) || duration < 0 || duration > 1000000) return;
                }
                if (code == 2 && (!(values[0] is string[] clamor) || clamor.Length != 2 || clamor[0].Length > 128 || clamor[1].Length > 512)) return;
                if (code == 3 && (!(values[0] is int[] features) || features.Length != 5)) return;
                PhotonNetwork.NetworkingClient.Dispatch(new EventData { Code = code, CustomData = values[0], Sender = info.Source.RawEncoded });
            }
            catch (Exception error) { Debug.LogWarning("Rejected room event: " + error.Message); }
        }
    }
}
