using System;
using System.Collections.Generic;
using Fusion;
using UnityEngine;
using Scoz.Func;

namespace Neon.Networking
{
    [DisallowMultipleComponent]
    public sealed class NeonFusionEntity : NetworkBehaviour
    {
        [Networked] public Vector3 NetworkPosition { get; set; }
        [Networked] public float NetworkRotation { get; set; }
        [Networked] public Vector2 NetworkVelocity { get; set; }
        [Networked] public float NetworkAngularVelocity { get; set; }
        [Networked] public NetworkBool LootActive { get; set; }
        [Networked] public int LootValue { get; set; }
        [Networked] public int LootDeathTarget { get; set; }
        [Networked] public double LootFlightUntil { get; set; }
        [Networked] public int LootSpawnRevision { get; set; }
        [Networked] public double LootPickupReadyAt { get; set; }
        [Networked] public NetworkBool StateReady { get; set; }
        [Networked] public Vector2 ViewCenter { get; set; }
        [Networked] public Vector2 ViewHalfSize { get; set; }
        PhotonView view;
        Rigidbody2D body;
        RigidbodyType2D originalBodyType;
        Loot loot;
        ExpLoot expLoot;
        LootMove lootMovement;
        Starbro.NeonIO.Role role;
        bool previousAuthority;
        bool hasRendered;
        readonly Queue<PendingRpc> pending = new Queue<PendingRpc>();
        struct PendingRpc { public string method; public object[] arguments; public double time; public Player sender; }
        static readonly HashSet<string> CrossOwnerMethods = new HashSet<string>
        {
            "BeAttack", "BeAttackAndCallParticle", "BeAttackAndAddBuffer", "BeAttackAndCallParticleAndAddBuffer",
            "AddBuffer"
        };
        public override void Spawned()
        {
            view = GetComponent<PhotonView>();
            view.Entity = this;
            body = GetComponent<Rigidbody2D>();
            if (body) originalBodyType = body.bodyType;
            loot = GetComponent<Loot>();
            expLoot = loot as ExpLoot;
            lootMovement = loot ? GetComponent<LootMove>() : null;
            role = GetComponent<Starbro.NeonIO.Role>();
            if (role is Starbro.NeonIO.PlayerRole player) player.ApplyViewerFaction(HasStateAuthority);
            previousAuthority = HasStateAuthority;
            ConfigurePhysics();
            PhotonNetwork.Runtime.Register(view);
            if (HasStateAuthority) Capture();
            else if (loot)
            {
                // A late join can instantiate pooled, inactive stars. Keep the prefab
                // hidden until one complete snapshot supplies position and visibility.
                loot.SetActive(false);
                if (StateReady)
                {
                    transform.position = NetworkPosition;
                    if (body) { body.position = NetworkPosition; body.linearVelocity = LootActive ? NetworkVelocity : Vector2.zero; }
                    RestoreLootState(); hasRendered = true;
                }
            }
        }
        void ConfigurePhysics()
        {
            if (!body) return;
            body.bodyType = HasStateAuthority ? originalBodyType : RigidbodyType2D.Kinematic;
            body.interpolation = RigidbodyInterpolation2D.None;
        }
        void Capture()
        {
            NetworkPosition = transform.position;
            if (role)
            {
                var camera = Camera.main;
                if (camera && camera.orthographic)
                {
                    ViewCenter = role is Starbro.NeonIO.PlayerRole ? (Vector2)camera.transform.position : (Vector2)role.transform.position;
                    ViewHalfSize = new Vector2(camera.orthographicSize * camera.aspect, camera.orthographicSize);
                }
            }
            NetworkRotation = transform.eulerAngles.z;
            if (body) { NetworkVelocity = body.linearVelocity; NetworkAngularVelocity = body.angularVelocity; }
            if (loot) { LootActive = loot.IsActive; LootPickupReadyAt = loot.PickupReadyAt; }
            if (expLoot) { LootValue = expLoot.Value; LootSpawnRevision = expLoot.SpawnRevision; }
            if (lootMovement) { LootDeathTarget = lootMovement.DeathTargetId; LootFlightUntil = lootMovement.DeathFlightUntil; }
            StateReady = true;
        }
        public override void FixedUpdateNetwork()
        {
            if (previousAuthority != HasStateAuthority)
            {
                previousAuthority = HasStateAuthority;
                ConfigurePhysics();
                PhotonNetwork.Runtime.Register(view);
                if (HasStateAuthority && loot && StateReady)
                {
                    transform.position = NetworkPosition;
                    if (body) { body.position = NetworkPosition; body.linearVelocity = NetworkVelocity; }
                    RestoreLootState();
                }
            }
            if (HasStateAuthority) Capture();
        }
        public override void Render()
        {
            if (!HasStateAuthority && StateReady)
            {
                float blend = 1f - Mathf.Exp(-18f * UnityEngine.Time.unscaledDeltaTime);
                float distance = (transform.position - NetworkPosition).sqrMagnitude;
                bool newLoot = expLoot && expLoot.SpawnRevision != LootSpawnRevision;
                transform.position = !hasRendered || newLoot || distance > 1000000f ? NetworkPosition : Vector3.Lerp(transform.position, NetworkPosition, blend);
                transform.rotation = Quaternion.Euler(0, 0, Mathf.LerpAngle(transform.eulerAngles.z, NetworkRotation, blend));
                if (body) { body.linearVelocity = NetworkVelocity; body.angularVelocity = NetworkAngularVelocity; }
                RestoreLootState();
                hasRendered = true;
            }
            if (role && !role.IsInitialized) return;
            while (pending.Count > 0)
            {
                var item = pending.Dequeue();
                view.InvokeLocal(item.method, item.arguments, item.time, item.sender);
            }
        }
        void RestoreLootState()
        {
            if (expLoot && expLoot.SpawnRevision != LootSpawnRevision)
            {
                expLoot.SetLoot(LootActive, NetworkPosition, NetworkVelocity);
                expLoot.SpawnRevision = LootSpawnRevision;
            }
            if (loot && loot.IsActive != LootActive) loot.SetActive(LootActive);
            if (loot) loot.RestorePickupDeadline(LootPickupReadyAt);
            if (expLoot) expLoot.Value = Mathf.Max(1, LootValue);
            if (lootMovement) lootMovement.RestoreDeathFlight(LootDeathTarget, LootFlightUntil);
        }
        public override void Despawned(NetworkRunner runner, bool hasState)
        {
            if (view && PhotonNetwork.Runtime) PhotonNetwork.Runtime.Unregister(view);
        }
        public void SendLegacyRpc(string method, RpcTarget target, object[] arguments)
        {
            // AllBuffered is deliberately state based: durable role/loot state is in Networked snapshots.
            // There is no ever-growing event history to replay when a player joins late.
            byte[] payload = NeonWireCodec.Pack(method, arguments);
            RPC_Legacy((byte)target, payload, PhotonNetwork.Time);
        }
        public void SendToAuthority(string method, object[] arguments)
        {
            RPC_ToAuthority(NeonWireCodec.Pack(method, arguments), PhotonNetwork.Time);
        }
        bool Allowed(string method, object[] values, PlayerRef sender)
        {
            bool active = false;
            foreach (var player in Runner.ActivePlayers) if (player == sender) { active = true; break; }
            if (!active) return false;
            if (method == "ReceiveNetworkHit")
            {
                if (values.Length != 11 || !(values[0] is int attackerId)) return false;
                if (attackerId == 0) return sender == Runner.GetMasterClient();
                var attacker = PhotonView.Find(attackerId);
                return attacker && attacker.IsReady && attacker.Owner.ActorNumber == sender.RawEncoded;
            }
            if (method == "ConfirmLifeSteal")
            {
                if (values.Length != 3 || !(values[0] is int victimId)) return false;
                var owner = PhotonNetwork.Runtime.FindViewOwner(victimId);
                return owner != null && owner.ActorNumber == sender.RawEncoded;
            }
            if (method == "NotifyDeath")
            {
                var owner = Object.StateAuthority.IsMasterClient ? Runner.GetMasterClient() : Object.StateAuthority;
                return sender == owner;
            }
            // The shared master owns the loot. Clients cannot grant themselves experience or reactivate stars.
            if (method == "GainExp" || method == "SetLoot" || method == "SetActive") return sender == Runner.GetMasterClient();
            var authority = Object.StateAuthority.IsMasterClient ? Runner.GetMasterClient() : Object.StateAuthority;
            return sender == authority || sender == Runner.GetMasterClient() || CrossOwnerMethods.Contains(method);
        }
        void Receive(byte[] payload, double sentTime, PlayerRef sender)
        {
            if (double.IsNaN(sentTime) || double.IsInfinity(sentTime)) return;
            // Very late messages may still update state, but must not fast-forward a visual projectile without bound.
            sentTime = Math.Max(PhotonNetwork.Time - 2.0, Math.Min(PhotonNetwork.Time, sentTime));
            try
            {
                var values = NeonWireCodec.Unpack(payload);
                if (values.Length != 2 || !(values[0] is string method) || !(values[1] is object[] arguments) || !Allowed(method, arguments, sender) || !NeonRpcValidation.IsValid(method, arguments)) return;
                if (role && !role.IsInitialized)
                {
                    if (pending.Count < 64) pending.Enqueue(new PendingRpc { method = method, arguments = arguments, time = sentTime, sender = PhotonNetwork.GetPlayer(sender) });
                    return;
                }
                view.InvokeLocal(method, arguments, sentTime, PhotonNetwork.GetPlayer(sender));
            }
            catch (Exception error) { Debug.LogWarning("Rejected entity RPC: " + error.Message, this); }
        }
        [Rpc(RpcSources.All, RpcTargets.All, Channel = RpcChannel.Reliable)]
        public void RPC_Legacy(byte target, byte[] payload, double sentTime, RpcInfo info = default)
        {
            var destination = (RpcTarget)target;
            if ((destination == RpcTarget.Others || destination == RpcTarget.OthersBuffered) && info.Source == Runner.LocalPlayer) return;
            if (destination == RpcTarget.MasterClient && !Runner.IsSharedModeMasterClient) return;
            Receive(payload, sentTime, info.Source);
        }
        [Rpc(RpcSources.All, RpcTargets.StateAuthority, Channel = RpcChannel.Reliable)]
        public void RPC_ToAuthority(byte[] payload, double sentTime, RpcInfo info = default) { Receive(payload, sentTime, info.Source); }
    }
}
