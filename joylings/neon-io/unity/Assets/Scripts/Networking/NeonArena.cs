using System;
using PlayerPrefs = Neon.ProfilePreferences;
using System.Collections.Generic;
using System.Linq;
using Fusion;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Neon.Networking
{
    public enum ArenaPhase { Waiting, Loading, Running, Finished }
    public struct ArenaEntry : INetworkStruct
    {
        public int Actor, View, Rank, Kills, Damage, Sequence;
        public NetworkBool Eliminated;
        public NetworkString<_64> Name;
    }

    public sealed class NeonArena : NetworkBehaviour
    {
        static NeonArena instance;
        public static NeonArena Instance => instance && instance.Object && instance.Object.IsValid && !PhotonNetwork.IsDisconnecting ? instance : null;
        [Networked] public ArenaPhase Phase { get; set; }
        [Networked] public double Deadline { get; set; }
        [Networked] public double Started { get; set; }
        [Networked] public double NextStars { get; set; }
        [Networked] public NetworkString<_64> MatchId { get; set; }
        [Networked, Capacity(32)] public NetworkArray<ArenaEntry> Entries => default;
        readonly Dictionary<int, int> sentSequences = new Dictionary<int, int>();
        float nextMaintenance, nextStorm;
        LineRenderer ring;
        Material ringMaterial;
        public float Elapsed => Phase >= ArenaPhase.Running ? Mathf.Max(0, (float)(Runner.SimulationTime - Started)) : 0;
        public float Radius => NeonArenaRules.Radius(Elapsed);
        public int Remaining => Enumerable.Range(0, 16).Count(i => !Entries[i].Eliminated);
        public int LocalSlot => FindActor(PhotonNetwork.LocalPlayer.ActorNumber);
        public bool HasLocalResult => LocalSlot >= 0 && Entries[LocalSlot].Rank > 0;
        public override void Spawned()
        {
            instance = this;
            Runner.MakeDontDestroyOnLoad(gameObject);
            if (HasStateAuthority && Deadline == 0)
            {
                Deadline = Runner.SimulationTime + NeonArenaRules.QueueSeconds;
                MatchId = Guid.NewGuid().ToString("N");
            }
        }
        public override void Despawned(NetworkRunner runner, bool hasState)
        {
            if (instance == this) instance = null;
        }
        void OnDestroy()
        {
            if (instance == this) instance = null;
            if (ring) Destroy(ring.gameObject);
            if (ringMaterial) Destroy(ringMaterial);
        }
        public int FindActor(int actor)
        {
            if (actor <= 0 || !Object || !Object.IsValid) return -1;
            for (int i = 0; i < 16; i++) if (Entries[i].Actor == actor) return i;
            return -1;
        }
        public int FindView(int view)
        {
            if (view == 0 || !Object || !Object.IsValid) return -1;
            for (int i = 0; i < 32; i++) if (Entries[i].View == view) return i;
            return -1;
        }
        public static int DropCount(Role role) => Instance ? NeonArenaRules.DropCount(Instance.FindView(role.photonView.ViewID)) : 0;
        public override void FixedUpdateNetwork()
        {
            if (!HasStateAuthority) return;
            if (Phase == ArenaPhase.Waiting)
            {
                if (Runner.SimulationTime < Deadline && Runner.ActivePlayers.Count() < 16) return;
                Runner.SessionInfo.IsOpen = false;
                var humans = Runner.ActivePlayers.OrderBy(p => p.RawEncoded).Take(16).ToArray();
                for (int i = 0; i < 32; i++)
                {
                    var row = new ArenaEntry();
                    if (i < humans.Length) { row.Actor = humans[i].RawEncoded; row.Name = PhotonNetwork.GetPlayer(humans[i]).NickName; }
                    else if (i < 16) row.Name = RandomName(i);
                    Entries.Set(i, row);
                }
                Phase = ArenaPhase.Loading; Deadline = Runner.SimulationTime + 60;
                PhotonNetwork.LoadLevel("Battle");
                return;
            }
            if (!BattleManager.BM || !BattleManager.BM.IsReadyToSpawn) return;
            if (Time.unscaledTime < nextMaintenance) return;
            nextMaintenance = Time.unscaledTime + .25f;
            var connected = new HashSet<int>(Runner.ActivePlayers.Select(p => p.RawEncoded));
            if (Phase == ArenaPhase.Loading)
            {
                // Recovery also finds already-spawned AI if authority changed between spawn and roster publication.
                var roles = FindObjectsByType<Role>(FindObjectsSortMode.None).Where(r => r.IsInitialized).ToArray();
                int spawned = 0, complete = 0;
                for (int i = 0; i < 32; i++)
                {
                    var row = Entries[i];
                    Role role = row.Actor > 0
                        ? roles.FirstOrDefault(r => r is PlayerRole && r.photonView.Owner?.ActorNumber == row.Actor)
                        : roles.FirstOrDefault(r => r is NeutralRole && r.ID == 10000 + i);
                    if (row.Actor > 0 && (!connected.Contains(row.Actor) || (!role && Runner.SimulationTime >= Deadline)))
                    { row.Actor = 0; row.Name = RandomName(i); role = null; }
                    if (!role && row.Actor == 0 && spawned < 4)
                    {
                        var ai = BattleManager.BM.SpawnRandomNeutral();
                        if (ai) { ai.SetPlayerData(row.Name.ToString(), 10000 + i); role = ai; spawned++; }
                    }
                    if (role) { row.View = role.photonView.ViewID; complete++; }
                    Entries.Set(i, row);
                }
                if (complete == 32)
                { Phase = ArenaPhase.Running; Started = Runner.SimulationTime; NextStars = Started; }
                return;
            }
            if (Phase != ArenaPhase.Running) return;
            for (int i = 0; i < 16; i++)
                if (Entries[i].Actor > 0 && !connected.Contains(Entries[i].Actor) && !Entries[i].Eliminated) Eliminate(i, -1);
            if (Phase != ArenaPhase.Running) return;
            if (Runner.SimulationTime >= NextStars)
            {
                float radius = Radius;
                // Pace individual stars across the interval. A late tick or host handover
                // must never replay missed waves as a burst at the centre of a small circle.
                NextStars = Runner.SimulationTime + NeonArenaRules.AmbientStarInterval(radius);
                if (NeonArenaRules.CanSpawnAmbientStar(radius, LootSpawner.ActiveCountWithin(radius), LootSpawner.ActiveCount))
                    LootSpawner.SpawnExpLoot(1, UnityEngine.Random.insideUnitCircle * Mathf.Max(0, radius - 120));
            }
        }
        static string RandomName(int slot)
        {
            string[] prefixes = { "Nova", "Orbit", "Comet", "Vega", "Luna", "Aster", "Cosmo", "Sol" };
            return prefixes[UnityEngine.Random.Range(0, prefixes.Length)] + UnityEngine.Random.Range(100, 999) + "_" + (slot + 1);
        }
        public override void Render()
        {
            if (!Object || !Object.IsValid || PhotonNetwork.IsDisconnecting) return;
            if (!BattleManager.BM || SceneManager.GetActiveScene().name != "Battle") return;
            if (Phase >= ArenaPhase.Running && FindActor(PhotonNetwork.LocalPlayer.ActorNumber) < 0)
            { FindFirstObjectByType<BattleUI>()?.LeaveRoom(); return; }
            BattleManager.BM.BattleFieldRadius = Mathf.RoundToInt(Radius);
            DrawRing();
            if (HasLocalResult) SaveReward();
            if (Phase != ArenaPhase.Running || Time.unscaledTime < nextStorm) return;
            nextStorm = Time.unscaledTime + 1;
            // Each actor's state authority applies its own storm tick. The match roster is master-owned.
            foreach (var role in FindObjectsByType<Role>(FindObjectsSortMode.None))
                if (role.HasSimulationAuthority && role.IsAlive && FindView(role.photonView.ViewID) >= 0 &&
                    (Radius <= 0 || ((Vector2)role.transform.position).sqrMagnitude > Radius * Radius))
                    role.ArenaStormDamage(NeonArenaRules.StormDamage(Elapsed, role.MaxHealth));
        }
        public static void Report(Role victim, int attackerView, int damage, bool death)
        {
            var match = Instance;
            if (!match || match.Phase != ArenaPhase.Running || !victim.HasSimulationAuthority) return;
            int slot = match.FindView(victim.photonView.ViewID);
            if (slot < 0) return;
            match.sentSequences.TryGetValue(slot, out int sequence);
            sequence = Math.Max(sequence, match.Entries[slot].Sequence) + 1;
            match.sentSequences[slot] = sequence;
            match.RPC_Combat(slot, match.FindView(attackerView), sequence, damage, death);
        }
        [Rpc(RpcSources.All, RpcTargets.StateAuthority, Channel = RpcChannel.Reliable)]
        public void RPC_Combat(int victim, int attacker, int sequence, int damage, NetworkBool death, RpcInfo info = default)
        {
            if (Phase != ArenaPhase.Running || victim < 0 || victim >= 32 || attacker < -1 || attacker >= 32) return;
            var row = Entries[victim];
            var view = PhotonView.Find(row.View);
            if (row.Eliminated || sequence <= row.Sequence || !view || view.Owner?.ActorNumber != info.Source.RawEncoded) return;
            var role = view.GetComponent<Role>();
            if (!role || damage < 0 || damage > role.MaxHealth) return;
            row.Sequence = sequence; Entries.Set(victim, row);
            if (attacker >= 0 && attacker != victim && !Entries[attacker].Eliminated)
            {
                var credited = Entries[attacker];
                credited.Damage = Mathf.Min(1000000, credited.Damage + damage);
                Entries.Set(attacker, credited);
            }
            if (death) Eliminate(victim, attacker);
        }
        void Eliminate(int victim, int attacker)
        {
            var row = Entries[victim];
            if (row.Eliminated) return;
            if (victim < 16) row.Rank = Remaining;
            row.Eliminated = true; Entries.Set(victim, row);
            if (attacker >= 0 && attacker != victim && !Entries[attacker].Eliminated)
            { var killer = Entries[attacker]; killer.Kills++; Entries.Set(attacker, killer); }
            if (Remaining != 1) return;
            for (int i = 0; i < 16; i++)
                if (!Entries[i].Eliminated) { var winner = Entries[i]; winner.Rank = 1; Entries.Set(i, winner); break; }
            Phase = ArenaPhase.Finished;
        }
        public void SaveReward()
        {
            if (!HasLocalResult) return;
            string id = MatchId.ToString();
            if (PlayerPrefs.GetString("Neon.Arena.LastReward", "") == id) return;
            var row = Entries[LocalSlot];
            MyPlayer.MatchSettlement(NeonArenaRules.Reward(row.Rank, row.Kills, row.Damage), row.Kills);
            PlayerPrefs.SetString("Neon.Arena.LastReward", id); PlayerPrefs.Save();
        }
        void DrawRing()
        {
            if (!ring)
            {
                ring = new GameObject("Arena safe zone").AddComponent<LineRenderer>();
                ringMaterial = new Material(Shader.Find("Sprites/Default")); ring.sharedMaterial = ringMaterial;
                ring.loop = true; ring.useWorldSpace = true; ring.positionCount = 128;
                ring.startWidth = ring.endWidth = 18;
                ring.startColor = ring.endColor = new Color(.84f, .73f, .43f, .8f); ring.sortingOrder = 20;
            }
            for (int i = 0; i < 128; i++)
            { float angle = i * Mathf.PI * 2 / 128; ring.SetPosition(i, new Vector3(Mathf.Cos(angle) * Radius, Mathf.Sin(angle) * Radius, 0)); }
        }
    }
}
