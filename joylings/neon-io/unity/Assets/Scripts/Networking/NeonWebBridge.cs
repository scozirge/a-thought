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
        [Serializable] class Viewport { public float width, height; public bool touch, blocked; }
        static Viewport viewport;
        public static float CssWidth => viewport?.width > 0 ? viewport.width : Screen.width;
        public static float CssHeight => viewport?.height > 0 ? viewport.height : Screen.height;
        public static bool TouchLayout => viewport?.touch ?? Application.isMobilePlatform;
        public static bool InputAvailable => !(viewport?.blocked ?? false);
        // Browser CSS pixels differ from the WebGL render buffer on Retina devices.
        public void SetViewport(string json)
        {
            var value = JsonUtility.FromJson<Viewport>(json);
            if(value != null && value.width > 0 && value.height > 0)
            {
                if(viewport==null || value.blocked || value.width!=viewport.width || value.height!=viewport.height)
                    Neon.Astral.NeonTouchStick.Release();
                viewport=value;
            }
        }
        public void ReleaseInput() { Neon.Astral.NeonTouchStick.Release(); }
        Neon.Validation.NeonGameplayAudit.Result audit;
        public void RunGameplayAudit()
        {
            if (diagnostics && started && SceneManager.GetActiveScene().name == "Battle")
                audit = Neon.Validation.NeonGameplayAudit.Run();
        }
        // Explicit UI fixture in an isolated QA browser profile; never invoked during normal play.
        public void PreviewResultLayout()
        {
            if(diagnostics&&started&&Starbro.NeonIO.BattleUI.Myself&&SceneManager.GetActiveScene().name=="Battle")
                Starbro.NeonIO.BattleUI.Myself.Settlement(0,0,0,TimeSpan.FromSeconds(46));
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
        [Serializable] class Control { public string name, text, type; public float x,y,w,h,clipX,clipY,clipW,clipH; public bool enabled, scroll; }
        [Serializable] class Element { public string name; public float x,y,w,h; public int fontSize; }
        [Serializable] class State
        {
            public string scene, room, region, error; public int features, owned, peers, stars;
            public bool started, connected; public Control[] controls;
            public int[] loadout;
            public int screenWidth, screenHeight;
            public float cssWidth, cssHeight;
            public bool touch, legacyPopupVisible;
            public string guidePage, guideText;
            public string view;
            public bool inputBlocked,stickDragging,playerAlive;
            public float stickX,stickY,playerX,playerY,velocityX,velocityY;
            public Element[] elements;
            public Neon.Validation.NeonGameplayAudit.Result gameplayAudit;
        }
        void Update()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            if (!diagnostics || Time.unscaledTime < next) return;
            next = Time.unscaledTime + .5f;
            var popup=FindFirstObjectByType<PopupUI>(FindObjectsInactive.Include);
            var presentation=Neon.Astral.AstralPresentation.Instance;
            var guide=presentation?presentation.GetComponentsInChildren<RectTransform>().FirstOrDefault(t=>t.name=="Tutorial"&&!t.GetComponent<Button>()):null;
            var player=Starbro.NeonIO.BattleManager.BM?Starbro.NeonIO.BattleManager.BM.MyPlayerRole:null;
            var velocity=player?player.GetComponent<Rigidbody2D>().linearVelocity:Vector2.zero;
            var stick=Neon.Astral.NeonTouchStick.Instance;
            var state = new State { scene=SceneManager.GetActiveScene().name, started=started,
                screenWidth=Screen.width,screenHeight=Screen.height,cssWidth=CssWidth,cssHeight=CssHeight,touch=TouchLayout,
                legacyPopupVisible=popup&&popup.GetComponentsInChildren<Canvas>().Any(c=>c.isActiveAndEnabled),
                guidePage=guide?guide.GetComponentsInChildren<Text>().FirstOrDefault(t=>t.name=="Page")?.text:"",
                guideText=guide?guide.GetComponentsInChildren<Text>().FirstOrDefault(t=>t.name=="Guide content")?.text:"",
                view=presentation?presentation.CurrentView:"",inputBlocked=Neon.Astral.AstralPresentation.InputBlocked||!InputAvailable,
                stickDragging=stick&&stick.Dragging,stickX=Neon.Astral.NeonTouchStick.Direction.x,stickY=Neon.Astral.NeonTouchStick.Direction.y,
                playerAlive=player&&player.IsAlive,playerX=player?player.transform.position.x:0,playerY=player?player.transform.position.y:0,velocityX=velocity.x,velocityY=velocity.y,
                connected=PhotonNetwork.InRoom, peers=PhotonNetwork.PlayerList.Length, gameplayAudit=audit,
                room=PhotonNetwork.InRoom ? PhotonNetwork.Runner.SessionInfo.Name : "", error=PhotonNetwork.LastError,
                region=PhotonNetwork.CloudRegion,
                features=GameDictionary.FeatureDic?.Count ?? 0,
                owned=GameDictionary.FeatureDic?.Values.Count(f=>f.Owned) ?? 0, stars=MyPlayer.Star,
                loadout=MyPlayer.ChallengeSelectFeatures.Select(f=>f?.ID ?? -1).ToArray(),
                controls=FindObjectsByType<Selectable>(FindObjectsSortMode.None)
                    .Where(b=>b.isActiveAndEnabled && b.GetComponentInParent<Neon.Astral.AstralPresentation>())
                    .Select(b=>{var r=(RectTransform)b.transform;var c=new Vector3[4];r.GetWorldCorners(c);var scroll=b.GetComponentInParent<ScrollRect>();var clip=new Vector3[4];if(scroll)scroll.viewport.GetWorldCorners(clip);
                        return new Control {name=b.name,text=b.GetComponentInChildren<Text>()?.text,enabled=b.interactable,type=b.GetType().Name,scroll=scroll!=null,
                            clipX=scroll?clip[0].x:0,clipY=scroll?Screen.height-clip[1].y:0,clipW=scroll?clip[2].x-clip[0].x:Screen.width,clipH=scroll?clip[2].y-clip[0].y:Screen.height,
                            x=c[0].x,y=Screen.height-c[1].y,w=c[2].x-c[0].x,h=c[2].y-c[0].y};}).ToArray()
                ,elements=presentation?presentation.GetComponentsInChildren<RectTransform>().Where(t=>
                    new[]{"Touch joystick","Thumb","Vitality","Skill dock","Leaderboard","Combat feed","Skill notification","Dialog","Tutorial","Guide content","Result panel","Health","Page title","Skill detail"}.Contains(t.name))
                    .Select(t=>{var c=new Vector3[4];t.GetWorldCorners(c);var text=t.GetComponent<Text>();return new Element{name=t.name,x=c[0].x,y=Screen.height-c[1].y,w=c[2].x-c[0].x,h=c[2].y-c[0].y,fontSize=text?text.fontSize:0};}).ToArray():new Element[0]
            };
            NeonWebState(JsonUtility.ToJson(state));
#endif
        }
    }
}
