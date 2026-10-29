using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;

namespace Neon.Networking
{
    [DefaultExecutionOrder(-100)]
    public sealed class NeonArenaSpectator : MonoBehaviour
    {
        static NeonArenaSpectator instance;
        public static NeonArenaSpectator Instance => instance && instance.match && instance.match == NeonArena.Instance ? instance : null;
        readonly ArenaSpectatorState state = new ArenaSpectatorState();
        readonly Role[] roles = new Role[NeonArenaRules.PlayerSeats];
        NeonArena match;
        FollowPlayerRole follow;
        bool previousFollowEnabled;
        int cameraSlot = -1;

        public bool CanWatch => match && match == NeonArena.Instance && NeonArenaFlow.Active &&
            match.Phase == ArenaPhase.Running && match.HasLocalResult && match.Entries[match.LocalSlot].Eliminated;
        public bool IsWatching => state.Watching && CanWatch;
        public string TargetName => IsWatching && state.TargetSlot >= 0 ? match.Entries[state.TargetSlot].Name.ToString() : string.Empty;

        public void Initialize(NeonArena arena) { match = arena; instance = this; }
        public void Begin()
        {
            Synchronize();
            if (state.Begin()) Neon.Astral.NeonTouchStick.Release();
        }
        public void Next() { Synchronize(); state.Next(); }
        public void ShowResult() { state.Stop(); ReleaseCamera(); }

        void Update() { Synchronize(); }
        void Synchronize()
        {
            int mask = 0;
            bool eligible = CanWatch;
            for (int slot = 0; slot < roles.Length; slot++)
            {
                roles[slot] = null;
                if (!eligible) continue;
                var entry = match.Entries[slot];
                if (entry.Eliminated || slot == match.LocalSlot) continue;
                var view = PhotonView.Find(entry.View);
                var role = view ? view.GetComponent<Role>() : null;
                if (!role || !role.IsInitialized || !role.IsAlive || !role.gameObject.activeInHierarchy) continue;
                roles[slot] = role;
                mask |= 1 << slot;
            }
            state.Synchronize(eligible ? ArenaPhase.Running : ArenaPhase.Finished, eligible, eligible, mask);
            if (!state.Watching) ReleaseCamera();
        }

        void LateUpdate()
        {
            // Check again after replication/death presentation: a dead player's transform
            // is moved to a respawn point, which must never drag the spectator camera away.
            Synchronize();
            if (!IsWatching || state.TargetSlot < 0) return;
            var target = roles[state.TargetSlot];
            if (!target) return;
            var own = BattleManager.BM ? BattleManager.BM.MyPlayerRole : null;
            var cameraFollow = own ? own.MyFollowCamera : null;
            if (!cameraFollow) return;
            if (follow != cameraFollow)
            {
                ReleaseCamera();
                follow = cameraFollow; previousFollowEnabled = follow.enabled;
                follow.enabled = false;
            }
            var destination = target.transform.position;
            destination.z = follow.transform.position.z;
            // Switching is immediate; following is smooth and keeps the existing zoom.
            follow.transform.position = cameraSlot != state.TargetSlot ? destination :
                Vector3.Lerp(follow.transform.position, destination, 1 - Mathf.Exp(-14 * Time.unscaledDeltaTime));
            cameraSlot = state.TargetSlot;
        }

        void ReleaseCamera()
        {
            if (follow) follow.enabled = previousFollowEnabled && BattleManager.BM &&
                BattleManager.BM.MyPlayerRole && BattleManager.BM.MyPlayerRole.IsAlive;
            follow = null; cameraSlot = -1;
        }
        void OnDisable() { state.Stop(); ReleaseCamera(); }
        void OnDestroy() { ReleaseCamera(); if (instance == this) instance = null; }
    }
}
