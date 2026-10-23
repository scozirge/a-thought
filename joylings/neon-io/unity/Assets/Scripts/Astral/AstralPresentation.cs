using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Starbro.NeonIO;
using Scoz.Func;
using Neon.Networking;
using UnityEngine.EventSystems;
using static Neon.Astral.AstralWidgets;

namespace Neon.Astral
{
    // Presentation only. Original controllers remain the source of truth for
    // purchases, profile persistence, matchmaking, combat and results.
    public sealed partial class AstralPresentation : MonoBehaviour
    {
        public static AstralPresentation Instance { get; private set; }
        public string CurrentView { get; private set; }
        public static bool InputBlocked => NeonArenaFlow.CombatBlocked || (Instance && (Instance.CurrentView!="battle" || Instance.ModalVisible));
        bool ModalVisible { get { if(!modal)return false;foreach(Transform child in modal)if(child.gameObject.activeSelf)return true;return false; } }
        bool TouchUI => NeonWebBridge.TouchLayout;
        float CssPixelRatio => Screen.width/Mathf.Max(1,NeonWebBridge.CssWidth);
        float ViewWidth => Screen.safeArea.width/Mathf.Max(.001f,CssPixelRatio);
        float ViewHeight => Screen.safeArea.height/Mathf.Max(.001f,CssPixelRatio);
        Canvas canvas; CanvasScaler scaler; RectTransform safe, page, modal, tooltip, outerFrame; GameObject backdrop;CanvasGroup pageFade;
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
            scaler=canvas.GetComponent<CanvasScaler>();scaler.uiScaleMode=CanvasScaler.ScaleMode.ScaleWithScreenSize;scaler.referenceResolution=new Vector2(1920,1080);scaler.screenMatchMode=CanvasScaler.ScreenMatchMode.Expand;
            var background=Image(canvas.transform,"Midnight",0,0,1920,1080,null,Night);Stretch(background.rectTransform);backdrop=background.gameObject;
            var stars=Graphic(background.transform,"Constellation",0,0,1920,1080,AstralGraphic.Shape.Starfield,new Color(.75f,.8f,.95f,.45f));Stretch(stars.rectTransform);
            var frame=Graphic(background.transform,"Outer frame",0,0,1920,1080,AstralGraphic.Shape.Frame,Gold);Stretch(frame.rectTransform,24);frame.border=new Color(Gold.r,Gold.g,Gold.b,.3f);
            outerFrame=frame.rectTransform;
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
                if(c.GetComponent<LobbyUI>())
                {
                    // Keep the actual animated background and its original timeline alive.
                    // Only suppress the old controls; disabling this world canvas hid the art.
                    GodAppearance.LayerHead(c.transform);
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
                // Instantiated persistent popups are named PopupUI(Clone). Match their
                // controller, including child canvases, instead of the prefab name.
                else if(c.GetComponent<BattleUI>()||c.GetComponentInParent<PopupUI>())
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
            ConfigureLayout();
            if(Time.unscaledTime>=nextScan){Scan();nextScan=Time.unscaledTime+.5f;}
            if(!GameDictionary.IsInit){SetView("loading");return;}
            string v="loading";
            if(battle)v=NeonArenaFlow.Active && NeonArena.Instance && NeonArena.Instance.HasLocalResult ? "arena-result" : Is(battle,"SettlementUI")?"result":"battle";
            else if(lobby)
            {
                if(NeonArenaFlow.Searching)v="arena-waiting";
                else if(challenge&&challenge.gameObject.activeInHierarchy)v=Is(challenge,"SelectUI")?"select":Is(challenge,"VSObj")?"versus":ChallengeUI.IsFindingOpponent?"matching":"loadout";
                else if(Is(lobby,"ShopUI"))v="collection";
                else if(Is(lobby,"SettingUI"))
                {var panels=Field<GameObject[]>(lobby,"SettingSubObjs");v="settings";if(panels!=null&&panels.Length>2)v=Active(panels[1])?"clamor":Active(panels[2])?"credits":"settings";}
                else if(Is(lobby,"ControlPanel"))v="lobby";
            }
            SetView(v); foreach(var update in live)update();
            if(UnityEngine.Input.GetKeyDown(KeyCode.Escape))BackKey();
            if(balance)balance.text=MyPlayer.Star.ToString("N0");
            if(tooltip.gameObject.activeSelf)
            {
                RectTransformUtility.ScreenPointToLocalPointInRectangle(safe,UnityEngine.Input.mousePosition,null,out var p);
                float scale=tooltip.localScale.x,w=tooltip.rect.width*scale*.5f,h=tooltip.rect.height*scale*.5f;
                if(TouchUI)tooltip.anchoredPosition=new Vector2(safe.rect.xMax-w-12*scale,Mathf.Min(safe.rect.yMax-h-12*scale,safe.rect.yMin+h+112*scale));
                else tooltip.anchoredPosition=new Vector2(Mathf.Clamp(p.x+30+w,safe.rect.xMin+w+20,safe.rect.xMax-w-20),Mathf.Clamp(p.y-h-24,safe.rect.yMin+h+20,safe.rect.yMax-h-20));
            }
        }
        void LateUpdate()
        {
            ConfigureLayout();
            pageFade.alpha=Mathf.MoveTowards(pageFade.alpha,1,Time.unscaledDeltaTime*7);
            // Lay out popups after the canvas and safe area have followed a resize.
            if(GameDictionary.IsInit)UpdatePopup();
        }
        public void Refresh(){viewKey=null;popupKey=null;}
        void ConfigureLayout()
        {
            if(Screen.width<1||Screen.height<1)return;
            // Text generates its glyph atlas from Canvas.scaleFactor. A magnified
            // child transform would enlarge low-resolution glyphs on phones.
            scaler.uiScaleMode=TouchUI?CanvasScaler.ScaleMode.ConstantPixelSize:CanvasScaler.ScaleMode.ScaleWithScreenSize;
            if(TouchUI){scaler.scaleFactor=CssPixelRatio;canvas.scaleFactor=CssPixelRatio;}
            Stretch(outerFrame,TouchUI?8:24);
            var a=Screen.safeArea;safe.anchorMin=new Vector2(a.x/Screen.width,a.y/Screen.height);safe.anchorMax=new Vector2(a.xMax/Screen.width,a.yMax/Screen.height);safe.offsetMin=safe.offsetMax=Vector2.zero;
            page.sizeDelta=modal.sizeDelta=TouchUI?new Vector2(ViewWidth,ViewHeight):new Vector2(1920,1080);
            float fit=TouchUI?CssPixelRatio/Mathf.Max(.001f,canvas.scaleFactor):Mathf.Min(safe.rect.width/1920,safe.rect.height/1080);
            page.localScale=modal.localScale=Vector3.one*fit;
        }
        void SetView(string value)
        {
            string key=value+"/"+MyPlayer.UseLanguage+"/"+part+"/"+TouchUI+"/"+Screen.width+"x"+Screen.height+"/"+Mathf.RoundToInt(ViewWidth)+"x"+Mathf.RoundToInt(ViewHeight);
            var focused=key!=viewKey&&value==CurrentView?page.GetComponentsInChildren<InputField>().FirstOrDefault(f=>f.isFocused):null;
            // Recreating an active mobile InputField closes the browser's native
            // keyboard. Keep it alive while typing; reflow as soon as editing ends.
            if(focused&&TouchUI)return;
            string focusPath=focused?PagePath(focused.transform):null,focusText=focused?focused.text:null;
            int caret=focused?focused.caretPosition:0;
            if(key==viewKey)return;
            bool reflow=viewKey!=null&&viewKey.StartsWith(value+"/"+MyPlayer.UseLanguage+"/"+part+"/"+TouchUI+"/",StringComparison.Ordinal);
            var scrollPositions=reflow?page.GetComponentsInChildren<ScrollRect>().ToDictionary(s=>PagePath(s.transform),s=>s.verticalNormalizedPosition):null;
            viewKey=key;CurrentView=value;live.Clear();balance=null;Clear(page);ShowTooltip(null);
            pageFade.alpha=0;
            backdrop.SetActive(value!="battle"&&value!="result"&&value!="lobby"&&value!="loading");
            if(TouchUI)BuildTouchView(value);
            else switch(value)
            {
                case "lobby":BuildLobby();break;
                case "collection":case "select":BuildCollection(value=="select");break;
                case "loadout":case "matching":case "versus":BuildLoadout();break;
                case "settings":case "clamor":case "credits":BuildSettings(value);break;
                case "battle":BuildBattle();BuildArenaHud();break;
                case "arena-waiting":BuildArenaWaiting();break;
                case "arena-result":BuildArenaResult();break;
                case "result":BuildBattle();BuildResult();break;
                default:BuildLoading();break;
            }
            if(focusPath!=null||scrollPositions!=null)StartCoroutine(RestorePageState(focusPath,focusText,caret,key,scrollPositions));
        }
        string PagePath(Transform t){string path=t.name;while(t.parent&&t.parent!=page){t=t.parent;path=t.name+"/"+path;}return path;}
        IEnumerator RestorePageState(string path,string value,int caret,string key,Dictionary<string,float> scrollPositions)
        {
            yield return null;if(viewKey!=key)yield break;
            Canvas.ForceUpdateCanvases();
            if(scrollPositions!=null)foreach(var scroll in page.GetComponentsInChildren<ScrollRect>())
                if(scrollPositions.TryGetValue(PagePath(scroll.transform),out float position))scroll.verticalNormalizedPosition=position;
            if(path==null)yield break;
            var field=page.GetComponentsInChildren<InputField>().FirstOrDefault(f=>PagePath(f.transform)==path);
            if(!field)yield break;field.SetTextWithoutNotify(value);EventSystem.current?.SetSelectedGameObject(field.gameObject);field.ActivateInputField();field.caretPosition=Mathf.Min(caret,value.Length);
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
            else if(CurrentView=="arena-waiting")NeonArenaFlow.Cancel();
            else if(CurrentView=="matching")challenge.CancelChallenge();
            else if(CurrentView=="settings"||CurrentView=="clamor"||CurrentView=="credits"||CurrentView=="collection"||CurrentView=="loadout")Home();
            else if(CurrentView=="battle")PopupUI.ShowConfirmCancel(L("確定離開目前的戰場？","Leave the current arena?"),()=>battle.LeaveRoom(),null);
        }
        void Header(string title,string subtitle,Action back=null,bool stars=false)
        {
            // Keep section titles aligned with the centered content area on wide displays.
            var heading=TitleArt(page,"Page title",title,0,461,900,74);heading.anchoredPosition=new Vector2(-900+heading.rect.width*.5f,461);
            if(back!=null)IconButton(page,"Back",AstralGraphic.Shape.Back,858,465,72,()=>back());
            if(!string.IsNullOrWhiteSpace(subtitle))Text(page,"Subtitle",subtitle,-400,351,1000,56,24,Muted);
            var rule=Graphic(page,"Header rule",0,410,1800,1,AstralGraphic.Shape.Rule,new Color(Gold.r,Gold.g,Gold.b,.3f));rule.thickness=1;
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
            tooltip.localScale=TouchUI?Vector3.one*(CssPixelRatio/Mathf.Max(.001f,canvas.scaleFactor)):Vector3.one;
            float width=TouchUI?Mathf.Min(360,ViewWidth-32):600;
            tipText.fontSize=TouchUI?16:24;tipText.rectTransform.sizeDelta=new Vector2(width-32,500);tipText.text=value;
            float h=Mathf.Clamp(tipText.preferredHeight+32,72,TouchUI?Mathf.Max(72,ViewHeight-24):480);tooltip.sizeDelta=new Vector2(width,h);tipText.rectTransform.sizeDelta=new Vector2(width-32,h-24);
        }
        void BuildLoading()
        {
            // Init's original animation events drive the explosion and music timing.
            if(SceneManager.GetActiveScene().name!="Init")
                Text(page,"Loading",L("載入中…","LOADING…"),0,-440,900,65,27,Gold,TextAnchor.MiddleCenter);
        }
    }
}
