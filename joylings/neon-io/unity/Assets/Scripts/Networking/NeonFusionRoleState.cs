using System;
using Fusion;
using UnityEngine;
using Starbro.NeonIO;

namespace Neon.Networking
{
    // Persistent state replaces buffered RPC history, including late joins and shared-master changes.
    public sealed class NeonFusionRoleState : NetworkBehaviour
    {
        [Networked, Capacity(NeonRoleStateCodec.Capacity / 4)] public NetworkArray<int> StateWords => default;
        [Networked] public int StateLength { get; set; }
        [Networked] public int StateRevision { get; set; }
        Role role;
        float nextCapture;
        int receivedRevision = -1;
        byte[] previousBytes;
        public override void Spawned() { role = GetComponent<Role>(); }
        public override void FixedUpdateNetwork()
        {
            if (!role || !role.IsInitialized || !HasStateAuthority || Runner.SimulationTime < nextCapture) return;
            nextCapture = Runner.SimulationTime + 0.1f;
            byte[] bytes = NeonRoleStateCodec.Encode(role.CaptureNetworkState());
            bool changed = previousBytes == null || previousBytes.Length != bytes.Length;
            if (!changed) for (int i = 0; i < bytes.Length; i++) if (previousBytes[i] != bytes[i]) { changed = true; break; }
            if (!changed) return;
            if (bytes.Length > StateWords.Length * 4) { Debug.LogError("Role state exceeds configured Fusion capacity.", this); return; }
            NeonPackedState.Write(StateWords, bytes);
            StateLength = bytes.Length;
            StateRevision++;
            previousBytes = bytes;
        }
        public override void Render()
        {
            if (HasStateAuthority || !role || !role.IsInitialized || StateLength <= 0 || StateLength > StateWords.Length * 4 || receivedRevision == StateRevision) return;
            try
            {
                byte[] bytes = NeonPackedState.Read(StateWords, StateLength);
                var state = NeonRoleStateCodec.Decode(bytes);
                role.ApplyNetworkState(state);
                receivedRevision = StateRevision;
            }
            catch (Exception error) { Debug.LogWarning("Unable to apply role state: " + error.Message, this); }
        }
    }
}
