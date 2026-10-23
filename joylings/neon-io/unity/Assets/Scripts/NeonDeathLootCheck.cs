using System;
using System.Collections;
using System.Linq;
using Neon.Networking;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Neon.Validation
{
    // Explicit three-client fixture: real death, flight, physical interception and reuse.
    public sealed class NeonDeathLootCheck : MonoBehaviour
    {
        [Serializable] public sealed class Result
        {
            public bool passed, launched, intercepted, awardedOnce, killerCollected, reused, targetDeathReleased;
            public int observedPlayers, interceptorGain, killerGain;
            public string failure = "";
        }
        public readonly Result result = new Result();
        PlayerRole local, killer, victim, interceptor;
        bool active, killerPickup;
        Vector2 killerPosition = new Vector2(2400, 0), interceptorPosition = new Vector2(1400, 0);
        public IEnumerator Run()
        {
            IEnumerator work = Check();
            // Flatten nested coroutines so failed assertions always become a report.
            var stack = new System.Collections.Generic.Stack<IEnumerator>();
            stack.Push(work);
            while (stack.Count > 0)
            {
                object step = null; bool more;
                try { more = stack.Peek().MoveNext(); if (more) step = stack.Peek().Current; }
                catch (Exception error) { result.failure = error.Message + " " + Diagnostic(); yield break; }
                if (!more) { stack.Pop(); continue; }
                if (step is IEnumerator nested) stack.Push(nested);
                else yield return step;
            }
        }
        IEnumerator Until(Func<bool> predicate, float seconds, string failure)
        {
            float deadline = Time.realtimeSinceStartup + seconds;
            while (!predicate() && Time.realtimeSinceStartup < deadline) yield return null;
            if (!predicate()) throw new InvalidOperationException(failure);
        }
        IEnumerator Barrier(int phase)
        {
            PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable { ["flightPhase"] = phase });
            yield return Until(() => PhotonNetwork.PlayerList.All(p => Equals(p.CustomProperties["flightPhase"], phase)), 15, "Flight barrier timed out: " + phase);
            yield return new WaitForSecondsRealtime(.5f);
        }
        IEnumerator Check()
        {
            yield return Until(() => Players().Length == 3 && Players().All(p => p.IsInitialized), 25, "Three initialized players required.");
            var players = Players().OrderBy(p => p.photonView.Owner.ActorNumber == PhotonNetwork.MasterClient.ActorNumber ? 0 : p.photonView.Owner.ActorNumber).ToArray();
            result.observedPlayers = players.Length;
            killer = players[0]; victim = players[1]; interceptor = players[2];
            local = players.Single(p => p.photonView.IsMine);
            BattleManager.BM.enabled = false;
            // Isolate flight from the arena's existing out-of-bounds damage rule.
            BattleManager.BM.BattleFieldRadius = 100000;
            local.RemoveSkill(); local.RemoveFeature(); local.RemoveAllBuffer(); local.BaseMoveSpeed = 0;
            active = true;
            yield return Barrier(1);
            int killerBefore = TotalExp(killer), interceptorBefore = TotalExp(interceptor);
            int drops = GameSettingData.GetDropExpStarCount(victim.LV);
            if (local == killer) victim.SendNetworkHit(killer, 100000, Vector2.zero, "", victim.transform.position, null, 1);
            yield return Until(() => Stars().Any(s => s.IsActive && s.GetComponent<NeonFusionEntity>().LootDeathTarget == killer.photonView.ViewID
                && Vector2.Dot(s.GetComponent<NeonFusionEntity>().NetworkVelocity, Vector2.right) > 100), 6, "Death star did not launch toward the killer.");
            result.launched = true;
            yield return Until(() => TotalExp(interceptor) == interceptorBefore + drops, 6, "Another player did not physically intercept the star.");
            result.intercepted = true;
            yield return new WaitForSecondsRealtime(1);
            result.interceptorGain = TotalExp(interceptor) - interceptorBefore;
            result.awardedOnce = result.interceptorGain == drops && TotalExp(killer) == killerBefore;
            if (!result.awardedOnce) throw new InvalidOperationException("Interception duplicated experience or paid the killer too.");

            var oldIds = Stars().Select(s => s.photonView.ViewID).ToArray();
            local.RemoveSkill(); local.RemoveFeature(); local.RemoveAllBuffer();
            killerPosition = new Vector2(2400, 1000); interceptorPosition = new Vector2(1400, -2000); killerPickup = true;
            yield return Barrier(2);
            if (PhotonNetwork.IsMasterClient) LootSpawner.SpawnExpLoot(1, new Vector3(0, 1000), killer);
            yield return Until(() => Stars().Any(s => s.IsActive && oldIds.Contains(s.photonView.ViewID)
                && s.GetComponent<NeonFusionEntity>().LootDeathTarget == killer.photonView.ViewID), 5, "Pooled star did not start a new flight.");
            result.reused = true;
            yield return Until(() => TotalExp(killer) == killerBefore + 1, 6, "Unintercepted star did not reach the killer.");
            result.killerGain = TotalExp(killer) - killerBefore;
            result.killerCollected = result.killerGain == 1;

            killerPosition = new Vector2(2400, 2000); killerPickup = false;
            yield return Barrier(3);
            if (PhotonNetwork.IsMasterClient) LootSpawner.SpawnExpLoot(1, new Vector3(-1000, 2000), killer);
            ExpLoot flying = null;
            yield return Until(() => (flying = Stars().FirstOrDefault(s => s.IsActive && s.GetComponent<NeonFusionEntity>().LootDeathTarget == killer.photonView.ViewID)) != null,
                5, "Target-death flight did not start.");
            yield return Barrier(4);
            if (local == killer) killer.Health = 0;
            yield return Until(() => !killer.IsAlive && flying.IsActive && flying.GetComponent<NeonFusionEntity>().LootDeathTarget == 0, 6, "Star continued chasing a dead killer.");
            result.targetDeathReleased = true;
            result.passed = result.launched && result.intercepted && result.awardedOnce && result.killerCollected && result.reused && result.targetDeathReleased;
            Debug.Log("NEON_DEATH_LOOT_OK intercepted=" + result.interceptorGain + " killerCollected=" + result.killerGain);
        }
        static PlayerRole[] Players() => Object.FindObjectsByType<PlayerRole>(FindObjectsSortMode.None);
        static string Diagnostic()
        {
            string actors = string.Join(";", Players().Select(p => p.name + "/" + p.photonView.ViewID + " alive=" + p.IsAlive + " xp=" + TotalExp(p) + " pos=" + p.transform.position + " colliders="
                + string.Join(",", p.GetComponentsInChildren<Collider2D>().Select(c => c.name + ":" + c.enabled))));
            string stars = string.Join(";", Stars().Take(8).Select(s => s.photonView.ViewID + " active=" + s.IsActive + " pos=" + s.transform.position + " vel=" + s.GetComponent<Rigidbody2D>().linearVelocity
                + " target=" + s.GetComponent<LootMove>().DeathTargetId + " until=" + (s.GetComponent<LootMove>().DeathFlightUntil - PhotonNetwork.Time) + " absorb=" + s.GetComponent<LootMove>().MoveToPlayer));
            return actors + " STARS " + stars;
        }
        static ExpLoot[] Stars() => Object.FindObjectsByType<ExpLoot>(FindObjectsSortMode.None);
        static int TotalExp(PlayerRole player)
        {
            int total = player.Experience;
            for (int level = 1; level < player.LV; level++) total += GameSettingData.NeedExps[Mathf.Min(level - 1, 3)];
            return total;
        }
        void FixedUpdate()
        {
            if (!active) return;
            foreach (Role role in Object.FindObjectsByType<Role>(FindObjectsSortMode.None))
            {
                foreach (Collider2D collider in role.GetComponentsInChildren<Collider2D>())
                    collider.enabled = collider.gameObject == role.gameObject && role.IsAlive && (role == interceptor || (role == killer && killerPickup));
                if (role.MyRigi) role.MyRigi.linearVelocity = Vector2.zero;
                if (role is NeutralRole) role.enabled = false;
            }
            Vector2 position = local == killer ? killerPosition : local == interceptor ? interceptorPosition : Vector2.zero;
            local.transform.position = position;
            if (local.MyRigi) local.MyRigi.position = position;
        }
    }
}
