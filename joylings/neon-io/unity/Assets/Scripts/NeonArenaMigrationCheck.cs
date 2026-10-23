using System;
using System.Collections;
using System.Linq;
using Neon.Networking;
using Starbro.NeonIO;
using UnityEngine;

namespace Neon.Validation
{
    public sealed class NeonArenaMigrationCheck : MonoBehaviour
    {
        [Serializable] public sealed class Result
        {
            public bool passed, departingMaster, preservedRoster, deathAfterMigration, starWaves, storm;
            public string failure = "";
        }
        public readonly Result result = new Result();
        bool freeze;
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
        IEnumerator Until(Func<bool> test, int seconds, string error)
        {
            float end = Time.realtimeSinceStartup + seconds;
            while (!test() && Time.realtimeSinceStartup < end) yield return null;
            if (!test()) throw new Exception(error);
        }
        IEnumerator Check()
        {
            freeze = true;
            yield return Until(() => NeonArena.Instance && NeonArena.Instance.Phase == ArenaPhase.Running, 65, "Arena did not start.");
            var match = NeonArena.Instance;
            string id = match.MatchId.ToString(); double started = match.Started;
            int oldMaster = PhotonNetwork.MasterClient.ActorNumber, oldSlot = match.FindActor(oldMaster);
            PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable { ["arenaMigrationReady"] = true });
            yield return Until(() => PhotonNetwork.PlayerList.Length >= 3 && PhotonNetwork.PlayerList.All(p => Equals(p.CustomProperties["arenaMigrationReady"], true)), 15, "Migration clients not ready.");
            yield return new WaitForSecondsRealtime(1);
            if (PhotonNetwork.LocalPlayer.ActorNumber == oldMaster)
            {
                result.departingMaster = true; PhotonNetwork.Disconnect();
                yield return Until(() => !PhotonNetwork.InRoom && !PhotonNetwork.IsDisconnecting, 15, "Master disconnect did not finish.");
                result.passed = true; yield break;
            }
            yield return Until(() => PhotonNetwork.MasterClient.ActorNumber != oldMaster && match.Entries[oldSlot].Eliminated, 15, "Master authority/forfeit did not migrate.");
            result.preservedRoster = match.MatchId.ToString() == id && match.Started == started && match.Remaining == 15 && Enumerable.Range(0,32).All(i=>match.Entries[i].View != 0);
            yield return new WaitForSecondsRealtime(1);
            if (PhotonNetwork.IsMasterClient) PhotonView.Find(match.Entries[16].View).GetComponent<Role>().Die();
            yield return Until(() => match.Entries[16].Eliminated, 8, "New authority did not accept NPC death.");
            result.deathAfterMigration = match.Remaining == 15 && match.Entries[16].Rank == 0;
            double stars = match.NextStars;
            yield return Until(() => match.NextStars > stars && Scoz.Func.LootSpawner.ActiveCount > 0, 15, "Star waves stopped after migration.");
            result.starWaves = true;
            var local = BattleManager.BM.MyPlayerRole; int before = local.Health;
            if (PhotonNetwork.IsMasterClient) match.Started = PhotonNetwork.Time - 210;
            yield return Until(() => match.Radius < 1000 && local.Health < before, 8, "Shrinking safe zone did not apply storm damage.");
            result.storm = match.Entries[match.LocalSlot].Damage == 0;
            result.passed = result.preservedRoster && result.deathAfterMigration && result.starWaves && result.storm;
            if (!result.passed) throw new Exception(JsonUtility.ToJson(result));
            yield return new WaitForSecondsRealtime(2);
        }
        void Update()
        {
            if (!freeze) return;
            foreach (var role in FindObjectsByType<Role>(FindObjectsSortMode.None))
            {
                if (!role.IsInitialized || !role.IsAlive || !role.HasSimulationAuthority) continue;
                role.RemoveSkill(); role.RemoveFeature(); role.RemoveAllBuffer(); role.BaseMoveSpeed = 0;
                int slot = NeonArena.Instance ? NeonArena.Instance.FindView(role.photonView.ViewID) : 0;
                float a = slot * Mathf.PI * 2 / 32;
                role.transform.position = new Vector3(Mathf.Cos(a) * 2700, Mathf.Sin(a) * 2700, 0);
                role.MyRigi.linearVelocity = Vector2.zero;
            }
        }
    }
}
