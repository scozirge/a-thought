using PlayerPrefs = Neon.ProfilePreferences;
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Scoz.Func;
using Starbro.NeonIO;
using Neon.Networking;
using Neon.Validation;

namespace Neon.Astral
{
    // Opt-in player validation. No purchases are confirmed and preferences are restored.
    public sealed class AstralValidation : MonoBehaviour
    {
        [Serializable] sealed class Report {public bool passed;public string failure;public List<string> screens=new List<string>();public List<string> checks=new List<string>();public List<string> errors=new List<string>();}
        readonly Report report=new Report();string folder;Language language;FeatureData[] loadout;bool hadTutorial,hadPurchase;int tutorial,purchase;bool saved;
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot(){if(Environment.GetCommandLineArgs().Contains("-neonUiCheck")){var go=new GameObject("Explicit Astral UI validation");DontDestroyOnLoad(go);go.AddComponent<AstralValidation>();}}
        void Awake(){var args=Environment.GetCommandLineArgs();int i=Array.IndexOf(args,"-neonUiReport");folder=i>=0?args[i+1]:Path.Combine(Application.persistentDataPath,"astral-ui");Directory.CreateDirectory(folder);Application.runInBackground=true;Application.targetFrameRate=60;Application.logMessageReceived+=Log;}
        void Log(string m,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)report.errors.Add(m+"\n"+stack);}
        IEnumerator Start()
        {
            var task=Run();while(true){bool more=false;object current=null;try{more=task.MoveNext();if(more)current=task.Current;}catch(Exception e){Finish(e.ToString());yield break;}if(!more)break;yield return current;}Finish(null);
        }
        IEnumerator Run()
        {
            foreach(float delay in new[]{.5f,2.5f,3.4f})
            {
                yield return new WaitForSeconds(delay);
                if(SceneManager.GetActiveScene().name=="Init")
                {
                    var original=GameObject.Find("Init");
                    Require(original&&original.GetComponent<Canvas>().enabled,"Original intro canvas remains visible");
                    Capture("intro-"+Time.time.ToString("F1",System.Globalization.CultureInfo.InvariantCulture));
                }
            }
            float until=Time.realtimeSinceStartup+65;while((!MyPlayer.CheckInitPlayerData.Finished||SceneManager.GetActiveScene().name!="Lobby"||!AstralPresentation.Instance)&&Time.realtimeSinceStartup<until)yield return null;
            Require(SceneManager.GetActiveScene().name=="Lobby","startup lobby");
            yield return new WaitForSeconds(.15f);Capture("lobby-entrance");
            var originalLobby=GameObject.Find("LobbyUI");
            Require(originalLobby&&originalLobby.GetComponent<Canvas>().enabled,"Original lobby canvas is rendered");
            Require(originalLobby.transform.Find("ControlPanel/BG/God").gameObject.activeInHierarchy,"Original animated guardian remains active");
            Require(FindObjectsByType<ParticleSystem>(FindObjectsSortMode.None).Any(p=>p.isPlaying),"Original lobby particles are playing");
            Require(FindObjectsByType<AudioSource>(FindObjectsSortMode.None).Any(a=>a.isPlaying&&a.loop),"Lobby music is playing");
            language=MyPlayer.UseLanguage;loadout=(FeatureData[])MyPlayer.ChallengeSelectFeatures.Clone();hadTutorial=PlayerPrefs.HasKey(LocoData.InitTutorial.ToString());tutorial=PlayerPrefs.GetInt(LocoData.InitTutorial.ToString());hadPurchase=PlayerPrefs.HasKey(LocoData.PurchaseSkillTutorial.ToString());purchase=PlayerPrefs.GetInt(LocoData.PurchaseSkillTutorial.ToString());saved=true;
            PlayerPrefs.SetInt(LocoData.InitTutorial.ToString(),1);PlayerPrefs.SetInt(LocoData.PurchaseSkillTutorial.ToString(),1);MyPlayer.SetLanguage(Language.Chinese);
            Screen.SetResolution(1280,800,false);yield return new WaitForSeconds(2);Capture("01-lobby-1280x800");
            Click("Collection");yield return new WaitForSeconds(.7f);Require(UI.CurrentView=="collection","collection navigation");Capture("02-collection-head");
            Click("Part 1");yield return new WaitForSeconds(.3f);Capture("03-collection-body");
            Click("Part 2");yield return new WaitForSeconds(.3f);Capture("04-collection-back");
            var locked=FeatureData.BackFeatureList.FirstOrDefault(f=>!f.Owned&&f.SoldType==Currency.Star);
            if(locked!=null)
            {
                var skillButton=UI.GetComponentsInChildren<Button>().First(b=>b.name=="Skill "+locked.ID);var scroll=skillButton.GetComponentInParent<ScrollRect>();scroll.verticalNormalizedPosition=1-Mathf.Clamp01(FeatureData.BackFeatureList.IndexOf(locked)/4f/(Mathf.Ceil(FeatureData.BackFeatureList.Count/4f)-3));yield return new WaitForSeconds(.2f);
                skillButton.onClick.Invoke();yield return null;Click("Use skill");yield return new WaitForSeconds(.3f);Capture("05-purchase-confirm");Click("Cancel dialog");yield return new WaitForSeconds(.2f);
            }
            Click("Back");yield return new WaitForSeconds(.2f);Click("Challenge");yield return new WaitForSeconds(.4f);Capture("06-loadout");
            Click("Loadout 0");yield return new WaitForSeconds(.3f);Require(UI.CurrentView=="select","skill selection navigation");Capture("07-select-skill");
            Click("Use skill");yield return new WaitForSeconds(.3f);Require(UI.CurrentView=="loadout","equip returns to loadout");
            Click("Start matchmaking");until=Time.realtimeSinceStartup+25;while(!PhotonNetwork.InRoom&&Time.realtimeSinceStartup<until)yield return null;Require(PhotonNetwork.InRoom,"matchmaking joined actual Photon room");yield return new WaitForSeconds(.3f);Require(UI.CurrentView=="matching","matchmaking presentation");Capture("08-matchmaking");Click("Cancel matchmaking");yield return new WaitForSeconds(2);
            Require(!ChallengeUI.IsFindingOpponent,"cancel clears matchmaking");Click("Back");yield return new WaitForSeconds(.3f);
            Click("Settings");yield return new WaitForSeconds(.3f);Capture("09-settings");
            Click("RegionDropDown");yield return new WaitForSeconds(.2f);Capture("10-region-options");Click("Close choices");yield return new WaitForSeconds(.2f);
            Click("Settings tab 1");yield return new WaitForSeconds(.5f);Capture("11-shouts");
            Click("Settings tab 2");yield return new WaitForSeconds(.3f);Capture("12-credits");
            Click("Settings tab 0");yield return new WaitForSeconds(.3f);Click("Tutorial");yield return new WaitForSeconds(.3f);Capture("13-tutorial");Click("Next page");yield return new WaitForSeconds(.3f);Capture("14-tutorial-page2");
            for(int p=3;p<=10;p++){Click("Next page");yield return new WaitForSeconds(.2f);Capture("guide-page-"+p);}
            Click("Close tutorial");
            PopupUI.ShowClickCancel("連線中斷。請檢查網路後再試一次。\nConnection interrupted. Please try again.",null);yield return new WaitForSeconds(.3f);Capture("15-connection-notice");Click("Close dialog");yield return new WaitForSeconds(.2f);
            Click("Back");yield return new WaitForSeconds(.3f);
            foreach(var size in new[]{new Vector2Int(1920,1080),new Vector2Int(2560,1080),new Vector2Int(1024,768),new Vector2Int(960,540)})
            {
                Screen.SetResolution(size.x,size.y,false);yield return new WaitForSeconds(.5f);Capture("lobby-"+size.x+"x"+size.y);
                Click("Collection");yield return new WaitForSeconds(.3f);Capture("collection-"+size.x+"x"+size.y);Click("Back");yield return new WaitForSeconds(.3f);
                Click("Settings");yield return new WaitForSeconds(.25f);Capture("settings-"+size.x+"x"+size.y);
                Click("Settings tab 1");yield return new WaitForSeconds(.25f);Capture("shouts-"+size.x+"x"+size.y);
                Click("Settings tab 0");yield return new WaitForSeconds(.25f);Click("Tutorial");yield return new WaitForSeconds(.25f);Capture("guide-"+size.x+"x"+size.y);Click("Close tutorial");yield return new WaitForSeconds(.2f);Click("Back");yield return new WaitForSeconds(.2f);
                Click("Challenge");yield return new WaitForSeconds(.25f);Capture("loadout-"+size.x+"x"+size.y);
                Click("Loadout 0");yield return new WaitForSeconds(.25f);Capture("selection-"+size.x+"x"+size.y);Click("Back");yield return new WaitForSeconds(.2f);Click("Back");yield return new WaitForSeconds(.2f);
            }
            Screen.SetResolution(1280,800,false);MyPlayer.SetLanguage(Language.English);yield return new WaitForSeconds(.4f);Capture("16-lobby-english");Click("Settings");yield return new WaitForSeconds(.3f);Capture("17-settings-english");Click("Back");yield return new WaitForSeconds(.2f);
            Click("Collection");yield return new WaitForSeconds(.25f);Capture("collection-english");Click("Back");yield return new WaitForSeconds(.2f);
            Click("Challenge");yield return new WaitForSeconds(.25f);Capture("loadout-english");Click("Back");yield return new WaitForSeconds(.2f);
            MyPlayer.SetLanguage(Language.Chinese);PhotonLauncher.SelectGameType=GameType.InfinityWar;SceneManager.LoadScene("Battle");
            until=Time.realtimeSinceStartup+30;while((!BattleManager.BM||!BattleManager.BM.MyPlayerRole||!BattleManager.BM.MyPlayerRole.IsInitialized)&&Time.realtimeSinceStartup<until)yield return null;
            Require(BattleManager.BM&&BattleManager.BM.MyPlayerRole,"offline arena spawn");
            foreach(FeaturePart p in Enum.GetValues(typeof(FeaturePart))){var feature=FeatureData.GetAllFeatureDatas(p).First(f=>f.Owned);BattleManager.BM.MyPlayerRole.GetFeature(p,feature.ID);}
            yield return new WaitForSeconds(2);Capture("18-battle-hud");
            foreach(var size in new[]{new Vector2Int(1920,1080),new Vector2Int(2560,1080),new Vector2Int(1024,768),new Vector2Int(960,540)})
            {Screen.SetResolution(size.x,size.y,false);yield return new WaitForSeconds(.3f);Capture("hud-"+size.x+"x"+size.y);}
            Click("Leave arena");yield return new WaitForSeconds(.3f);Capture("19-leave-confirm");Click("Cancel dialog");
            BattleUI.Myself.Settlement(3,5,12,TimeSpan.FromSeconds(46));yield return new WaitForSeconds(.4f);Capture("20-result-layout-fixture");
            foreach(var size in new[]{new Vector2Int(1920,1080),new Vector2Int(2560,1080),new Vector2Int(1024,768),new Vector2Int(1280,800)})
            {Screen.SetResolution(size.x,size.y,false);yield return new WaitForSeconds(.3f);Capture("result-fixture-"+size.x+"x"+size.y);}
            Click("Play again");yield return new WaitForSeconds(1);Require(UI.CurrentView=="battle","restart returns to HUD");Capture("21-restarted-hud");
            report.checks.Add("5 resolutions; both languages; original controller actions; result fixture explicitly synthetic; no completed purchases");
        }
        AstralPresentation UI=>AstralPresentation.Instance;
        void Click(string name)
        {
            var b=UI.GetComponentsInChildren<Button>().FirstOrDefault(x=>x.name==name&&x.isActiveAndEnabled&&x.interactable);if(!b)throw new Exception("Missing interactive button: "+name);
            var p=RectTransformUtility.WorldToScreenPoint(null,b.transform.position);var data=new PointerEventData(EventSystem.current){position=p};var hits=new List<RaycastResult>();EventSystem.current.RaycastAll(data,hits);
            Require(hits.Count>0&&(hits[0].gameObject==b.gameObject||hits[0].gameObject.transform.IsChildOf(b.transform)),"unobstructed pointer: "+name);
            ExecuteEvents.Execute(b.gameObject,data,ExecuteEvents.pointerClickHandler);report.checks.Add("Clicked "+name);
        }
        void Capture(string name)
        {
            Canvas.ForceUpdateCanvases();var corners=new Vector3[4];
            foreach(var t in UI.GetComponentsInChildren<Text>())Require(!t.text.Contains("ASTRAL SANCTUM")&&!t.text.Contains("星儀神殿")&&!t.text.Contains("星際征途告一段落"),"No added lore: "+t.name);
            if(UI.CurrentView=="battle"||UI.CurrentView=="result")
            {
                foreach(var pin in UI.GetComponentsInChildren<AstralCorner>())
                {
                    ((RectTransform)pin.transform).GetWorldCorners(corners);
                    float edgeX=pin.corner.x==0?corners[0].x:Screen.width-corners[2].x;
                    float edgeY=pin.corner.y==0?corners[0].y:Screen.height-corners[2].y;
                    Require(edgeX>=0&&edgeX<=30,"HUD follows horizontal edge: "+pin.name);
                    if(pin.name!="Leaderboard")Require(edgeY>=0&&edgeY<=30,"HUD follows vertical edge: "+pin.name);
                }
                Require(!UI.GetComponentsInChildren<Text>().Any(t=>t.text=="NEON IMPACT"),"No redundant battle logo");
            }
            foreach(var s in UI.GetComponentsInChildren<Selectable>())
            {
                if(s.GetComponentInParent<ScrollRect>())continue;var r=s.transform as RectTransform;r.GetWorldCorners(corners);
                Require(corners.All(c=>c.x>=-2&&c.y>=-2&&c.x<=Screen.width+2&&c.y<=Screen.height+2),"in-screen control "+s.name+" at "+Screen.width+"x"+Screen.height);
            }
            foreach(var slider in UI.GetComponentsInChildren<Slider>())
            {
                var r=(RectTransform)slider.transform;slider.fillRect.GetWorldCorners(corners);var own=new Vector3[4];r.GetWorldCorners(own);
                Require(corners.All(p=>p.x>=own[0].x-2&&p.x<=own[2].x+2),"slider fill stays in track: "+slider.name);
            }
            NeonRenderCapture.Capture(Path.Combine(folder,name+".png"));report.screens.Add(name+" ("+Screen.width+"x"+Screen.height+")");
        }
        void Require(bool ok,string check){if(!ok)throw new Exception(check);report.checks.Add(check);}
        void Finish(string failure)
        {
            if(saved){MyPlayer.SetLanguage(language);MyPlayer.SetChallengeSelectFeatures(loadout);if(hadTutorial)PlayerPrefs.SetInt(LocoData.InitTutorial.ToString(),tutorial);else PlayerPrefs.DeleteKey(LocoData.InitTutorial.ToString());if(hadPurchase)PlayerPrefs.SetInt(LocoData.PurchaseSkillTutorial.ToString(),purchase);else PlayerPrefs.DeleteKey(LocoData.PurchaseSkillTutorial.ToString());PlayerPrefs.Save();}
            report.failure=failure??(report.errors.Count>0?"Runtime errors":"");report.passed=report.failure=="";
            File.WriteAllText(Path.Combine(folder,"report.json"),JsonUtility.ToJson(report,true));Debug.Log("ASTRAL_UI_CHECK "+report.passed);Application.Quit(report.passed?0:1);
        }
    }
}
