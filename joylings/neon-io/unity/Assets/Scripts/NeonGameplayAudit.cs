using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading;
using Neon.Networking;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Neon.Validation
{
    // Runs only when explicitly requested by the smoke runner or Web QA bridge.
    public static class NeonGameplayAudit
    {
        [Serializable] public sealed class Result
        {
            public bool passed;
            public bool allocationCounterAvailable;
            public string failure;
            public List<string> checks = new List<string>();
            public long legacySearchBytes, registrySearchBytes;
            public double legacySearchMilliseconds, registrySearchMilliseconds;
        }
        static readonly BindingFlags Fields = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;
        static void Set(object value, Type type, string name, object field) => type.GetField(name, Fields).SetValue(value, field);
        static T Get<T>(object value, Type type, string name) => (T)type.GetField(name, Fields).GetValue(value);
        static void Require(bool condition, string message) { if (!condition) throw new InvalidOperationException(message); }

        public static void CheckTimersAndGeometry(Result result)
        {
            int count = 0;
            var timer = new MyTimer(.1f, () => count++, true, true);
            timer.RunTimer(.15f);
            Require(count == 1 && Mathf.Abs(timer.CurTimer - .05f) < .00001f, "Cooldown loses a frame or overshoot.");
            timer.RunTimer(.05f);
            Require(count == 2 && timer.CurTimer > .099f, "Cooldown remainder fires twice at a boundary.");
            timer.RunTimer(.001f);
            Require(count == 2, "Cooldown triggered early.");
            int once = 0;
            var oneShot = new MyTimer(.1f, () => once++, true, false);
            oneShot.RunTimer(.2f); oneShot.RunTimer(3f);
            Require(once == 1 && !oneShot.StartRunTimer, "One-shot timer repeats.");
            int slow = 0, fast = 0; float remainSlow = 1, remainFast = 1;
            var slowTimer = new PreciseTimer(.25f, 1, () => slow++, true, true);
            var fastTimer = new PreciseTimer(.25f, 1, () => fast++, true, true);
            slowTimer.RunTimer(ref remainSlow, 1.01f);
            for (int i = 0; i < 101; i++) fastTimer.RunTimer(ref remainFast, .01f);
            slowTimer.RunTimer(ref remainSlow, 1f);
            Require(slow == 4 && fast == 4 && remainSlow == 0 && remainFast == 0 && !slowTimer.StartRunTimer,
                "Periodic damage count depends on frame rate or continues after expiration.");
            result.checks.Add("Cooldown boundaries and periodic damage under slow/fast frames");
            foreach (float aspect in new[] { 4f / 3f, 16f / 10f, 16f / 9f, 21f / 9f })
            {
                var half = new Vector2(540 * aspect, 540);
                foreach (var delta in new[] { new Vector2(5000, 0), new Vector2(0, -5000), new Vector2(-5000, 5000) })
                {
                    Require(CombatRegistry.TryIndicatorPosition(delta, half, 25, out var edge), "Off-screen target has no indicator.");
                    Require(!float.IsNaN(edge.x) && !float.IsNaN(edge.y) && Mathf.Abs(edge.x) <= half.x - 24 && Mathf.Abs(edge.y) <= half.y - 24,
                        "Indicator escapes the current camera aspect.");
                }
                Require(!CombatRegistry.TryIndicatorPosition(Vector2.zero, half, 25, out _), "On-screen target has an indicator.");
            }
            result.checks.Add("Target indicators at 4:3, 16:10, 16:9 and 21:9");
        }

        public static Result Run()
        {
            var result = new Result();
            try
            {
                CheckTimersAndGeometry(result);
                CheckHitCooldowns(result);
                CheckDeadline(result);
                CheckTargets(result);
                CheckAudio(result);
                result.passed = true;
            }
            catch (Exception error) { result.failure = error.ToString(); }
            return result;
        }

        public static void CheckHitCooldowns(Result result)
        {
            var first = new GameObject("Cooldown target");
            var second = new GameObject("Cooldown target");
            try
            {
                var cooldown = new HitCooldowns();
                Require(cooldown.TryHit(first, 0, 1) && !cooldown.TryHit(first, .99, 1), "A hit bypasses its cooldown.");
                Require(cooldown.TryHit(second, .99, 1), "Different actors with the same name share a cooldown.");
                Require(cooldown.TryHit(first, 1.99, 1) && !cooldown.TryHit(first, 2.01, 1), "Cooldown is anchored to the first hit, not the last hit.");
                Require(cooldown.TryHit(first, 3, 1), "Cooldown never expires.");
                cooldown.Clear();
                Require(cooldown.TryHit(first, 0, 0) && !cooldown.TryHit(first, 1000, 0), "Single-hit projectile hits the same target twice.");
                cooldown.Clear();
                Require(cooldown.TryHit(first, 0, 0), "Reused projectile retains previous targets.");
                result.checks.Add("Per-target cooldown after idle, distinct actors and single-hit/reuse semantics");
            }
            finally { Object.DestroyImmediate(first); Object.DestroyImmediate(second); }
        }

        static void CheckDeadline(Result result)
        {
            var runtime = PhotonNetwork.EnsureRuntime();
            var type = typeof(NeonFusionRuntime);
            var previous = Get<CancellationTokenSource>(runtime, type, "connectionCancellation");
            float started = Get<float>(runtime, type, "joinStartedAt");
            bool connecting = runtime.IsConnecting;
            float scale = Time.timeScale;
            using (var cancellation = new CancellationTokenSource())
            {
                try
                {
                    Set(runtime, type, "connectionCancellation", cancellation);
                    Set(runtime, type, "<IsConnecting>k__BackingField", true);
                    Set(runtime, type, "joinStartedAt", Time.realtimeSinceStartup - 41);
                    Time.timeScale = 0;
                    type.GetMethod("Update", Fields).Invoke(runtime, null);
                    Require(cancellation.IsCancellationRequested, "Connection deadline does not fire on Unity's main thread while paused.");
                }
                finally
                {
                    Set(runtime, type, "connectionCancellation", previous);
                    Set(runtime, type, "joinStartedAt", started);
                    Set(runtime, type, "<IsConnecting>k__BackingField", connecting);
                    Time.timeScale = scale;
                }
            }
            using (var cancellation = new CancellationTokenSource())
            {
                try
                {
                    Set(runtime, type, "connectionCancellation", cancellation);
                    Set(runtime, type, "joinStartedAt", Time.realtimeSinceStartup - 41);
                    Set(runtime, type, "<IsConnecting>k__BackingField", false);
                    type.GetMethod("Update", Fields).Invoke(runtime, null);
                    Require(!cancellation.IsCancellationRequested, "Connected session retains its startup deadline.");
                }
                finally
                {
                    Set(runtime, type, "connectionCancellation", previous);
                    Set(runtime, type, "joinStartedAt", started);
                    Set(runtime, type, "<IsConnecting>k__BackingField", connecting);
                }
            }
            result.checks.Add("Main-thread connection timeout while paused; connected sessions excluded");
        }

        static NeutralRole Target(string name, Vector2 position, bool alive)
        {
            var go = new GameObject(name); go.transform.position = position;
            go.AddComponent<Rigidbody2D>().bodyType = RigidbodyType2D.Kinematic;
            var role = go.AddComponent<NeutralRole>();
            Set(role, typeof(Role), "IsInit", true);
            Set(role, typeof(Role), "<IsAlive>k__BackingField", alive);
            Set(role, typeof(Role), "<MyForce>k__BackingField", Force.Opponent);
            go.tag = "Opponent";
            return role;
        }
        static void CheckTargets(Result result)
        {
            int count = CombatRegistry.Roles.Count;
            var self = Target("Audit attacker", new Vector2(100000, 0), true);
            var dead = Target("Audit dead target", new Vector2(100001, 0), false);
            var live = Target("Audit living target", new Vector2(100002, 0), true);
            Set(self, typeof(Role), "<MyForce>k__BackingField", Force.Player); self.tag = "Player";
            var go = new GameObject("Audit homing projectile");
            var rigid = go.AddComponent<Rigidbody2D>(); rigid.bodyType = RigidbodyType2D.Kinematic;
            var shot = go.AddComponent<ShootAmmo>(); go.transform.position = self.transform.position;
            try
            {
                Require(GameobjectFinder.FindClosestRole(self.gameObject) == live, "AI targets a dead role.");
                Require(GameobjectFinder.FindClosestGameobjectWithTags(self.gameObject, "Opponent") == live.gameObject, "Target search includes dead roles.");
                live.gameObject.SetActive(false);
                Require(CombatRegistry.Roles.Count == count + 2, "Disabled role remains registered.");
                live.gameObject.SetActive(true);
                Require(CombatRegistry.Roles.Count == count + 3, "Re-enabled role was lost or registered twice.");
                Set(shot, typeof(Ammo), "Target", dead); Set(shot, typeof(Ammo), "Attacker", self);
                Set(shot, typeof(Ammo), "MyRigi", rigid); Set(shot, typeof(ShootAmmo), "TraceFactor", .1f);
                typeof(ShootAmmo).GetMethod("Update", Fields).Invoke(shot, null);
                Require(Get<Role>(shot, typeof(Ammo), "Target") == live, "Homing projectile keeps a corpse as its target.");
                int projectiles = CombatRegistry.Projectiles.Count;
                go.SetActive(false);
                Require(CombatRegistry.Projectiles.Count == projectiles - 1, "Disabled projectile remains registered.");
                var watch = new System.Diagnostics.Stopwatch();
                var tags = new[] { "Opponent" };
                GameobjectFinder.FindClosestGameobjectWithTags(self.gameObject, tags);
                long begin = GC.GetAllocatedBytesForCurrentThread(); watch.Start();
                for (int i = 0; i < 1000; i++) GameobjectFinder.FindClosestGameobjectWithTags(self.gameObject, tags);
                watch.Stop(); result.registrySearchBytes = GC.GetAllocatedBytesForCurrentThread() - begin;
                result.registrySearchMilliseconds = watch.Elapsed.TotalMilliseconds;
                watch.Reset(); begin = GC.GetAllocatedBytesForCurrentThread(); watch.Start();
                for (int i = 0; i < 1000; i++)
                {
                    var old = new List<GameObject>(); old.AddRange(GameObject.FindGameObjectsWithTag("Opponent"));
                    float nearest = float.PositiveInfinity;
                    foreach (var item in old) nearest = Mathf.Min(nearest, Vector2.Distance(self.transform.position, item.transform.position));
                }
                watch.Stop(); result.legacySearchBytes = GC.GetAllocatedBytesForCurrentThread() - begin;
                result.legacySearchMilliseconds = watch.Elapsed.TotalMilliseconds;
                // Some Unity players return zero for this optional CLR counter.
                // Keep measured CPU timings, but never claim zero allocations.
                result.allocationCounterAvailable = result.legacySearchBytes > 0;
                if (result.allocationCounterAvailable)
                    Require(result.registrySearchBytes < result.legacySearchBytes, "Target search allocation did not decrease.");
                result.checks.Add("Live-target registry, disable/re-enable, homing retarget and 1000-query allocation comparison");
            }
            finally
            {
                Object.DestroyImmediate(go); Object.DestroyImmediate(self.gameObject);
                Object.DestroyImmediate(dead.gameObject); Object.DestroyImmediate(live.gameObject);
            }
            Require(CombatRegistry.Roles.Count == count, "Destroyed roles leaked in the registry.");
        }

        static void CheckAudio(Result result)
        {
            var type = typeof(AudioPlayer);
            var flags = BindingFlags.Static | BindingFlags.NonPublic;
            var music = (List<AudioSource>)type.GetField("MusicList", flags).GetValue(null);
            var loops = (Dictionary<string, AudioSource>)type.GetField("LoopMusicDic", flags).GetValue(null);
            var saved = new List<(string key, AudioClip clip, float time, float volume)>();
            foreach (var pair in loops) if (pair.Value) saved.Add((pair.Key, pair.Value.clip, pair.Value.time, pair.Value.volume));
            var clip = Resources.Load<AudioClip>("Music/Lobby");
            if (!clip && saved.Count > 0) clip = saved[0].clip;
            Require(clip, "No original music is available for the audio regression.");
            try
            {
                AudioPlayer.StopAllMusic(); foreach (var source in music) source.Stop();
                var faded = AudioPlayer.PlayLoopMusic_Static(clip, "audit-faded");
                faded.volume = 0; AudioPlayer.FadeOutMusic("audit-faded", .5f);
                Require(!faded.loop && !loops.ContainsKey("audit-faded"), "Fading a silent track leaves a reserved source.");
                var reused = AudioPlayer.PlayLoopMusic_Static(clip, "audit-reused");
                Require(reused && reused.volume == 1, "Music source stays silent after a fade-out.");
                AudioPlayer.PlayMusicByAudioClip_Static(clip);
                Require(reused.loop, "One-shot music overwrites an active looping track via the wrong pool.");
                Require(AudioPlayer.PlayLoopMusicAtSecond_Static(clip, "audit-reused", 9999) == null,
                    "Duplicate music key changed playback.");
                result.checks.Add("Music pool selection, volume restoration and duplicate loop key");
            }
            finally
            {
                AudioPlayer.StopAllMusic(); foreach (var source in music) source.Stop();
                foreach (var item in saved)
                {
                    var source = AudioPlayer.PlayLoopMusicAtSecond_Static(item.clip, item.key, item.time);
                    if (source) source.volume = item.volume;
                }
            }
        }
    }
}
