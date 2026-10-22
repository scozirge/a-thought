using System;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Scoz.Func;

namespace Neon.Networking
{
    // Hold time/audio until a browser gesture. Original scenes, clips and their indices stay intact.
    public sealed class NeonWebBridge : MonoBehaviour
    {
        [DllImport("__Internal")] static extern void NeonWebAudioUnlock();
        [DllImport("__Internal")] static extern void NeonWebState(string json);
        bool started, diagnostics; float next;
        public static string ValidationRoom { get; private set; }
        Neon.Validation.NeonGameplayAudit.Result audit;
        public void RunGameplayAudit()
        {
            if (diagnostics && started && SceneManager.GetActiveScene().name == "Battle")
                audit = Neon.Validation.NeonGameplayAudit.Run();
        }
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Boot()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            var bridge = new GameObject("NeonWebBridge").AddComponent<NeonWebBridge>();
            DontDestroyOnLoad(bridge.gameObject);
            bridge.diagnostics = Application.absoluteURL.Contains("neonQA=1");
            if (bridge.diagnostics)
            {
                foreach (string pair in new Uri(Application.absoluteURL).Query.TrimStart('?').Split('&'))
                {
                    if (!pair.StartsWith("neonRoom=", StringComparison.Ordinal)) continue;
                    string room = Uri.UnescapeDataString(pair.Substring(9));
                    if (room.StartsWith("neon-web-check-", StringComparison.Ordinal) && room.Length < 64 && room.All(c=>char.IsLetterOrDigit(c)||c=='-'))
                        ValidationRoom = room;
                }
            }
            Time.timeScale = 0;
            AudioListener.pause = true;
            Application.targetFrameRate = 60;
#endif
        }
        public void StartGame()
        {
            if (started) return;
            started = true;
#if UNITY_WEBGL && !UNITY_EDITOR
            NeonWebAudioUnlock();
#endif
            Time.timeScale = 1;
            AudioListener.pause = false;
        }
        [Serializable] class Control { public string name, text; public float x,y,w,h; public bool enabled; }
        [Serializable] class State
        {
            public string scene, room, region, error; public int features, owned, peers, stars;
            public bool started, connected; public Control[] controls;
            public int[] loadout;
            public Neon.Validation.NeonGameplayAudit.Result gameplayAudit;
        }
        void Update()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            if (!diagnostics || Time.unscaledTime < next) return;
            next = Time.unscaledTime + .5f;
            var state = new State { scene=SceneManager.GetActiveScene().name, started=started,
                connected=PhotonNetwork.InRoom, peers=PhotonNetwork.PlayerList.Length, gameplayAudit=audit,
                room=PhotonNetwork.InRoom ? PhotonNetwork.Runner.SessionInfo.Name : "", error=PhotonNetwork.LastError,
                region=PhotonNetwork.CloudRegion,
                features=GameDictionary.FeatureDic?.Count ?? 0,
                owned=GameDictionary.FeatureDic?.Values.Count(f=>f.Owned) ?? 0, stars=MyPlayer.Star,
                loadout=MyPlayer.ChallengeSelectFeatures.Select(f=>f?.ID ?? -1).ToArray(),
                controls=FindObjectsByType<Button>(FindObjectsSortMode.None)
                    .Where(b=>b.isActiveAndEnabled && b.GetComponentInParent<Neon.Astral.AstralPresentation>())
                    .Select(b=>{var r=(RectTransform)b.transform;var c=new Vector3[4];r.GetWorldCorners(c);
                        return new Control {name=b.name,text=b.GetComponentInChildren<Text>()?.text,enabled=b.interactable,
                            x=c[0].x,y=Screen.height-c[1].y,w=c[2].x-c[0].x,h=c[2].y-c[0].y};}).ToArray()
            };
            NeonWebState(JsonUtility.ToJson(state));
#endif
        }
    }
}
