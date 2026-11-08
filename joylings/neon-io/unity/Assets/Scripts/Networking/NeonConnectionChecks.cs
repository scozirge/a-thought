#if UNITY_EDITOR
using System;
using System.Reflection;
using Fusion;
using UnityEngine;

namespace Neon.Networking
{
    // Editor-only policy/clock fixtures. Never starts a runner, match or scene simulation.
    public static class NeonConnectionChecks
    {
        public static void Run()
        {
            foreach (ShutdownReason reason in Enum.GetValues(typeof(ShutdownReason)))
            {
                bool transientRoom = reason == ShutdownReason.GameClosed || reason == ShutdownReason.GameIsFull || reason == ShutdownReason.GameNotFound;
                Require(NeonConnectionPolicy.RetryArenaRoom(reason, true, 0, false) == transientRoom, "Wrong retry classification: " + reason);
                Require(!NeonConnectionPolicy.RetryArenaRoom(reason, false, 0, false), "Named/non-arena room must not silently move rooms.");
                Require(!NeonConnectionPolicy.RetryArenaRoom(reason, true, 0, true), "Cancelled queue restarted.");
                Require(!NeonConnectionPolicy.RetryArenaRoom(reason, true, 2, false), "Retry budget exceeded.");
            }
            Require(NeonConnectionPolicy.RetryArenaRoom(ShutdownReason.GameIsFull, true, 1, false), "Second transient room failure should still retry.");

            // Scene first, match object second, roster snapshot last: none of the partial
            // states may eject the player; only the completed roster can reject a late join.
            Require(!NeonConnectionPolicy.RosterReady(false, ArenaPhase.Waiting, false) &&
                !NeonConnectionPolicy.RosterRejected(false, ArenaPhase.Waiting, false), "Missing match was treated as a final rejection.");
            Require(!NeonConnectionPolicy.RosterReady(true, ArenaPhase.Waiting, false) &&
                !NeonConnectionPolicy.RosterRejected(true, ArenaPhase.Waiting, false), "Waiting snapshot ejected a valid joining player.");
            Require(!NeonConnectionPolicy.RosterReady(true, ArenaPhase.Waiting, true), "Player spawned before roster lock.");
            Require(NeonConnectionPolicy.RosterReady(true, ArenaPhase.Loading, true) &&
                NeonConnectionPolicy.RosterReady(true, ArenaPhase.Running, true), "Completed local roster did not permit spawning.");
            Require(NeonConnectionPolicy.RosterRejected(true, ArenaPhase.Loading, false) &&
                NeonConnectionPolicy.RosterRejected(true, ArenaPhase.Running, false), "Closed roster accepted an unlisted late join.");

            var go = new GameObject("Connection stage clock fixture");
            try
            {
                var flow = go.AddComponent<NeonArenaFlow>();
                const BindingFlags flags = BindingFlags.Instance | BindingFlags.NonPublic;
                var set = typeof(NeonArenaFlow).GetMethod("SetStage", flags);
                var clock = typeof(NeonArenaFlow).GetField("stageStarted", flags);
                set.Invoke(flow, new object[] { "loading-battle" }); clock.SetValue(flow, -100f);
                set.Invoke(flow, new object[] { "loading-battle" });
                Require((float)clock.GetValue(flow) == -100f, "Every frame resets the startup deadline.");
                set.Invoke(flow, new object[] { "queue" });
                Require((float)clock.GetValue(flow) >= 0, "New stage inherited the prior timeout.");
                Require(NeonConnectionPolicy.StageTimeout("loading-battle") > 60 &&
                    NeonConnectionPolicy.StageTimeout("waiting-match") <= 20 &&
                    NeonConnectionPolicy.StageTimeout("queue") > NeonArenaRules.QueueSeconds + 9,
                    "Watchdogs expire before supported load/metadata grace or leave match creation unbounded.");
                var instance = typeof(NeonArenaFlow).GetField("instance", BindingFlags.Static | BindingFlags.NonPublic);
                object previousFlow = instance.GetValue(null);
                try
                {
                    instance.SetValue(null, flow);
                    typeof(NeonArenaFlow).GetField("monitoring", flags).SetValue(flow, true);
                    Require(NeonArenaFlow.Starting, "Startup monitor fixture did not start.");
                    NeonArenaFlow.Disconnected();
                    Require(!NeonArenaFlow.Starting, "Leaving during scene load left a watchdog that reports a false failure later.");
                }
                finally { instance.SetValue(null, previousFlow); }
            }
            finally { UnityEngine.Object.DestroyImmediate(go); }

            string previous = PlayerPrefs.GetString("Neon.Connection.LastFailure.v1", "");
            NeonConnectionDiagnostics.Begin();
            for (int i = 0; i < 80; i++) NeonConnectionDiagnostics.Step("scene-wait", i.ToString());
            string notice = NeonConnectionDiagnostics.Fail("ARENA_ROSTER_TIMEOUT", "Fixture", false);
            var report = JsonUtility.FromJson<NeonConnectionDiagnostics.Report>(NeonConnectionDiagnostics.LastReportJson);
            Require(report.events.Length == 48 && report.events[47].reason == "ARENA_ROSTER_TIMEOUT", "Diagnostic history must be bounded and include the final reason.");
            Require(report.id.Length == 8 && notice.Contains(report.id) && !string.IsNullOrEmpty(report.utc), "Failure cannot be identified after returning to lobby.");
            Require(PlayerPrefs.GetString("Neon.Connection.LastFailure.v1", "") == previous, "Editor fixture changed the real failure record.");
            Require(!NeonConnectionDiagnostics.LastReportJson.Contains("AppId") && !NeonConnectionDiagnostics.LastReportJson.Contains("NickName"), "Diagnostic includes credential/player fields.");
            Debug.Log("NEON_CONNECTION_CHECKS_OK retry reasons/budget/cancellation; delayed roster snapshots; stage deadlines; bounded failure records (no network session)");
        }
        static void Require(bool ok, string message) { if (!ok) throw new Exception("Connection checks: " + message); }
    }
}
#endif
