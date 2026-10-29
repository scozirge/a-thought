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
        public int Actor, View, Rank, Kills, Damage, Sequence, Rating, Stars;
        public ArenaAppearance Appearance;
        public NetworkBool AppearanceFinal;
        public NetworkBool HumanAtStart;
        public NetworkBool Eliminated;
        public NetworkString<_64> Name;
    }

    public sealed class NeonArena : NetworkBehaviour
    {
        static NeonArena instance;
        public static NeonArena Instance => instance && instance.Object && instance.Object.IsValid && !PhotonNetwork.IsDisconnecting ? instance : null;
        [Networked] public ArenaPhase Phase { get; set; }
        [Networked] public int BotRating { get; set; }
        [Networked] public double Deadline { get; set; }
        [Networked] public double Started { get; set; }
        [Networked] public double NextStars { get; set; }
        [Networked] public NetworkString<_64> MatchId { get; set; }
        [Networked, Capacity(32)] public NetworkArray<ArenaEntry> Entries => default;
        readonly Dictionary<int, int> sentSequences = new Dictionary<int, int>();
        readonly Dictionary<int, ArenaAppearance> sentAppearances = new Dictionary<int, ArenaAppearance>();
        float nextAppearanceCapture;
        float nextMaintenance, nextStorm;
        NeonArenaFog fog;
        bool localRatingTracked;
        bool finalAppearanceSent;
        public float Elapsed => Phase >= ArenaPhase.Running ? Mathf.Max(0, (float)(Runner.SimulationTime - Started)) : 0;
        public float Radius => NeonArenaRules.Radius(Elapsed);
        public int Remaining => Enumerable.Range(0, 16).Count(i => !Entries[i].Eliminated);
        public int LocalSlot => FindActor(PhotonNetwork.LocalPlayer.ActorNumber);
        public bool HasLocalResult => LocalSlot >= 0 && Entries[LocalSlot].Rank > 0;
        public override void Spawned()
        {
            instance = this;
            var spectator = GetComponent<NeonArenaSpectator>();
            if (!spectator) spectator = gameObject.AddComponent<NeonArenaSpectator>();
            spectator.Initialize(this);
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
                // One second is the queue window; session metadata may still be arriving.
                bool ratingsReady = Runner.ActivePlayers.All(p => {
                    var session = PhotonNetwork.GetPlayer(p).Session;
                    return session && session.Object && session.Object.IsValid && session.Ready;
                });
                if (!ratingsReady && Runner.SimulationTime < Deadline + 9) return;
                Runner.SessionInfo.IsOpen = false;
                var humans = Runner.ActivePlayers.OrderBy(p => p.RawEncoded).Take(16).ToArray();
                for (int i = 0; i < 32; i++)
                {
                    var row = new ArenaEntry();
                    if (i < humans.Length)
                    {
                        var player = PhotonNetwork.GetPlayer(humans[i]);
                        row.Actor = humans[i].RawEncoded; row.Name = player.NickName; row.HumanAtStart = true;
                        row.Rating = player.Session && player.Session.Ready ? Mathf.Clamp(player.Session.ArenaRating, 0, NeonArenaRating.Maximum) : NeonArenaRating.Initial;
                    }
                    else if (i < 16) row.Name = RandomName(i);
                    Entries.Set(i, row);
                }
                BotRating = humans.Length > 0 ? Mathf.RoundToInt((float)Enumerable.Range(0, humans.Length).Average(i => Entries[i].Rating)) : NeonArenaRating.Initial;
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
                    { row.Actor = 0; row.HumanAtStart = false; row.Name = RandomName(i); role = null; }
                    if (!role && row.Actor == 0 && spawned < 4)
                    {
                        var ai = BattleManager.BM.SpawnRandomNeutral();
                        if (ai)
                        {
                            ai.SetPlayerData(row.Name.ToString(), 10000 + i);
                            if (i < NeonArenaRules.PlayerSeats)
                            {
                                ai.MaxHealth = NeonArenaRules.InitialPlayerHealth;
                                ai.SetProportionOfHP(1);
                            }
                            role = ai; spawned++;
                        }
                    }
                    if (role)
                    {
                        row.View = role.photonView.ViewID;
                        if (role.IsAlive) row.Appearance = ArenaAppearance.Capture(role);
                        complete++;
                    }
                    Entries.Set(i, row);
                }
                if (complete == 32)
                {
                    var ratings = Enumerable.Range(0, 16).Where(i => Entries[i].HumanAtStart).Select(i => Entries[i].Rating).ToArray();
                    BotRating = ratings.Length > 0 ? Mathf.RoundToInt((float)ratings.Average()) : NeonArenaRating.Initial;
                    Phase = ArenaPhase.Running; Started = Runner.SimulationTime; NextStars = Started;
                }
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
            if (!fog) fog = gameObject.AddComponent<NeonArenaFog>();
            fog.SetRadius(Radius);
            if (Phase >= ArenaPhase.Running && LocalSlot >= 0 && !localRatingTracked)
            {
                NeonArenaRating.Begin(MatchId.ToString(), RatingDelta(LocalSlot, 16)); localRatingTracked = true;
            }
            if (HasLocalResult) SaveReward();
            // Each role owner publishes equipment changes, including the surviving winner.
            // Never replace a death snapshot with the now-empty live role.
            if ((Phase == ArenaPhase.Running && Time.unscaledTime >= nextAppearanceCapture) ||
                (Phase == ArenaPhase.Finished && !finalAppearanceSent))
            {
                bool final = Phase == ArenaPhase.Finished;
                if (final) finalAppearanceSent = true;
                nextAppearanceCapture = Time.unscaledTime + .25f;
                for (int i = 0; i < NeonArenaRules.PlayerSeats; i++)
                {
                    var entry = Entries[i];
                    if (entry.Eliminated) continue;
                    var view = PhotonView.Find(entry.View);
                    var role = view ? view.GetComponent<Role>() : null;
                    if (!role || !role.IsInitialized || !role.IsAlive || !role.HasSimulationAuthority) continue;
                    var appearance = ArenaAppearance.Capture(role);
                    if (!final && sentAppearances.TryGetValue(i, out var previous) && previous.SameAs(appearance)) continue;
                    sentAppearances[i] = appearance;
                    RPC_Appearance(i, appearance, final);
                }
            }
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
            match.RPC_Combat(slot, match.FindView(attackerView), sequence, damage, death,
                death ? ArenaAppearance.Capture(victim) : default);
        }
        [Rpc(RpcSources.All, RpcTargets.StateAuthority, Channel = RpcChannel.Reliable)]
        public void RPC_Appearance(int slot, ArenaAppearance appearance, NetworkBool final, RpcInfo info = default)
        {
            if (Phase < ArenaPhase.Running || slot < 0 || slot >= NeonArenaRules.PlayerSeats || !appearance.IsValid) return;
            var row = Entries[slot];
            var view = PhotonView.Find(row.View);
            if (row.Eliminated || row.AppearanceFinal || !view || view.Owner?.ActorNumber != info.Source.RawEncoded) return;
            if (final && (Phase != ArenaPhase.Finished || row.Rank != 1)) return;
            row.Appearance = appearance;
            row.AppearanceFinal = final;
            Entries.Set(slot, row);
        }

        // Only called after the loot authority reserves a physical pickup. Count its
        // original star value (including merged loot), never XP, level-ups or rewards.
        public static void RecordStarPickup(Role role, int count)
        {
            var match = Instance;
            if (!match || !match.HasStateAuthority || match.Phase != ArenaPhase.Running || count <= 0) return;
            int slot = match.FindView(role.photonView.ViewID);
            if (slot < 0) return;
            var row = match.Entries[slot];
            if (row.Eliminated) return;
            row.Stars = (int)Math.Min(int.MaxValue, (long)row.Stars + count);
            match.Entries.Set(slot, row);
        }

        [Rpc(RpcSources.All, RpcTargets.StateAuthority, Channel = RpcChannel.Reliable)]
        public void RPC_Combat(int victim, int attacker, int sequence, int damage, NetworkBool death, ArenaAppearance appearance, RpcInfo info = default)
        {
            if (Phase != ArenaPhase.Running || victim < 0 || victim >= 32 || attacker < -1 || attacker >= 32) return;
            var row = Entries[victim];
            var view = PhotonView.Find(row.View);
            if (row.Eliminated || sequence <= row.Sequence || !view || view.Owner?.ActorNumber != info.Source.RawEncoded) return;
            var role = view.GetComponent<Role>();
            if (!role || damage < 0 || damage > role.MaxHealth) return;
            if (death && appearance.IsValid) row.Appearance = appearance;
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
            row.Eliminated = true; row.AppearanceFinal = true; Entries.Set(victim, row);
            if (attacker >= 0 && attacker != victim && !Entries[attacker].Eliminated)
            { var killer = Entries[attacker]; killer.Kills++; Entries.Set(attacker, killer); }
            if (Remaining != 1) return;
            for (int i = 0; i < 16; i++)
                if (!Entries[i].Eliminated) { var winner = Entries[i]; winner.Rank = 1; Entries.Set(i, winner); break; }
            Phase = ArenaPhase.Finished;
        }
        public int RatingDelta(int slot, int rank)
        {
            var opponents = new List<int>();
            for (int i = 0; i < 16; i++)
                if (i != slot && Entries[i].HumanAtStart) opponents.Add(Entries[i].Rating);
            return NeonArenaRating.Delta(rank, Entries[slot].Rating, opponents);
        }
        public void LeaveRatedMatch()
        {
            if (HasLocalResult) { SaveReward(); return; }
            if (Phase == ArenaPhase.Running && LocalSlot >= 0)
            {
                NeonArenaRating.Begin(MatchId.ToString(), RatingDelta(LocalSlot, 16));
                NeonArenaRating.RecoverAbandoned();
            }
        }
        public void SaveReward()
        {
            if (!HasLocalResult) return;
            string id = MatchId.ToString();
            NeonArenaRating.Complete(id, RatingDelta(LocalSlot, Entries[LocalSlot].Rank));
            if (PlayerPrefs.GetString("Neon.Arena.LastReward", "") == id) return;
            var row = Entries[LocalSlot];
            MyPlayer.MatchSettlement(NeonArenaRules.Reward(row.Rank, row.Kills, row.Damage), row.Kills);
            PlayerPrefs.SetString("Neon.Arena.LastReward", id); PlayerPrefs.Save();
        }
    }
}
