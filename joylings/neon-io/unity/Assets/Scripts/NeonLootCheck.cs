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
    // Explicit regression test for the former unbounded network-loot allocation.
    // Values are read from real Fusion snapshots; only the master invokes the production spawner.
    public sealed class NeonLootCheck : MonoBehaviour
    {
        [Serializable] public sealed class Result
        {
            public bool passed;
            public int count, totalValue;
            public string failure;
        }
        public readonly Result result = new Result();
        static readonly Vector3 Position = new Vector3(100000, 100000, 0);
        const float RadiusSquared = 10000 * 10000;
        const int RequestedValue = 700;
        bool runtimeError;

        public IEnumerator Run()
        {
            result.passed = false;
            result.count = result.totalValue = 0;
            result.failure = "";
            runtimeError = false;
            IEnumerator work = Check();
            Application.logMessageReceived += OnLog;
            try
            {
                while (true)
                {
                    bool more = false;
                    object step = null;
                    try
                    {
                        more = work.MoveNext();
                        if (more) step = work.Current;
                    }
                    catch (Exception error)
                    {
                        result.passed = false;
                        result.failure = "Loot stress exception: " + error.Message;
                    }
                    if (!more) yield break;
                    yield return step;
                }
            }
            finally
            {
                Application.logMessageReceived -= OnLog;
                (work as IDisposable)?.Dispose();
            }
        }

        IEnumerator Check()
        {
            float deadline = Time.realtimeSinceStartup + 20;
            while (!PlayersReady() && Time.realtimeSinceStartup < deadline) yield return null;
            if (!PlayersReady()) { Fail("Two initialized Photon players were not ready within 20 seconds."); yield break; }
            int masterActor = PhotonNetwork.MasterClient.ActorNumber;
            if (PhotonNetwork.IsMasterClient)
                Publish("lootRun", Guid.NewGuid().ToString("N"));
            while (string.IsNullOrEmpty(Text(PhotonNetwork.MasterClient, "lootRun")) && Time.realtimeSinceStartup < deadline) yield return null;
            string run = Text(PhotonNetwork.MasterClient, "lootRun");
            if (string.IsNullOrEmpty(run)) { Fail("Loot run token did not synchronize."); yield break; }

            Sample baseline = ReadSample();
            while (!baseline.ready && Time.realtimeSinceStartup < deadline)
            {
                yield return new WaitForSecondsRealtime(0.1f);
                baseline = ReadSample();
            }
            result.count = baseline.count;
            if (!baseline.ready) { Fail("Baseline loot snapshots did not become ready."); yield break; }
            if (baseline.count > LootSpawner.MaxPooledLoot) { Fail("Loot pool already exceeds its 512-object cap."); yield break; }
            if (Object.FindObjectsByType<Role>(FindObjectsSortMode.None).Any(role => (role.transform.position - Position).sqrMagnitude < RadiusSquared))
            {
                Fail("A role is inside the isolated loot test area.");
                yield break;
            }
            PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable
            {
                ["lootBase"] = baseline.value, ["lootReady"] = run
            });
            while (!AllPlayers(p => Text(p, "lootReady") == run) && Time.realtimeSinceStartup < deadline) yield return null;
            if (!AllPlayers(p => Text(p, "lootReady") == run)) { Fail("Loot ready barrier timed out."); yield break; }
            if (!AllPlayers(p => Number(p, "lootBase") == baseline.value)) { Fail("Peers disagree about the isolated-area baseline."); yield break; }

            if (PhotonNetwork.IsMasterClient)
            {
                LootSpawner.SpawnExpLoot(RequestedValue, Position);
                Publish("lootSpawned", run);
            }
            bool acknowledged = false;
            float stableSince = -1;
            while (Time.realtimeSinceStartup < deadline)
            {
                if (runtimeError) { Fail("Unity recorded an error during the network loot stress test."); yield break; }
                if (!PhotonNetwork.InRoom || PhotonNetwork.MasterClient.ActorNumber != masterActor || PhotonNetwork.CurrentRoom.PlayerCount != 2)
                {
                    Fail("The two-player session or master changed during the loot stress test.");
                    yield break;
                }
                Sample current = ReadSample();
                result.count = current.count;
                // This is the newly preserved value in the isolated area, not
                // unrelated natural drops elsewhere in the arena.
                result.totalValue = current.value - baseline.value;
                if (current.count > LootSpawner.MaxPooledLoot) { Fail("Network loot exceeded the 512-object cap."); yield break; }
                bool observed = Text(PhotonNetwork.MasterClient, "lootSpawned") == run && current.ready
                    && current.count == LootSpawner.MaxPooledLoot && result.totalValue >= RequestedValue;
                if (!observed) stableSince = -1;
                else if (stableSince < 0) stableSince = Time.realtimeSinceStartup;
                if (!acknowledged && stableSince >= 0 && Time.realtimeSinceStartup - stableSince >= 0.5f)
                {
                    PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable
                    {
                        ["lootCount"] = result.count, ["lootValue"] = result.totalValue, ["lootSeen"] = run
                    });
                    acknowledged = true;
                }
                if (acknowledged && observed && AllPlayers(p => Text(p, "lootSeen") == run
                    && Number(p, "lootCount") == LootSpawner.MaxPooledLoot && Number(p, "lootValue") >= RequestedValue))
                {
                    result.passed = true;
                    result.failure = "";
                    Debug.Log("NEON_LOOT_STRESS_OK count=" + result.count + " preservedValue=" + result.totalValue);
                    yield break;
                }
                yield return new WaitForSecondsRealtime(0.1f);
            }
            Fail("Loot synchronization or peer confirmation timed out after 20 seconds; count=" + result.count + ", preservedValue=" + result.totalValue + ".");
        }

        struct Sample { public int count, value; public bool ready; }
        static Sample ReadSample()
        {
            ExpLoot[] loots = Object.FindObjectsByType<ExpLoot>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            var sample = new Sample { count = loots.Length, ready = true };
            long value = 0;
            foreach (ExpLoot loot in loots)
            {
                NeonFusionEntity entity = loot.GetComponent<NeonFusionEntity>();
                if (!entity || !entity.Object || !entity.Object.IsValid || !entity.StateReady)
                {
                    sample.ready = false;
                    continue;
                }
                if ((entity.NetworkPosition - Position).sqrMagnitude >= RadiusSquared || !entity.LootActive) continue;
                if (!loot.IsActive || loot.Value != entity.LootValue || entity.LootValue < 1) sample.ready = false;
                value += entity.LootValue;
            }
            sample.value = checked((int)value);
            return sample;
        }
        static bool PlayersReady()
        {
            if (!PhotonNetwork.InRoom || !PhotonNetwork.IsReadyForGameplay || PhotonNetwork.CurrentRoom.PlayerCount != 2 || PhotonNetwork.PlayerList.Length != 2) return false;
            PlayerRole[] roles = Object.FindObjectsByType<PlayerRole>(FindObjectsSortMode.None);
            return roles.Length == 2 && roles.All(role => role.IsInitialized && role.photonView.IsReady)
                && roles.Select(role => role.photonView.Owner.ActorNumber).Distinct().Count() == 2;
        }
        static bool AllPlayers(Func<Player, bool> predicate)
        {
            Player[] players = PhotonNetwork.PlayerList;
            return PhotonNetwork.InRoom && players.Length == 2 && players.All(predicate);
        }
        static string Text(Player player, string key) { return player.CustomProperties[key] as string; }
        static int Number(Player player, string key) { return player.CustomProperties[key] is int value ? value : -1; }
        static void Publish(string key, string value)
        {
            PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable { [key] = value });
        }
        void Fail(string message) { result.passed = false; result.failure = message; }
        void OnLog(string message, string stack, LogType type)
        {
            if (type == LogType.Error || type == LogType.Exception || type == LogType.Assert) runtimeError = true;
        }
    }
}
