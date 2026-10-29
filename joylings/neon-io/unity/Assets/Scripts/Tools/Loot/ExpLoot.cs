using UnityEngine;
using Starbro.NeonIO;
using Neon.Networking;
namespace Scoz.Func
{
    public class ExpLoot : Loot
    {
        public int Value = 1;
        public int SpawnRevision { get; internal set; }

        public void LaunchToward(Role killer)
        {
            if (!IsActive || killer == null || !killer.IsAlive || !killer.IsInitialized || !killer.CanCollectStars) return;
            if (PhotonNetwork.IsConnected && !photonView.IsMine) return;
            GetComponent<LootMove>()?.BeginDeathFlight(killer);
            // Keep the initial burst visible even when the killer overlaps the victim.
            // Once armed, any role that physically touches a star can intercept it.
            DelayPickup(LootMove.DeathPickupDelay);
        }

        // Return the accepted amount so the spawner can carry excess to another star.
        public int AddValue(int amount)
        {
            if (amount <= 0) return 0;
            Value = Mathf.Max(1, Value);
            int added = (int)System.Math.Min((long)amount, (long)int.MaxValue - Value);
            Value += added;
            return added;
        }

        public static System.Collections.Generic.IEnumerable<int> SplitGrants(int value)
        {
            while (value > 0)
            {
                int amount = Mathf.Min(value, 10000);
                yield return amount;
                value -= amount;
            }
        }

        void OnTriggerStay2D(Collider2D collider)
        {
            if (!IsActive || !ReadyToAcquire) return;
            // One authority awards each star, even with simultaneous contacts.
            if (PhotonNetwork.IsConnected && !photonView.IsMine) return;
            // Absorption/attack sensors are children of a role, not its pickup body.
            // They may guide ordinary loot but must never grant experience at a distance.
            Role role = collider.GetComponent<Role>();
            if (role == null || !role.IsInitialized || !role.IsAlive || !role.CanCollectStars) return;
            if (!(role is PlayerRole) && !(role is NeutralRole)) return;
            int remaining = Mathf.Max(1, Value);
            SetActive(false); // Reserve synchronously before any RPC can return.
            NeonArena.RecordStarPickup(role, remaining);
            // Active/value/flight are replicated together in Fusion snapshots; no per-star hide RPC.
            // Keep each grant within the wire validator limit without losing merged value.
            foreach (int amount in SplitGrants(remaining))
            {
                if (PhotonNetwork.IsConnected) role.photonView.RPC("GainExp", RpcTarget.All, amount);
                else if (role is PlayerRole player) player.GainExp(amount);
                else ((NeutralRole)role).GainExp(amount);
            }
        }
        [PunRPC]
        public override void SetLoot(bool active, Vector2 position, Vector2 force)
        {
            if (active) { Value = 1; SpawnRevision = SpawnRevision == int.MaxValue ? 1 : SpawnRevision + 1; }
            base.SetLoot(active, position, force);
            LootMove movement = GetComponent<LootMove>();
            if (movement == null) return;
            movement.ResetForReuse(active);
            movement.SetVelocity(active ? force : Vector2.zero);
        }
    }
}
