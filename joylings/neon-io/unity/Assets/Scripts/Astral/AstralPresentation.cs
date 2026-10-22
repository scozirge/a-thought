using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Starbro.NeonIO;
using Scoz.Func;
using static Neon.Astral.AstralWidgets;

namespace Neon.Astral
{
    // Presentation only. Original controllers remain the source of truth for
    // purchases, profile persistence, matchmaking, combat and results.
    public sealed partial class AstralPresentation : MonoBehaviour
    {
        public static AstralPresentation Instance { get; private set; }
        public string CurrentView { get; private set; }
        Canvas canvas; RectTransform safe, page, modal, tooltip; GameObject backdrop;CanvasGroup pageFade;
        LobbyUI lobby; ChallengeUI challenge; BattleUI battle; PopupUI popup;
        string viewKey, popupKey; float nextScan; int part; FeatureData selected;
        Text balance, tipText; readonly List<Action> live = new List<Action>();
        readonly Dictionary<string,FieldInfo> fields = new Dictionary<string,FieldInfo>();
        public bool Chinese => MyPlayer.UseLanguage == Language.Chinese;
        public string L(string zh,string en) => Chinese ? zh : en;
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot(){if(!Instance)new GameObject("Astral presentation").AddComponent<AstralPresentation>();}
        void Awake()
        {
            if(Instance){Destroy(gameObject);return;} Instance=this;DontDestroyOnLoad(gameObject);
            canvas=new GameObject("Astral canvas",typeof(RectTransform),typeof(Canvas),typeof(CanvasScaler),typeof(GraphicRaycaster)).GetComponent<Canvas>();
            canvas.transform.SetParent(transform,false);canvas.renderMode=RenderMode.ScreenSpaceOverlay;canvas.sortingOrder=100;
            var scaler=canvas.GetComponent<CanvasScaler>();scaler.uiScaleMode=CanvasScaler.ScaleMode.ScaleWithScreenSize;scaler.referenceResolution=new Vector2(1920,1080);scaler.screenMatchMode=CanvasScaler.ScreenMatchMode.Expand;
            var background=Image(canvas.transform,"Midnight",0,0,1920,1080,null,Night);Stretch(background.rectTransform);backdrop=background.gameObject;
            var stars=Graphic(background.transform,"Constellation",0,0,1920,1080,AstralGraphic.Shape.Starfield,new Color(.75f,.8f,.95f,.45f));Stretch(stars.rectTransform);
            var frame=Graphic(background.transform,"Outer frame",0,0,1920,1080,AstralGraphic.Shape.Frame,Gold);Stretch(frame.rectTransform,24);frame.border=new Color(Gold.r,Gold.g,Gold.b,.3f);
            safe=Rect(canvas.transform,"Safe area",0,0,1920,1080);Stretch(safe);
            page=Rect(safe,"Page",0,0,1920,1080);modal=Rect(safe,"Modal",0,0,1920,1080);
            pageFade=page.gameObject.AddComponent<CanvasGroup>();
            tooltip=Plate(safe,"Tooltip",0,0,600,180).rectTransform;tooltip.gameObject.SetActive(false);
            tipText=Text(tooltip,"Content","",0,0,548,144,24);
            SceneManager.sceneLoaded+=SceneLoaded;
        }
        void OnDestroy(){SceneManager.sceneLoaded-=SceneLoaded;if(Instance==this)Instance=null;}
        void SceneLoaded(Scene s,LoadSceneMode m){lobby=null;challenge=null;battle=null;popup=null;viewKey=null;popupKey=null;nextScan=0;styledWorldText.Clear();}
        public T Field<T>(object source,string name)
        {
            if(source==null)return default;string key=source.GetType().FullName+"."+name;
            if(!fields.TryGetValue(key,out var f)){for(var type=source.GetType();type!=null&&f==null;type=type.BaseType)f=type.GetField(name,BindingFlags.Instance|BindingFlags.Public|BindingFlags.NonPublic);fields[key]=f;}
            return f!=null && f.GetValue(source) is T value?value:default;
        }
        static bool Active(GameObject o)=>o&&o.activeInHierarchy;
        bool Is(object obj,string name)=>Active(Field<GameObject>(obj,name));
        void Scan()
        {
            lobby=FindFirstObjectByType<LobbyUI>(FindObjectsInactive.Include);challenge=FindFirstObjectByType<ChallengeUI>(FindObjectsInactive.Include);
            battle=FindFirstObjectByType<BattleUI>(FindObjectsInactive.Include);popup=FindFirstObjectByType<PopupUI>(FindObjectsInactive.Include);
            foreach(var c in FindObjectsByType<Canvas>(FindObjectsInactive.Include,FindObjectsSortMode.None))
            {
                if(c==canvas||c.transform.IsChildOf(transform))continue;
                if(c.name=="LobbyUI")
                {
                    // Keep the actual animated background and its original timeline alive.
                    // Only suppress the old controls; disabling this world canvas hid the art.
                    c.enabled=true;var r=c.GetComponent<GraphicRaycaster>();if(r)r.enabled=false;
                    foreach(Transform child in c.transform)
                    {
                        if(child.name=="ControlPanel")
                        {
                            foreach(Transform control in child)if(control.name!="BG")HideLegacyControls(control);
                        }
                        else HideLegacyControls(child);
                    }
                }
                else if(c.name=="BattleUI"||c.name=="PopupUI")
                {c.enabled=false;var r=c.GetComponent<GraphicRaycaster>();if(r)r.enabled=false;}
                else if(c.name=="BattleObjsUICanvas")StyleWorldText(c.transform);
            }
            StyleWorldLabels();
        }
        static void HideLegacyControls(Transform root)
        {
            // Leave Text/MyText enabled: their lifecycle handles localization and
            // original controller data. CanvasGroup hides only their presentation.
            var group=root.GetComponent<CanvasGroup>();if(!group)group=root.gameObject.AddComponent<CanvasGroup>();
            group.alpha=0;group.interactable=false;group.blocksRaycasts=false;
        }
        void Update()
        {
            if(Time.unscaledTime>=nextScan){Scan();nextScan=Time.unscaledTime+.5f;}
            if(!GameDictionary.IsInit){SetView("loading");return;}
            string v="loading";
            if(battle)v=Is(battle,"SettlementUI")?"result":"battle";
            else if(lobby)
            {
                if(challenge&&challenge.gameObject.activeInHierarchy)v=Is(challenge,"SelectUI")?"select":Is(challenge,"VSObj")?"versus":ChallengeUI.IsFindingOpponent?"matching":"loadout";
                else if(Is(lobby,"ShopUI"))v="collection";
                else if(Is(lobby,"SettingUI"))
                {var panels=Field<GameObject[]>(lobby,"SettingSubObjs");v="settings";if(panels!=null&&panels.Length>2)v=Active(panels[1])?"clamor":Active(panels[2])?"credits":"settings";}
                else if(Is(lobby,"ControlPanel"))v="lobby";
            }
            SetView(v); foreach(var update in live)update(); UpdatePopup();
            if(UnityEngine.Input.GetKeyDown(KeyCode.Escape))BackKey();
            if(balance)balance.text="✦  "+MyPlayer.Star.ToString("N0");
            if(tooltip.gameObject.activeSelf)
            {
                RectTransformUtility.ScreenPointToLocalPointInRectangle(safe,UnityEngine.Input.mousePosition,null,out var p);
                float w=tooltip.rect.width*.5f,h=tooltip.rect.height*.5f;
                tooltip.anchoredPosition=new Vector2(Mathf.Clamp(p.x+30+w,safe.rect.xMin+w+20,safe.rect.xMax-w-20),Mathf.Clamp(p.y-h-24,safe.rect.yMin+h+20,safe.rect.yMax-h-20));
            }
        }
        void LateUpdate()
        {
            var a=Screen.safeArea;safe.anchorMin=new Vector2(a.x/Screen.width,a.y/Screen.height);safe.anchorMax=new Vector2(a.xMax/Screen.width,a.yMax/Screen.height);safe.offsetMin=safe.offsetMax=Vector2.zero;
            float fit=Mathf.Min(safe.rect.width/1920,safe.rect.height/1080);page.localScale=modal.localScale=Vector3.one*fit;
            pageFade.alpha=Mathf.MoveTowards(pageFade.alpha,1,Time.unscaledDeltaTime*7);
        }
        public void Refresh(){viewKey=null;popupKey=null;}
        void SetView(string value)
        {
            string key=value+"/"+MyPlayer.UseLanguage+"/"+part;
            if(key==viewKey)return;viewKey=key;CurrentView=value;live.Clear();balance=null;Clear(page);ShowTooltip(null);
            pageFade.alpha=0;
            backdrop.SetActive(value!="battle"&&value!="result"&&value!="lobby"&&value!="loading");
            switch(value)
            {
                case "lobby":BuildLobby();break;
                case "collection":case "select":BuildCollection(value=="select");break;
                case "loadout":case "matching":case "versus":BuildLoadout();break;
                case "settings":case "clamor":case "credits":BuildSettings(value);break;
                case "battle":BuildBattle();break;
                case "result":BuildBattle();BuildResult();break;
                default:BuildLoading();break;
            }
        }
        void BackKey()
        {
            var choice=page.Find("Choice overlay");if(choice){Destroy(choice.gameObject);return;}
            if(popup)
            {
                if(Is(popup,"ConfirmCancelGo")){popup.Cancel();return;}if(Is(popup,"ClickCancelGo")){popup.HidewClickCancel();return;}if(Is(popup,"ClickCancelTitleGo")){popup.HidekCancelTitle();return;}
                var book=Field<List<Book>>(popup,"MyBooks")?.FirstOrDefault(b=>b&&b.gameObject.activeInHierarchy);if(book){book.OpenBook(false);return;}
                if(Is(popup,"LoadingGo")||Is(popup,"LoadingTitleGo"))return;
            }
            if(CurrentView=="select")challenge.ActiveSelectUI(false);
            else if(CurrentView=="matching")challenge.CancelChallenge();
            else if(CurrentView=="settings"||CurrentView=="clamor"||CurrentView=="credits"||CurrentView=="collection"||CurrentView=="loadout")Home();
            else if(CurrentView=="battle")PopupUI.ShowConfirmCancel(L("確定離開目前的戰場？","Leave the current arena?"),()=>battle.LeaveRoom(),null);
        }
        void Header(string title,string subtitle,Action back=null,bool stars=true)
        {
            if(back!=null)Button(page,"Back",L("‹  返回","‹  BACK"),735,464,265,56,()=>back(),false,24);
            Text(page,"Page title",title,-480,464,840,76,48);
            if(!string.IsNullOrWhiteSpace(subtitle))Text(page,"Subtitle",subtitle,-400,351,1000,56,23,Muted);
            Graphic(page,"Header rule",0,410,1750,2,AstralGraphic.Shape.Rule,new Color(Gold.r,Gold.g,Gold.b,.45f));
            if(stars)balance=Text(page,"Stars","",710,352,320,55,28,Gold,TextAnchor.MiddleRight);
        }
        void Home(){lobby.ActiveShopUI(false);lobby.ActiveSettingUI(false);if(challenge)challenge.SetActive(false);lobby.ActiveControlPanel(true);selected=null;}
        void Invoke(Transform root,string name)
        {
            var b=root.GetComponentsInChildren<Button>(true).FirstOrDefault(x=>x.name==name&&x.gameObject.activeInHierarchy);
            if(b&&b.interactable)b.onClick.Invoke();
        }
        public void ShowTooltip(string value)
        {
            if(!tooltip)return;tooltip.gameObject.SetActive(!string.IsNullOrEmpty(value));if(string.IsNullOrEmpty(value))return;
            tipText.text=value;float h=Mathf.Clamp(tipText.preferredHeight+48,120,480);tooltip.sizeDelta=new Vector2(600,h);tipText.rectTransform.sizeDelta=new Vector2(548,h-40);
        }
        void BuildLoading()
        {
            // Init's original animation events drive the explosion and music timing.
            if(SceneManager.GetActiveScene().name!="Init")
                Text(page,"Loading",L("載入中…","LOADING…"),0,-440,900,65,27,Gold,TextAnchor.MiddleCenter);
        }
    }
}
