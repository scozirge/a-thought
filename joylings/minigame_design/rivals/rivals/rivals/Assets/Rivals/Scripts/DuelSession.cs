using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Fusion;
using Fusion.Sockets;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

namespace RivalsPrototype {
  public class DuelSession : MonoBehaviour, INetworkRunnerCallbacks {
    public const int MaxPlayers=8;
    public static DuelSession Instance;
    public NetworkRunner Runner;
    public DuelMatch Match;
    public DuelPlayer Local;
    public Vector2 Look;
    public string Room = "classroom-01";
    public string Region = "asia";
    public string Message = "";
    public Camera LobbyCamera;
    bool busy, started, paused, showCredits, showSettings;
    Font classroomFont;
    Texture2D settingsIcon;
    int expectedPlayers=2;
    int weapon;
    public bool AudioEnabled { get; private set; }
    public void SetAudioEnabled(bool enabled){AudioEnabled=enabled;AudioListener.pause=!enabled;AudioListener.volume=enabled?.65f:0f;}
    NetworkButtons pending;
    float sensitivity = .12f;
    int lastHits;
    float hitUntil;
    GUIStyle title, text, large, button, small;
    bool smoke, captured;
    string capturePath;
    float smokeStarted, smokeReadyAt=-1;
    void Awake() {
      Instance=this;Application.runInBackground=true;Application.targetFrameRate=60;SetAudioEnabled(false);
      Room=PlayerPrefs.GetString("Rivals.Classroom.Room","classroom-01");
      Region=PlayerPrefs.GetString("Rivals.Classroom.Region","asia");
    }
    async void Start() {
      var args = Environment.GetCommandLineArgs();
      smoke = args.Contains("-duelSmoke");
      if(int.TryParse(Arg(args,"-expectedPlayers","2"),out int count))expectedPlayers=Mathf.Clamp(count,2,MaxPlayers);
      capturePath=Arg(args,"-capture","");
      if(int.TryParse(Arg(args,"-testWeapon","0"),out int selected))weapon=Mathf.Clamp(selected,0,Weapons.Names.Length-1);
      if (smoke) {
        Room = Arg(args, "-room", "rivals-smoke"); smokeStarted = Time.realtimeSinceStartup;
        await Connect(args.Contains("-auto") ? GameMode.AutoHostOrClient : args.Contains("-host") ? GameMode.Host : args.Contains("-client") ? GameMode.Client : GameMode.Single);
      }
    }
    static string Arg(string[] args,string key,string fallback) { int i=Array.IndexOf(args,key);return i>=0&&i+1<args.Length?args[i+1]:fallback; }
    public void SetLobbyCamera(bool active) { if (LobbyCamera) LobbyCamera.gameObject.SetActive(active); }
    async Task Connect(GameMode mode) {
      if(busy || Runner) return;
      if(mode != GameMode.Single && (string.IsNullOrWhiteSpace(Room) || Room.Length > 32)) {Message="請老師檢查房間設定。";return;}
      busy=true; Message="等一下，馬上就好！";
      var go = new GameObject("Fusion Runner"); Runner=go.AddComponent<NetworkRunner>();
      Runner.ProvideInput=true; Runner.AddCallbacks(this);
      var scenes=go.AddComponent<NetworkSceneManagerDefault>();
      var settings=Fusion.Photon.Realtime.PhotonAppSettings.Global.AppSettings.GetCopy();
      settings.FixedRegion=Region; settings.AppVersion="rivals-classroom-5";
      try {
        var result=await Runner.StartGame(new StartGameArgs { GameMode=mode, SessionName=Room.Trim(), PlayerCount=MaxPlayers,IsVisible=false,
          Scene=SceneRef.FromIndex(SceneManager.GetActiveScene().buildIndex), SceneManager=scenes,
          CustomPhotonAppSettings=settings, EnableClientSessionCreation=mode!=GameMode.Client });
        if(!result.Ok) { Message=ConnectionMessage(result.ShutdownReason); Debug.LogWarning("RIVALS_CONNECT_FAILED "+result); Destroy(go);Runner=null;return; }
        started=true;
        Debug.Log($"RIVALS_START server={Runner.IsServer} sceneBusy={scenes.IsBusy} players={Runner.ActivePlayers.Count()}");
        Message="";showSettings=false;paused=false; Debug.Log("RIVALS_CONNECTED "+mode);
        if(!smoke) {Cursor.lockState=CursorLockMode.Locked;Cursor.visible=false;}
      } catch(Exception e) {Debug.LogException(e);if(Runner) await Runner.Shutdown();Message="現在連不上，請老師幫忙看看。";}
      finally {busy=false;}
    }
    void EnsureRoster(NetworkRunner runner) {
      if(!runner.IsServer)return;
      if(!Match || !Match.Object || !Match.Object.IsValid) {
        Match=runner.Spawn(Resources.Load<GameObject>("RivalsMatch").GetComponent<NetworkObject>()).GetComponent<DuelMatch>();
        Debug.Log($"RIVALS_MATCH_SPAWN valid={Match.Object && Match.Object.IsValid}");
      }
      foreach(var player in runner.ActivePlayers)SpawnPlayer(player);
      if(runner.GameMode==GameMode.Single&&!Match.Players.Any(p=>p.IsBot))SpawnBot();
    }
    void SpawnPlayer(PlayerRef player) {
      if(Runner.TryGetPlayerObject(player,out _)) return;
      var players=Match.Players;
      if(players.Length>=MaxPlayers)return;
      int preferredTeam=players.Count(p=>p.Team==0)<=players.Count(p=>p.Team==1)?0:1;
      int seat=Enumerable.Range(0,MaxPlayers).Where(n=>!players.Any(p=>p.Seat==n)).OrderBy(n=>n%2==preferredTeam?0:1).First();
      var obj=Runner.Spawn(Resources.Load<GameObject>("RivalsPlayer").GetComponent<NetworkObject>(),DuelPlayer.SpawnPosition(seat),Quaternion.identity,player,
        (r,o)=>{o.GetComponent<DuelPlayer>().Seat=seat;});
      Runner.SetPlayerObject(player,obj);
    }
    void SpawnBot() { Runner.Spawn(Resources.Load<GameObject>("RivalsPlayer").GetComponent<NetworkObject>(),new Vector3(0,.1f,13),Quaternion.identity,PlayerRef.None,
      (r,o)=>{var p=o.GetComponent<DuelPlayer>();p.Seat=1;p.IsBot=true;}); }
    async void Leave() {
      if(busy) return;busy=true;
      if(Runner) await Runner.Shutdown();
      SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }
    void Update() {
      if(smoke&&smokeReadyAt<0&&Local&&Match&&Match.Object&&Match.Object.IsValid&&Match.Players.Length==expectedPlayers)smokeReadyAt=Time.realtimeSinceStartup;
      if(smoke&&!captured&&capturePath.Length>0&&Local&&Time.realtimeSinceStartup-smokeStarted>9) {
        captured=true;
        if(Environment.GetCommandLineArgs().Contains("-offscreen")) {
          var camera=Local.ViewCamera;
          var target=new RenderTexture(1280,720,24);var previous=RenderTexture.active;
          camera.targetTexture=target;camera.Render();RenderTexture.active=target;
          var pixels=new Texture2D(1280,720,TextureFormat.RGB24,false);pixels.ReadPixels(new Rect(0,0,1280,720),0,0);pixels.Apply();
          System.IO.File.WriteAllBytes(capturePath,pixels.EncodeToPNG());camera.targetTexture=null;RenderTexture.active=previous;target.Release();Destroy(target);Destroy(pixels);
        }else ScreenCapture.CaptureScreenshot(capturePath);
        Debug.Log("RIVALS_CAPTURE "+capturePath);
      }
      if(smoke && Match && Match.Object && Match.Object.IsValid && Match.Players.Length==expectedPlayers && smokeReadyAt>=0 && Time.realtimeSinceStartup-smokeReadyAt>20) {
        Debug.Log($"RIVALS_SMOKE_OK players={Match.Players.Length} bluePlayers={Match.Players.Count(p=>p.Team==0)} redPlayers={Match.Players.Count(p=>p.Team==1)} phase={Match.Phase} local={Local != null} shots={Local?.Shots} hits={Local?.Hits} score={Match.Blue}:{Match.Red}");
        smoke=false;Invoke(nameof(FinishSmoke),10);
      } else if(smoke && Time.realtimeSinceStartup-smokeStarted>90) {Debug.LogError("RIVALS_SMOKE_TIMEOUT "+Message+$" match={Match != null} players={(Match?Match.Players.Length:-1)} local={Local != null}");Application.Quit(2);smoke=false;}
      var k=Keyboard.current;var m=Mouse.current;
      if(k==null||m==null) return;
      if(k.f8Key.wasPressedThisFrame)ToggleSettings();
      if(k.escapeKey.wasPressedThisFrame && started) {paused=true;Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}
      if(Local && Cursor.lockState==CursorLockMode.Locked && !paused) {
        var delta=m.delta.ReadValue()*sensitivity;
        Look.x+=delta.x;Look.y=Mathf.Clamp(Look.y-delta.y,-85,85);
        if(k.digit1Key.wasPressedThisFrame) weapon=0;if(k.digit2Key.wasPressedThisFrame) weapon=1;if(k.digit3Key.wasPressedThisFrame) weapon=2;
        if(k.digit4Key.wasPressedThisFrame)weapon=3;if(k.digit5Key.wasPressedThisFrame)weapon=4;
        if(k.spaceKey.wasPressedThisFrame) pending.Set(Action.Jump,true);
        if(k.rKey.wasPressedThisFrame) pending.Set(Action.Reload,true);
        if(k.cKey.wasPressedThisFrame) pending.Set(Action.Slide,true);
      }

    }
    void FinishSmoke(){Application.Quit(0);}
    void ToggleSettings() {
      showSettings=!showSettings;showCredits=false;
      if(started){paused=true;Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}
    }
    void OnDestroy(){if(settingsIcon)Destroy(settingsIcon);}
    public void OnInput(NetworkRunner runner, NetworkInput input) {
      var d=new DuelInput{Look=Look,Weapon=weapon,Buttons=pending};pending=default;
      var k=Keyboard.current;var m=Mouse.current;
      if(k!=null && m!=null && !paused && Cursor.lockState==CursorLockMode.Locked) {
        d.Move=new Vector2((k.dKey.isPressed?1:0)-(k.aKey.isPressed?1:0),(k.wKey.isPressed?1:0)-(k.sKey.isPressed?1:0));
        d.Buttons.Set(Action.Fire,m.leftButton.isPressed);d.Buttons.Set(Action.Aim,m.rightButton.isPressed);d.Buttons.Set(Action.Sprint,k.leftShiftKey.isPressed);
      }
      if(smoke && Local && Match && Match.Object && Match.Object.IsValid && Match.Phase==2) {
        var enemy=Match.Players.FirstOrDefault(p=>p.Team!=Local.Team&&p.Health>0);
        if(enemy) {
          var delta=enemy.transform.position-Local.transform.position;
          var angle=Quaternion.LookRotation(delta.normalized).eulerAngles;
          Look=d.Look=new Vector2(angle.y,angle.x>180?angle.x-360:angle.x);
          var travel=Quaternion.Euler(0,-angle.y,0)*new Vector3(Mathf.Clamp(10-Local.transform.position.x,-1,1),0,0);
          d.Move=new Vector2(travel.x,travel.z);d.Buttons.Set(Action.Fire,true);
        }
      }
      input.Set(d);
    }
    static string ConnectionMessage(ShutdownReason reason) {
      switch(reason) {
        case ShutdownReason.GameNotFound:return "還沒有人開房，先按「開房間」吧！";
        case ShutdownReason.GameIsFull:return "房間滿了，最多 8 人喔。";
        case ShutdownReason.GameIdAlreadyExists:
        case ShutdownReason.ServerInRoom:return "朋友已經開房了，按「加入房間」吧！";
        case ShutdownReason.GameClosed:return "這個房間關閉了，請重新開房。";
        case ShutdownReason.Ok:return "已離開房間。";
        default:return "現在連不上，請再試一次，或找老師幫忙。";
      }
    }
    void Styles() {
      if(title!=null)return;
      classroomFont=Resources.Load<Font>("Fonts/NotoSansTC-Regular");
      if(!classroomFont)Debug.LogError("RIVALS_CHINESE_FONT_MISSING");
      GUI.skin.font=classroomFont;
      title=new GUIStyle(GUI.skin.label){font=classroomFont,fontSize=52,fontStyle=FontStyle.Bold,alignment=TextAnchor.MiddleCenter};title.normal.textColor=Color.white;
      text=new GUIStyle(GUI.skin.label){font=classroomFont,fontSize=22,alignment=TextAnchor.MiddleCenter,wordWrap=true};text.normal.textColor=new Color(.87f,.94f,1f);
      large=new GUIStyle(title){fontSize=34};small=new GUIStyle(text){fontSize=18,wordWrap=false,clipping=TextClipping.Clip};
      button=new GUIStyle(GUI.skin.button){font=classroomFont,fontSize=26,fontStyle=FontStyle.Bold};
      GUI.skin.textField.font=classroomFont;GUI.skin.textField.fontSize=22;
      // Draw the icon independently of the text font, which has no gear glyph.
      settingsIcon=new Texture2D(64,64,TextureFormat.RGBA32,false){filterMode=FilterMode.Bilinear,wrapMode=TextureWrapMode.Clamp};
      for(int y=0;y<64;y++)for(int x=0;x<64;x++) {
        var p=new Vector2((x+.5f-32)/32f,(y+.5f-32)/32f);
        float radius=p.magnitude;
        float tooth=Mathf.Clamp01(Mathf.Cos(Mathf.Atan2(p.y,p.x)*8)*3+.5f);
        float alpha=Mathf.Clamp01((.70f+.18f*tooth-radius)*32+.5f)*Mathf.Clamp01((radius-.29f)*32+.5f);
        settingsIcon.SetPixel(x,y,new Color(.87f,.94f,1f,alpha));
      }
      settingsIcon.Apply(false,true);
    }
    void DrawSettingsButton() {
      if(started&&!paused&&!showSettings&&!showCredits)return;
      var rect=new Rect(1200,24,56,56);
      if(GUI.Button(rect,new GUIContent("","設定"),button))ToggleSettings();
      GUI.DrawTexture(new Rect(rect.x+10,rect.y+10,36,36),settingsIcon);
      if(GUI.tooltip=="設定")GUI.Label(new Rect(1130,82,126,30),"設定",small);
    }
    void Panel(Rect r) {var old=GUI.color;GUI.color=new Color(.012f,.019f,.032f,.94f);GUI.DrawTexture(r,Texture2D.whiteTexture);GUI.color=old;}
    void Fill(Rect r,Color color) {var old=GUI.color;GUI.color=color;GUI.DrawTexture(r,Texture2D.whiteTexture);GUI.color=old;}
    bool ColorButton(Rect r,string label,Color color) {
      var old=GUI.backgroundColor;GUI.backgroundColor=color;bool clicked=GUI.Button(r,label,button);GUI.backgroundColor=old;return clicked;
    }
    void DrawSettings() {
      Panel(new Rect(260,65,760,590));GUI.Label(new Rect(280,90,720,65),"老師設定",large);
      GUI.Label(new Rect(280,165,720,38),"同一班用同一個房間，最多 8 人。",text);
      bool editable=!busy&&!started;
      GUI.enabled=editable;
      GUI.Label(new Rect(290,230,160,40),"房間代號",text);Room=GUI.TextField(new Rect(470,230,500,44),Room,32);
      GUI.Label(new Rect(290,292,160,40),"連線區域",text);Region=GUI.TextField(new Rect(470,292,500,44),Region,16);
      if(GUI.Button(new Rect(310,365,300,55),"儲存設定",button)) {
        if(string.IsNullOrWhiteSpace(Room)||string.IsNullOrWhiteSpace(Region))Message="房間代號和連線區域都要填喔。";
        else {Room=Room.Trim();Region=Region.Trim().ToLowerInvariant();PlayerPrefs.SetString("Rivals.Classroom.Room",Room);PlayerPrefs.SetString("Rivals.Classroom.Region",Region);PlayerPrefs.Save();Message="設定儲存好了。";}
      }
      if(GUI.Button(new Rect(630,365,340,55),"自己練習",button))_=Connect(GameMode.Single);
      GUI.enabled=true;
      if(GUI.Button(new Rect(310,445,300,55),"素材與授權",button))showCredits=true;
      if(GUI.Button(new Rect(630,445,340,55),"關閉設定",button)){showSettings=false;if(!busy)Message="";}
      GUI.Label(new Rect(290,520,700,45),editable?Message:"遊戲結束後才能更改房間設定。",text);
      GUI.Label(new Rect(290,588,700,30),"點右上角齒輪，或按 F8 開啟／關閉設定。",small);
    }
    void OnGUI() {
      Styles();GUI.matrix=Matrix4x4.TRS(Vector3.zero,Quaternion.identity,new Vector3(Screen.width/1280f,Screen.height/720f,1));
      DrawSettingsButton();
      if(showCredits) {
        Panel(new Rect(210,65,860,590));GUI.Label(new Rect(235,85,810,65),"素材與授權",large);
        GUI.Label(new Rect(245,170,790,330),"槍械與短刀：Quaternius（CC0）\n素材、準星與腳步聲：Kenney（CC0）\n角色與格線場地：本專案製作\n換彈音效：SpringySpringo（CC0）\n中文字型：Noto Sans CJK TC（SIL OFL 1.1）\n\n槍聲：(c) 2009 Vincent Sevedge（Tabasco）\n採用 Creative Commons 姓名標示 3.0 授權\n已裁切首發槍聲、轉單聲道並調整音量。\n\n本遊戲為非官方練習作品。\n原始授權文件與遊戲一起提供。",new GUIStyle(text){fontSize=18});
        if(GUI.Button(new Rect(250,560,245,55),"槍聲來源",button))Application.OpenURL("https://opengameart.org/content/gunshot-sounds");
        if(GUI.Button(new Rect(515,560,245,55),"查看授權",button))Application.OpenURL("https://creativecommons.org/licenses/by/3.0/");
        if(GUI.Button(new Rect(780,560,245,55),"返回設定",button)){showCredits=false;showSettings=true;}
        return;
      }
      if(showSettings){DrawSettings();return;}
      if(!started) {
        Panel(new Rect(330,105,620,520));GUI.Label(new Rect(360,135,560,90),"和朋友一起玩",title);
        GUI.Label(new Rect(365,225,550,45),"最多 8 人，分成兩隊一起玩！",text);
        GUI.enabled=!busy;
        if(ColorButton(new Rect(420,300,440,80),"開房間",new Color(.25f,.8f,1f)))_=Connect(GameMode.AutoHostOrClient);
        if(ColorButton(new Rect(420,395,440,80),"加入房間",new Color(1f,.77f,.34f)))_=Connect(GameMode.Client);
        GUI.enabled=true;
        GUI.Label(new Rect(355,495,570,62),Message,text);
        GUI.Label(new Rect(360,570,560,35),"一位同學開房，其他人按加入。",small);return;
      }
      if(!Match||!Match.Object||!Match.Object.IsValid){GUI.Label(new Rect(400,310,480,90),"馬上就好！",large);return;}
      var players=Match.Players;
      Panel(new Rect(400,18,480,114));
      GUI.Label(new Rect(405,18,470,46),$"藍隊 {Match.Blue}  ：  {Match.Red} 紅隊",large);
      GUI.Label(new Rect(405,63,470,32),Match.Phase==0?"兩個人就能開始！":$"第 {Match.Round} 回合　剩 {Mathf.CeilToInt(Match.Timer.RemainingTime(Runner)??0)} 秒",text);
      GUI.Label(new Rect(405,96,470,28),$"藍隊 {players.Count(p=>p.Team==0)} 人　紅隊 {players.Count(p=>p.Team==1)} 人　先拿 5 分！",small);
      if(Local) {
        if(Local.Hits!=lastHits){lastHits=Local.Hits;hitUntil=Time.unscaledTime+.16f;}
        if(Time.unscaledTime<hitUntil)GUI.Label(new Rect(617,335,46,46),"×",large);
        Panel(new Rect(24,566,218,98));GUI.Label(new Rect(34,574,198,45),$"體力 {Local.Health}",large);
        Fill(new Rect(38,624,190,9),new Color(.025f,.04f,.05f));Fill(new Rect(38,624,190*Mathf.Clamp01(Local.Health/100f),9),new Color(.22f,.95f,.045f));
        GUI.Label(new Rect(34,637,198,25),Local.Team==0?"我是藍隊":"我是紅隊",small);
        Panel(new Rect(978,566,278,98));GUI.Label(new Rect(990,574,254,28),Weapons.Names[Local.Weapon],text);
        GUI.Label(new Rect(990,610,254,45),Local.Weapon==2?"近距離":Local.ReloadTimer.IsRunning?"換子彈中…":$"{Local.Ammo} / {Weapons.Magazines[Local.Weapon]}",Local.ReloadTimer.IsRunning?text:large);
        for(int slot=0;slot<Weapons.Names.Length;slot++) {
          var box=new Rect(294+slot*132,586,124,76);Panel(box);
          if(slot==Local.Weapon)Fill(new Rect(box.x,box.y+72,box.width,4),new Color(1,.58f,.13f));
          var icons=DuelArt.Get?DuelArt.Get.WeaponIcons:null;
          if(icons!=null&&slot<icons.Length&&icons[slot])GUI.DrawTexture(new Rect(box.x+8,box.y+2,108,46),icons[slot],ScaleMode.ScaleToFit,true);
          GUI.Label(new Rect(box.x+4,box.y+45,box.width-8,28),$"{slot+1} {Weapons.Names[slot]}",small);
        }
        if(!paused){var art=DuelArt.Get;if(art&&art.Crosshair)GUI.DrawTexture(new Rect(626,346,28,28),art.Crosshair);else GUI.Label(new Rect(625,343,30,35),"+",large);}
      }
      Panel(new Rect(24,675,1232,34));
      GUI.Label(new Rect(30,675,1220,34),"WASD 移動　滑鼠瞄準　左鍵開槍　空白鍵跳躍　R 換子彈　Esc 選單",small);
      if(!smoke&&!paused&&Local&&Match.Phase!=4&&Cursor.lockState!=CursorLockMode.Locked) {
        if(GUI.Button(new Rect(450,482,380,58),"點一下，開始玩！",button)){Cursor.lockState=CursorLockMode.Locked;Cursor.visible=false;}
      }
      if(Match.Phase!=2&&!paused) {
        string caption=Match.Phase==0?"等朋友來！":Match.Phase==1?"準備出發！":Match.Phase==3?"這回合結束！":"遊戲結束！";
        Panel(new Rect(340,225,600,245));GUI.Label(new Rect(360,245,560,65),caption,large);
        string detail=Match.Phase==0?$"請朋友按「加入房間」。\n現在有 {players.Length} 人，最多 {MaxPlayers} 人。":Match.Phase==4?(Match.Blue>Match.Red?"藍隊贏了！":"紅隊贏了！"):$"{Mathf.CeilToInt(Match.Timer.RemainingTime(Runner)??0)}";
        GUI.Label(new Rect(360,325,560,85),detail,text);
        if(Match.Phase==4){Cursor.lockState=CursorLockMode.None;Cursor.visible=true;if(GUI.Button(new Rect(460,415,360,55),"再玩一次",button)){Match.RPC_Rematch();Cursor.lockState=CursorLockMode.Locked;Cursor.visible=false;}}
      } else if(!paused&&Local&&Local.Health<=0) {
        Panel(new Rect(340,260,600,130));GUI.Label(new Rect(355,280,570,90),"幫隊友加油！\n下一回合就能回來玩。",text);
      }
      if(paused) {
        Panel(new Rect(360,125,560,500));GUI.Label(new Rect(390,150,500,65),"休息一下",large);
        GUI.Label(new Rect(380,225,520,40),"WASD 移動　左鍵開槍　空白鍵跳躍",small);
        GUI.Label(new Rect(380,270,520,40),"右鍵瞄準　R 換子彈　1～5 換武器",small);
        if(GUI.Button(new Rect(410,330,460,65),"繼續玩",button)){paused=false;Cursor.lockState=CursorLockMode.Locked;Cursor.visible=false;}
        if(GUI.Button(new Rect(410,410,460,50),AudioEnabled?"聲音：開":"聲音：關",button))SetAudioEnabled(!AudioEnabled);
        if(GUI.Button(new Rect(410,475,460,55),"回首頁",button))Leave();
        GUI.Label(new Rect(380,552,520,35),"朋友的遊戲還在進行喔。",small);
      }
    }
    public void OnPlayerJoined(NetworkRunner r,PlayerRef p){Debug.Log($"RIVALS_JOINED {p} started={started} server={r.IsServer} match={Match != null}");EnsureRoster(r);}
    public void OnPlayerLeft(NetworkRunner r,PlayerRef p){if(r.IsServer&&r.TryGetPlayerObject(p,out var o))r.Despawn(o);Message="";}
    public void OnShutdown(NetworkRunner r,ShutdownReason reason){Debug.Log("RIVALS_SHUTDOWN "+reason);Message=ConnectionMessage(reason);started=false;paused=false;busy=false;Cursor.lockState=CursorLockMode.None;Cursor.visible=true;SetLobbyCamera(true);if(r)Destroy(r.gameObject);Runner=null;Match=null;Local=null;}
    public void OnDisconnectedFromServer(NetworkRunner r,NetDisconnectReason reason){Message="房間斷線了，請再加入一次。";}
    public void OnConnectRequest(NetworkRunner r,NetworkRunnerCallbackArgs.ConnectRequest request,byte[] token){if(r.ActivePlayers.Count()<MaxPlayers)request.Accept();else request.Refuse();}
    public void OnConnectFailed(NetworkRunner r,NetAddress address,NetConnectFailedReason reason){Message="現在連不上，請再試一次。";}
    public void OnConnectedToServer(NetworkRunner r){}
    public void OnInputMissing(NetworkRunner r,PlayerRef p,NetworkInput i){}
    public void OnSceneLoadDone(NetworkRunner r){}
    public void OnSceneLoadStart(NetworkRunner r){}
    public void OnObjectExitAOI(NetworkRunner r,NetworkObject o,PlayerRef p){}
    public void OnObjectEnterAOI(NetworkRunner r,NetworkObject o,PlayerRef p){}
    public void OnSessionListUpdated(NetworkRunner r,List<SessionInfo> list){}
    public void OnCustomAuthenticationResponse(NetworkRunner r,Dictionary<string,object> data){}
    public void OnHostMigration(NetworkRunner r,HostMigrationToken token){}
    public void OnReliableDataReceived(NetworkRunner r,PlayerRef p,ReliableKey key,ReadOnlySpan<byte> data){}
    public void OnReliableDataProgress(NetworkRunner r,PlayerRef p,ReliableKey key,float progress){}
  }
}
