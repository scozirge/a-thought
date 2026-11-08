using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Neon.Networking
{
    public static class NeonConnectionDiagnostics
    {
        [Serializable] public sealed class Event
        {
            public float seconds;
            public string stage, reason;
        }
        [Serializable] public sealed class Report
        {
            public string id, utc, version, networkVersion, platform, mode, scene, region, code;
            public bool connected, ready, master;
            public int players;
            public Event[] events;
        }
        const string LastReportKey = "Neon.Connection.LastFailure.v1";
        const int Capacity = 48;
        static readonly List<Event> events = new List<Event>(Capacity);
        static float started;
        static string id = "", pendingNotice;
        public static string LastReportJson { get; private set; } = "";
        [DllImport("__Internal")] static extern void NeonWebConnectionReport(string json);

        public static void Begin()
        {
            events.Clear(); started = Time.realtimeSinceStartup;
            id = Guid.NewGuid().ToString("N").Substring(0, 8);
            pendingNotice = null;
            Step("connect-start");
        }
        // Callers pass fixed stage names and enum values, never SDK exception messages,
        // credentials, endpoint addresses, room names or player names.
        public static void Step(string stage, string reason = "")
        {
            if (events.Count == Capacity) events.RemoveAt(0);
            events.Add(new Event { seconds = Mathf.Max(0, Time.realtimeSinceStartup - started), stage = stage, reason = reason });
        }
        public static string Fail(string code, string message, bool persist = true)
        {
            if (string.IsNullOrEmpty(id)) id = Guid.NewGuid().ToString("N").Substring(0, 8);
            Step("failed", code);
            var runner = PhotonNetwork.Runner;
            var report = new Report {
                id = id, utc = DateTime.UtcNow.ToString("O"), version = Application.version,
                networkVersion = NeonFusionRuntime.NetworkVersion,
                platform = Application.platform.ToString(), mode = PhotonLauncher.SelectGameType.ToString(),
                scene = SceneManager.GetActiveScene().name, region = PhotonNetwork.CloudRegion ?? "",
                code = code, connected = PhotonNetwork.InRoom, ready = PhotonNetwork.IsReadyForGameplay,
                master = PhotonNetwork.IsMasterClient, players = runner && runner.IsRunning ? runner.SessionInfo.PlayerCount : 0,
                events = events.ToArray()
            };
            LastReportJson = JsonUtility.ToJson(report, true);
            string notice = message + "\n錯誤代碼：" + code + " / " + id;
            if (!persist) return notice;
            pendingNotice = notice;
            try
            {
                UnityEngine.PlayerPrefs.SetString(LastReportKey, LastReportJson);
                UnityEngine.PlayerPrefs.Save();
            }
            catch (Exception error) { Debug.LogWarning("NEON_REPORT_CACHE_FAILED " + error.GetType().Name); }
#if UNITY_WEBGL && !UNITY_EDITOR
            NeonWebConnectionReport(LastReportJson);
#else
            try { File.WriteAllText(Path.Combine(Application.persistentDataPath, "last-connection-report.json"), LastReportJson); }
            catch (Exception error) { Debug.LogWarning("NEON_REPORT_SAVE_FAILED " + error.GetType().Name); }
#endif
            Debug.LogWarning("NEON_CONNECTION_FAILURE code=" + code + " report=" + id);
            return notice;
        }
        public static void ShowPendingFailure()
        {
            if (string.IsNullOrEmpty(pendingNotice) || PhotonNetwork.IsConnecting || PhotonNetwork.IsDisconnecting ||
                SceneManager.GetActiveScene().name != "Lobby" || !PopupUI.IsInit) return;
            string notice = pendingNotice; pendingNotice = null;
            PopupUI.ShowClickCancel(notice, null);
        }
    }
}
