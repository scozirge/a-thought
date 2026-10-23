using System;
using System.Collections;
using System.Linq;
using Neon.Networking;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;

namespace Neon.Validation
{
    // Only enabled by the explicit -neonArena validation command. Uses real Fusion RPCs and shared state.
    public sealed class NeonArenaCheck : MonoBehaviour
    {
        [Serializable] public sealed class Result
        {
            public bool passed, closedRoom, roster, npcUnranked, seatRanked, drops, damage, duplicateIgnored, frozenResult, activeGroundCount, result, rewardOnce;
            public bool ambientPaced, ambientScaled, ambientDensity, ambientStopped;
            public int fullCircleStars, halfCircleStars, quarterCircleStars, denseCircleStars;
            public int humans, namedAi, namelessBots, roles, localRank, localReward;
            public string failure = "";
            public string stage = "";
        }
        public readonly Result result = new Result();
        bool freeze;
        bool starTestActive;
        bool fogPreview;
        float starTestElapsed;
        public IEnumerator Run()
        {
            string room = PhotonNetwork.Runner ? PhotonNetwork.Runner.SessionInfo.Name : "";
            if (!(room.StartsWith("neon-validation-", StringComparison.Ordinal) || room.StartsWith("neon-web-check-", StringComparison.Ordinal)))
            { result.failure = "Arena validation requires an isolated test room."; yield break; }
            var stack = new System.Collections.Generic.Stack<IEnumerator>(); stack.Push(Check());
            while (stack.Count > 0)
            {
                object step = null; bool more;
                try { more = stack.Peek().MoveNext(); if (more) step = stack.Peek().Current; }
                catch (Exception e) { result.failure = e.Message; yield break; }
                if (!more) { stack.Pop(); continue; }
                if (step is IEnumerator nested) stack.Push(nested); else yield return step;
            }
        }
        IEnumerator Until(Func<bool> test, float seconds, string error)
        {
            float deadline = Time.realtimeSinceStartup + seconds;
            while (!test() && Time.realtimeSinceStartup < deadline) yield return null;
            if (!test()) throw new Exception(error);
        }
        IEnumerator Barrier(int phase)
        {
            PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable { ["arenaCheck"] = phase });
            yield return Until(() => PhotonNetwork.PlayerList.All(p => Equals(p.CustomProperties["arenaCheck"], phase)), 15, "Arena barrier " + phase);
            yield return new WaitForSecondsRealtime(.5f);
        }
        Role RoleAt(int slot) => PhotonView.Find(NeonArena.Instance.Entries[slot].View)?.GetComponent<Role>();
        IEnumerator Check()
        {
            yield return Until(() => NeonArena.Instance && NeonArena.Instance.Phase == ArenaPhase.Running, 65, "Arena did not start.");
            var match = NeonArena.Instance;
            freeze = true;
            yield return Barrier(1);
            yield return Until(() => Enumerable.Range(0, 32).All(i => RoleAt(i) && RoleAt(i).IsInitialized), 15, "Roster proxies did not arrive.");
            result.roles = FindObjectsByType<Role>(FindObjectsSortMode.None).Count(r => r.IsInitialized);
            result.humans = Enumerable.Range(0, 16).Count(i => match.Entries[i].Actor > 0);
            result.namedAi = Enumerable.Range(0, 16).Count(i => match.Entries[i].Actor == 0 && !string.IsNullOrEmpty(match.Entries[i].Name.ToString()));
            result.namelessBots = Enumerable.Range(16, 16).Count(i => string.IsNullOrEmpty(RoleAt(i).Name));
            result.roster = result.roles == 32 && result.humans + result.namedAi == 16 && result.namelessBots == 16;
            result.closedRoom = !PhotonNetwork.Runner.SessionInfo.IsOpen && PhotonNetwork.Runner.SessionInfo.MaxPlayers == 16;
            if (!result.roster || !result.closedRoom) throw new Exception("Wrong roster or open room: " + JsonUtility.ToJson(result));
            fogPreview = true;
            result.stage = "fog-preview";
            yield return new WaitForSecondsRealtime(5);
            fogPreview = false;
            yield return CheckAmbientStars(match);
            var killer = FindObjectsByType<PlayerRole>(FindObjectsSortMode.None).Single(r => r.photonView.Owner.ActorNumber == PhotonNetwork.MasterClient.ActorNumber);
            int killerSlot = match.FindView(killer.photonView.ViewID);
            int seat = Enumerable.Range(0, 16).First(i => match.Entries[i].Actor == 0);
            int npcHp = RoleAt(16).Health, seatHp = RoleAt(seat).Health;
            result.drops = NeonArena.DropCount(RoleAt(16)) == 1 && NeonArena.DropCount(RoleAt(seat)) == 2 && NeonArena.DropCount(killer) == 2;
            yield return Barrier(2);
            if (PhotonNetwork.IsMasterClient) RoleAt(16).SendNetworkHit(killer, 100000, Vector2.zero, "", RoleAt(16).transform.position, null, 1);
            yield return Until(() => match.Entries[16].Eliminated, 8, "NPC death was not replicated.");
            result.npcUnranked = match.Remaining == 16 && match.Entries[16].Rank == 0;
            yield return Barrier(3);
            if (PhotonNetwork.IsMasterClient) RoleAt(seat).SendNetworkHit(killer, 100000, Vector2.zero, "", RoleAt(seat).transform.position, null, 1);
            yield return Until(() => match.Entries[seat].Eliminated, 8, "Player seat death was not replicated.");
            result.seatRanked = match.Entries[seat].Rank == 16 && match.Remaining == 15;
            result.damage = match.Entries[killerSlot].Damage == npcHp + seatHp && match.Entries[killerSlot].Kills == 2;
            yield return Barrier(4);
            if (PhotonNetwork.IsMasterClient) NeonArena.Report(RoleAt(seat), killer.photonView.ViewID, 0, true);
            yield return new WaitForSecondsRealtime(1);
            result.duplicateIgnored = match.Entries[killerSlot].Kills == 2 && match.Remaining == 15;
            yield return Barrier(5);
            var frozen = match.Entries[seat];
            if (PhotonNetwork.IsMasterClient) RoleAt(17).SendNetworkHit(RoleAt(seat), 100000, Vector2.zero, "", RoleAt(17).transform.position, null, 1);
            yield return Until(() => match.Entries[17].Eliminated, 8, "Posthumous projectile did not resolve.");
            result.frozenResult = frozen.Damage == match.Entries[seat].Damage && frozen.Kills == match.Entries[seat].Kills;
            result.activeGroundCount = LootSpawner.ActiveCount == FindObjectsByType<Loot>(FindObjectsSortMode.None).Count(l => l.IsActive);
            yield return Barrier(7);
            // Eliminate the rest using each role's authority, keeping only the original master alive.
            foreach (var role in FindObjectsByType<Role>(FindObjectsSortMode.None))
                if (role != killer && role.HasSimulationAuthority && role.IsAlive) role.Die();
            yield return Until(() => match.Phase == ArenaPhase.Finished && match.HasLocalResult, 12, "Final winner/result missing.");
            result.localRank = match.Entries[match.LocalSlot].Rank;
            var ranks = Enumerable.Range(0, 16).Select(i => match.Entries[i].Rank).OrderBy(x => x).ToArray();
            result.result = ranks.SequenceEqual(Enumerable.Range(1, 16)) && match.Entries[killerSlot].Rank == 1;
            match.SaveReward(); int stars = MyPlayer.Star; match.SaveReward();
            result.rewardOnce = stars == MyPlayer.Star;
            var row = match.Entries[match.LocalSlot]; result.localReward = NeonArenaRules.Reward(row.Rank, row.Kills, row.Damage);
            result.passed = result.roster && result.closedRoom && result.npcUnranked && result.seatRanked && result.drops && result.damage && result.duplicateIgnored && result.result && result.rewardOnce && result.frozenResult && result.activeGroundCount
                && result.ambientPaced && result.ambientScaled && result.ambientDensity && result.ambientStopped;
            if (!result.passed) throw new Exception(JsonUtility.ToJson(result));
            result.stage = "complete";
            yield return Barrier(6);
        }
        IEnumerator CheckAmbientStars(NeonArena match)
        {
            starTestActive = true;
            yield return SampleAmbient(match, 20, 0);
            result.fullCircleStars = LootSpawner.ActiveCount;
            result.ambientPaced = result.fullCircleStars == 3;
            yield return SampleAmbient(match, 21, 135);
            result.halfCircleStars = LootSpawner.ActiveCount;
            yield return SampleAmbient(match, 22, 187.5f);
            result.quarterCircleStars = LootSpawner.ActiveCount;
            result.ambientScaled = result.halfCircleStars == 2 && result.quarterCircleStars == 1;
            yield return SampleAmbient(match, 23, 135, 96);
            result.denseCircleStars = LootSpawner.ActiveCount;
            result.ambientDensity = result.denseCircleStars == 96;
            yield return SampleAmbient(match, 24, 245);
            result.ambientStopped = LootSpawner.ActiveCount == 0;
            if (!(result.ambientPaced && result.ambientScaled && result.ambientDensity && result.ambientStopped))
                throw new Exception("Ambient star rate/density regression: " + JsonUtility.ToJson(result));
            starTestElapsed = 0;
            yield return Barrier(25);
            if (PhotonNetwork.IsMasterClient) { match.Started = PhotonNetwork.Time; match.NextStars = PhotonNetwork.Time + 10; }
            starTestActive = false;
            yield return Barrier(26);
        }
        IEnumerator SampleAmbient(NeonArena match, int phase, float elapsed, int preload = 0)
        {
            result.stage = "ambient-" + phase;
            starTestElapsed = elapsed;
            yield return Barrier(phase);
            if (PhotonNetwork.IsMasterClient)
            {
                foreach (var loot in FindObjectsByType<Loot>(FindObjectsSortMode.None)) loot.SetActive(false);
                match.Started = PhotonNetwork.Time - elapsed;
                // Simulate a late tick: the game must not replay missed waves all at once.
                match.NextStars = PhotonNetwork.Time - 60;
                if (preload > 0) LootSpawner.SpawnExpLoot(preload, Vector3.zero);
            }
            yield return new WaitForSecondsRealtime(6.5f);
        }
        void Update()
        {
            if (!freeze || !NeonArena.Instance) return;
            if (starTestActive && PhotonNetwork.IsMasterClient)
                NeonArena.Instance.Started = PhotonNetwork.Time - starTestElapsed;
            if (fogPreview && PhotonNetwork.IsMasterClient)
                NeonArena.Instance.Started = PhotonNetwork.Time - 135;
            foreach (var role in FindObjectsByType<Role>(FindObjectsSortMode.None))
            {
                if (!role.HasSimulationAuthority || !role.IsAlive) continue;
                role.RemoveSkill(); role.RemoveFeature(); role.RemoveAllBuffer(); role.BaseMoveSpeed = 0;
                int slot = NeonArena.Instance.FindView(role.photonView.ViewID);
                // Keep fixtures separate, inside the safe zone and away from ambient stars.
                float angle = slot * Mathf.PI * 2 / 32;
                float distance = fogPreview ? NeonArena.Instance.Radius - 100 : starTestActive ? 10000 : 2500;
                role.transform.position = new Vector3(Mathf.Cos(angle) * distance, Mathf.Sin(angle) * distance, 0);
                if (starTestActive || fogPreview) role.Health = role.MaxHealth; // Keep fixture actors alive while testing circle sizes.
                role.MyRigi.linearVelocity = Vector2.zero;
            }
        }
    }
}
