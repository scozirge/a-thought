using PlayerPrefs = Neon.ProfilePreferences;
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Neon.Networking;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;
using UnityEngine.SceneManagement;
using Object = UnityEngine.Object;

namespace Neon.Validation
{
    // Activated explicitly by command-line arguments; never changes normal gameplay.
    public sealed class NeonSmoke : MonoBehaviour
    {
        [Serializable] public class Actor { public string name; public int id, health, level, skills; public bool local, alive; public Vector3 position; }
        [Serializable] public class Report
        {
            public bool passed, connected, contentReady, reconnected;
            public string scene, failure, name;
            public int errors, features, testedSkills, maxPeers, maxActors, maxAi;
            public float elapsed, averageFrameMs;
            public Actor[] actors;
            public string[] errorMessages;
            public NeonCombatCheck.Result combat;
            public NeonLootCheck.Result loot;
            public Neon.Astral.NeonPaletteCheck.Result palette;
        }
        readonly Report report = new Report();
        readonly List<string> errors = new List<string>();
        float start, frameSeconds;
        int frames;
        string reportPath;
        string savedName;
        bool hadName;
        static string[] Args => Environment.GetCommandLineArgs();
        static bool Has(string key) => Args.Contains(key);
        static string Arg(string key, string fallback) { int i = Array.IndexOf(Args, key); return i >= 0 && i + 1 < Args.Length ? Args[i + 1] : fallback; }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (!Has("-neonSmoke")) return;
            var go = new GameObject("Explicit migration validation");
            DontDestroyOnLoad(go);
            go.AddComponent<NeonSmoke>();
        }
        void Awake()
        {
            start = Time.realtimeSinceStartup;
            reportPath = Arg("-neonReport", Path.Combine(Application.persistentDataPath, "neon-smoke.json"));
            Application.logMessageReceived += Log;
            Application.runInBackground = true;
            Application.targetFrameRate = 60;
        }
        IEnumerator Start()
        {
            while ((!GameManager.InitCheck.Finished || !MyPlayer.CheckInitPlayerData.Finished || SceneManager.GetActiveScene().name != "Lobby") && Time.realtimeSinceStartup - start < 60) yield return null;
            if (SceneManager.GetActiveScene().name != "Lobby") { Finish("Startup did not reach the original lobby."); yield break; }
            report.contentReady = GameDictionary.FeatureDic.Count == 95;
            report.features = GameDictionary.FeatureDic.Count;
            report.name = Arg("-neonName", "MigrationCheck");
            hadName = PlayerPrefs.HasKey(LocoData.Name.ToString());
            savedName = PlayerPrefs.GetString(LocoData.Name.ToString());
            MyPlayer.SetName(report.name);
            MyPlayer.SetLanguage(Language.Chinese);
            PhotonLauncher.SelectGameType = Has("-neonChallenge") ? GameType.Challenge : GameType.InfinityWar;
            if (Has("-neonOffline")) SceneManager.LoadScene("Battle");
            else
            {
                LobbyUI.ChooseedRegion = Region.asia;
                if (Has("-neonChallenge"))
                {
                    bool started=false;
                    yield return NeonChallengeCheck.StartFromAstralLobby(value=>started=value);
                    if (!started) { Finish("Astral challenge UI did not start matchmaking."); yield break; }
                }
                else PhotonLauncher.JoinTheRandomRoom();
            }
            float joinStart = Time.realtimeSinceStartup;
            bool capturedVersus=false;
            while ((!BattleManager.BM || !BattleManager.BM.MyPlayerRole || !BattleManager.BM.MyPlayerRole.IsInitialized) && Time.realtimeSinceStartup - joinStart < 65)
            {
                if(!capturedVersus&&!Has("-nographics")&&Neon.Astral.AstralPresentation.Instance&&Neon.Astral.AstralPresentation.Instance.CurrentView=="versus")
                {
                    yield return new WaitForSeconds(.25f);
                    try { NeonRenderCapture.Capture(Path.ChangeExtension(reportPath,".versus.png"));capturedVersus=true; }
                    catch(Exception error){Finish("Versus capture failed: "+error.Message);yield break;}
                }
                yield return null;
            }
            if (!BattleManager.BM || !BattleManager.BM.MyPlayerRole) { Finish("Battle player did not spawn."); yield break; }
            if (Has("-neonCombatCheck"))
            {
                var check = gameObject.AddComponent<NeonCombatCheck>();
                yield return check.Run();
                report.combat = check.result;
                report.maxActors = Math.Max(report.maxActors, check.result.observedPlayers);
                report.maxPeers = Math.Max(report.maxPeers, PhotonNetwork.CurrentRoom.PlayerCount);
                if (!check.result.passed) { Finish(check.result.failure); yield break; }
            }
            if (Has("-neonLootStress"))
            {
                var check = gameObject.AddComponent<NeonLootCheck>();
                yield return check.Run();
                report.loot = check.result;
                if (!check.result.passed) { Finish(check.result.failure); yield break; }
            }
            if (Has("-neonSkills"))
            {
                var player = BattleManager.BM.MyPlayerRole;
                foreach (var feature in GameDictionary.FeatureDic.Values.OrderBy(x => x.ID))
                {
                    player.Health = player.MaxHealth;
                    player.GetFeature(feature.MyFeaturePart, feature.ID);
                    yield return new WaitForSeconds(.15f);
                    if (!player.SkillDic.TryGetValue(feature.MyFeaturePart, out Skill skill) || !skill || skill.MyFeatureDataID != feature.ID) { Finish("Skill failed to attach: " + feature.ID); yield break; }
                    report.testedSkills++;
                }
            }
            float seconds = float.Parse(Arg("-neonSeconds", "35"), System.Globalization.CultureInfo.InvariantCulture);
            float playStart = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - playStart < seconds)
            {
                report.maxPeers = Math.Max(report.maxPeers, PhotonNetwork.InRoom ? PhotonNetwork.CurrentRoom.PlayerCount : 0);
                var actors = Object.FindObjectsByType<PlayerRole>(FindObjectsSortMode.None);
                report.maxActors = Math.Max(report.maxActors, actors.Length);
                report.maxAi = Math.Max(report.maxAi, Object.FindObjectsByType<NeutralRole>(FindObjectsSortMode.None).Length);
                if (!Has("-neonCombatCheck") && !Has("-neonChallenge") && BattleManager.BM && BattleManager.BM.MyPlayerRole && !BattleManager.BM.MyPlayerRole.IsAlive) BattleManager.BM.Restart();
                yield return null;
            }
            if (Has("-neonReconnect"))
            {
                BattleUI.Myself.LeaveRoom();
                float deadline = Time.realtimeSinceStartup + 20;
                while ((SceneManager.GetActiveScene().name != "Lobby" || PhotonNetwork.IsDisconnecting) && Time.realtimeSinceStartup < deadline) yield return null;
                if (SceneManager.GetActiveScene().name != "Lobby") { Finish("Leaving did not return to lobby."); yield break; }
                PhotonLauncher.JoinTheRandomRoom();
                deadline = Time.realtimeSinceStartup + 60;
                while ((!BattleManager.BM || !BattleManager.BM.MyPlayerRole || !BattleManager.BM.MyPlayerRole.IsInitialized) && Time.realtimeSinceStartup < deadline) yield return null;
                report.reconnected = PhotonNetwork.InRoom && BattleManager.BM && BattleManager.BM.MyPlayerRole && BattleManager.BM.MyPlayerRole.IsInitialized;
                if (!report.reconnected) { Finish("Rejoining did not restore a live player."); yield break; }
                yield return new WaitForSeconds(5);
            }
            report.connected = PhotonNetwork.InRoom;
            if(Has("-neonPalette"))
            {
                var check=gameObject.AddComponent<Neon.Astral.NeonPaletteCheck>();
                yield return check.Run(Path.ChangeExtension(reportPath,".palette.png"),Has("-neonOffline"));
                report.palette=check.result;
                if(!check.result.passed){Finish(check.result.failure);yield break;}
            }
            report.scene = SceneManager.GetActiveScene().name;
            report.actors = Object.FindObjectsByType<PlayerRole>(FindObjectsSortMode.None).Select(x => new Actor { name = x.Name, id = x.photonView.ViewID, health = x.Health, level = x.LV, skills = x.SkillDic.Count, local = x.photonView.IsMine, alive = x.IsAlive, position = x.transform.position }).ToArray();
            if (!Has("-nographics"))
            {
                try { NeonRenderCapture.Capture(Path.ChangeExtension(reportPath, ".png")); }
                catch (Exception error) { Finish("Visual capture failed: " + error.Message); yield break; }
            }
            bool multiplayer = !Has("-neonOffline");
            int minPeers = int.Parse(Arg("-neonMinPeers", "1"));
            Finish(report.errors > 0 ? "Runtime errors were recorded." : !report.contentReady ? "Feature catalog is incomplete." : Has("-neonChallenge") && report.scene != "Challenge" ? "Challenge did not reach its original arena." : Has("-neonChallenge") && minPeers == 1 && report.maxAi < 1 ? "Challenge AI did not spawn." : multiplayer && (!report.connected || report.maxPeers < minPeers || report.maxActors < minPeers) ? "Expected peers and visible player actors were not observed." : null);
        }
        void Update() { frameSeconds += Time.unscaledDeltaTime; frames++; }
        void Log(string message, string stack, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception && type != LogType.Assert) return;
            report.errors++;
            if (errors.Count < 25) errors.Add(message + "\n" + stack);
        }
        void Finish(string failure)
        {
            report.failure = failure ?? "";
            report.passed = failure == null;
            report.elapsed = Time.realtimeSinceStartup - start;
            report.averageFrameMs = frames > 0 ? frameSeconds * 1000 / frames : 0;
            report.errorMessages = errors.ToArray();
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(reportPath)));
            File.WriteAllText(reportPath, JsonUtility.ToJson(report, true));
            if (savedName != null) { if (hadName) PlayerPrefs.SetString(LocoData.Name.ToString(), savedName); else PlayerPrefs.DeleteKey(LocoData.Name.ToString()); PlayerPrefs.Save(); }
            Debug.Log("NEON_SMOKE_" + (report.passed ? "OK" : "FAILED") + " " + report.failure);
            PhotonNetwork.Disconnect();
            Application.Quit(report.passed ? 0 : 1);
        }
    }
}
