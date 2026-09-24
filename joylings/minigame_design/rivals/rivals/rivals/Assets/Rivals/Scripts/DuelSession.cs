using System;
using System.Collections.Generic;
using System.Linq;
using Fusion;
using Fusion.Sockets;
using UnityEngine;
using UnityEngine.InputSystem;

namespace RivalsPrototype {
  public partial class DuelSession : MonoBehaviour, INetworkRunnerCallbacks {
    public const int MaxPlayers=8;
    public static DuelSession Instance;
    public NetworkRunner Runner;
    public DuelMatch Match;
    public DuelPlayer Local;
    readonly List<DuelPlayer> registeredPlayers=new List<DuelPlayer>(MaxPlayers);
    public DuelPlayer[] Players { get; private set; }=Array.Empty<DuelPlayer>();
    DuelPlayer[] loggedRoster;
    public void RegisterPlayer(DuelPlayer player) {
      if(registeredPlayers.Contains(player))return;
      registeredPlayers.Add(player);registeredPlayers.Sort((a,b)=>a.Seat.CompareTo(b.Seat));Players=registeredPlayers.ToArray();
    }
    public void UnregisterPlayer(DuelPlayer player) {
      if(registeredPlayers.Remove(player))Players=registeredPlayers.ToArray();
      if(Local==player)Local=null;
      if(aimTarget==player)aimTarget=null;if(lastHitTarget==player)lastHitTarget=null;
    }
    public Vector2 Look;
    public string Room = "classroom-01";
    public string Region = "asia";
    public string Message = "";
    public Camera LobbyCamera;
    bool busy, started, paused, showCredits, showSettings, hadControls;
    Font classroomFont;
    Texture2D settingsIcon;
    int expectedPlayers=MaxPlayers, expectedHumans=1;
    int weapon=-1,smokeWeapon=Weapons.Pistol;
    int firePress,lastFirePressFrame=-1;
    bool GameplayInputAllowed=>started&&!paused&&!showSettings&&!showCredits&&Match&&Match.Object&&Match.Object.IsValid&&Match.Phase==2&&Local&&Local.IsReady;
    public bool ControlsActive=>GameplayInputAllowed&&Local.Health>0&&DuelWebInput.HasControl;
    void ResumeControls(){paused=false;DuelWebInput.SetActive(GameplayInputAllowed);DuelWebInput.Resume();}
    public void PauseControls(){if(!started)return;paused=true;DuelWebInput.SetActive(false);DuelWebInput.Release();}
    public bool IsAiming=>ControlsActive&&Mouse.current!=null&&Mouse.current.rightButton.isPressed;
    public void ClearWeaponRequest(){weapon=-1;}
    public void ResetLifeInput(){pending=default;weapon=-1;firePress=0;lastFirePressFrame=-1;}
    public bool AudioEnabled { get; private set; }
    public void SetAudioEnabled(bool enabled){AudioEnabled=enabled;AudioListener.pause=!enabled;AudioListener.volume=enabled?.65f:0f;}
    NetworkButtons pending;
    float sensitivity = .12f;
    int lastHits;
    float hitUntil;
    GUIStyle title, text, large, button, small;
    bool smoke, captured, smokeKeepAlive, smokeReported;
    string capturePath, lastRoster;
    float smokeStarted, smokeReadyAt=-1, smokeSeconds=20;
    void Awake() {
      Instance=this;Application.runInBackground=true;Application.targetFrameRate=60;SetAudioEnabled(false);
#if UNITY_WEBGL && !UNITY_EDITOR
      WebGLInput.captureAllKeyboardInput=false;
      WebGLInput.stickyCursorLock=false;
#endif
      Room=PlayerPrefs.GetString("Rivals.Classroom.Room","classroom-01");
      Region=PlayerPrefs.GetString("Rivals.Classroom.Region","asia");
      PlayerName=DuelNames.RandomName();Room=PlayerName+"的房間";
    }
    async void Start() {
      var args = Environment.GetCommandLineArgs();
      smoke = args.Contains("-duelSmoke");
      if(int.TryParse(Arg(args,"-expectedPlayers","8"),out int count))expectedPlayers=Mathf.Clamp(count,2,MaxPlayers);
      if(int.TryParse(Arg(args,"-expectedHumans","1"),out int humans))expectedHumans=Mathf.Clamp(humans,1,MaxPlayers);
      smokeKeepAlive=args.Contains("-keepAlive");
      if(float.TryParse(Arg(args,"-smokeSeconds","20"),out float seconds))smokeSeconds=Mathf.Clamp(seconds,3,60);
      capturePath=Arg(args,"-capture","");
      if(int.TryParse(Arg(args,"-testWeapon","1"),out int selected)&&Weapons.IsFirearm(selected))smokeWeapon=selected;
#if UNITY_EDITOR
      if(args.Contains("-battleSmoke")){smoke=true;smokeKeepAlive=true;gameObject.AddComponent<DuelBattleSmoke>();}
#endif
#if UNITY_EDITOR || DEVELOPMENT_BUILD
      if(args.Contains("-combatSmoke"))gameObject.AddComponent<DuelCombatSmoke>();
      if(args.Contains("-networkSmoke"))gameObject.AddComponent<DuelNetworkSmoke>();
#endif
      if (smoke) {
        Room = Arg(args, "-room", "rivals-smoke"); smokeStarted = Time.realtimeSinceStartup;
        await Connect(args.Contains("-auto") ? GameMode.AutoHostOrClient : args.Contains("-host") ? GameMode.Host : args.Contains("-client") ? GameMode.Client : GameMode.Single);
      } else {
        await OpenLobby();
      }
    }
    static string Arg(string[] args,string key,string fallback) { int i=Array.IndexOf(args,key);return i>=0&&i+1<args.Length?args[i+1]:fallback; }
    public void SetLobbyCamera(bool active) { if (LobbyCamera) LobbyCamera.gameObject.SetActive(active); }
    void EnsureRoster(NetworkRunner runner) {
      if(runner!=Runner||!runner.IsServer)return;
      if(!Match || !Match.Object || !Match.Object.IsValid) {
        Match=runner.Spawn(Resources.Load<GameObject>("RivalsMatch").GetComponent<NetworkObject>()).GetComponent<DuelMatch>();
        Debug.Log($"RIVALS_MATCH_SPAWN valid={Match.Object && Match.Object.IsValid}");
      }
      foreach(var player in runner.ActivePlayers)SpawnPlayer(player);
      FillBotSeats(runner);
    }
    void SpawnPlayer(PlayerRef player) {
      if(Runner.TryGetPlayerObject(player,out var existing)&&existing&&existing.IsValid) return;
      var players=Match.Players;
      // Bots occupy character seats, never Photon player slots. Balance humans as friends arrive.
      int preferredTeam=players.Count(p=>!p.IsBot&&p.Team==0)<=players.Count(p=>!p.IsBot&&p.Team==1)?0:1;
      int seat=Enumerable.Range(0,MaxPlayers)
        .Where(n=>!players.Any(p=>p.Seat==n&&!p.IsBot))
        .OrderBy(n=>n%2==preferredTeam?0:1).ThenBy(n=>players.Any(p=>p.Seat==n&&p.IsBot&&p.Health>0)?0:1).ThenBy(n=>n).DefaultIfEmpty(-1).First();
      if(seat<0)return;
      var bot=players.FirstOrDefault(p=>p.Seat==seat&&p.IsBot);
      var snapshot=bot&&Match.Phase==2?new SeatSnapshot(bot):null;
      if(bot){bot.PrepareDespawn();Runner.Despawn(bot.Object);}
      var obj=Runner.Spawn(Resources.Load<GameObject>("RivalsPlayer").GetComponent<NetworkObject>(),DuelPlayer.SpawnPosition(seat),Quaternion.identity,player,
        (r,o)=>{var p=o.GetComponent<DuelPlayer>();p.Seat=seat;p.IsBot=false;p.Nickname=NameFor(player);});
      if(snapshot!=null)snapshot.Apply(obj.GetComponent<DuelPlayer>());
      Runner.SetPlayerObject(player,obj);
    }
    void FillBotSeats(NetworkRunner runner) {
      if(!runner.IsServer||!Match||!Match.Object||!Match.Object.IsValid)return;
      var occupied=new HashSet<int>(Match.Players.Select(p=>p.Seat));
      for(int seat=0;seat<MaxPlayers;seat++)if(!occupied.Contains(seat))SpawnBot(runner,seat);
    }
    void SpawnBot(NetworkRunner runner,int seat,SeatSnapshot snapshot=null) {
      string name=DuelNames.RandomName();for(int tries=0;tries<100&&Players.Any(p=>p.DisplayName==name);tries++)name=DuelNames.RandomName();
      var obj=runner.Spawn(Resources.Load<GameObject>("RivalsPlayer").GetComponent<NetworkObject>(),DuelPlayer.SpawnPosition(seat),Quaternion.identity,PlayerRef.None,
        (r,o)=>{var p=o.GetComponent<DuelPlayer>();p.Seat=seat;p.IsBot=true;p.Nickname=name;});
      if(snapshot!=null)snapshot.Apply(obj.GetComponent<DuelPlayer>());
    }
    void Update() {
      TickLobby();
      CheckHostConnection();
      UpdateCombatHud();
      ReportDiagnostics();
      var roster=Match&&Match.Object&&Match.Object.IsValid?Match.Players:Array.Empty<DuelPlayer>();
      if(roster.Length>0&&roster!=loggedRoster) {
        loggedRoster=roster;
        string signature=string.Join(",",roster.Select(p=>$"{p.Seat}:{(p.IsBot?"B":"H")}"));
        if(signature!=lastRoster) {
          lastRoster=signature;
          Debug.Log($"RIVALS_ROSTER players={roster.Length} humans={roster.Count(p=>!p.IsBot)} bots={roster.Count(p=>p.IsBot)} bluePlayers={roster.Count(p=>p.Team==0)} redPlayers={roster.Count(p=>p.Team==1)} uniqueSeats={roster.Select(p=>p.Seat).Distinct().Count()} seats={signature} phase={Match.Phase} game={Match.Game} score={Match.Blue}:{Match.Red}");
        }
      }
      bool smokeRosterReady=smoke&&Local&&roster.Length==expectedPlayers&&roster.Count(p=>!p.IsBot)>=expectedHumans;
      if(smoke&&!smokeReported) {
        if(!smokeRosterReady)smokeReadyAt=-1;
        else if(smokeReadyAt<0)smokeReadyAt=Time.realtimeSinceStartup;
      }
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
      if(smoke && !smokeReported && smokeRosterReady && smokeReadyAt>=0 && Time.realtimeSinceStartup-smokeReadyAt>smokeSeconds) {
        Debug.Log($"RIVALS_SMOKE_OK players={roster.Length} bluePlayers={roster.Count(p=>p.Team==0)} redPlayers={roster.Count(p=>p.Team==1)} humans={roster.Count(p=>!p.IsBot)} bots={roster.Count(p=>p.IsBot)} phase={Match.Phase} local={Local != null} shots={Local?.Shots} hits={Local?.Hits} score={Match.Blue}:{Match.Red}");
        smokeReported=true;
        if(!smokeKeepAlive){smoke=false;Invoke(nameof(FinishSmoke),10);}
      } else if(smoke && !smokeReported && Time.realtimeSinceStartup-smokeStarted>120) {Debug.LogError("RIVALS_SMOKE_TIMEOUT "+Message+$" match={Match != null} players={roster.Length} local={Local != null}");Application.Quit(2);smoke=false;}
      var k=Keyboard.current;var m=Mouse.current;
      if(k==null||m==null) return;
      if(k.f8Key.wasPressedThisFrame)ToggleSettings();
      if(k.escapeKey.wasPressedThisFrame&&started)PauseControls();
      // Eligibility must not depend on focus: otherwise the gesture that regains
      // focus can arrive while the browser bridge is still disabled.
      DuelWebInput.SetActive(GameplayInputAllowed);
      bool controls=ControlsActive;
      if(!controls)pending=default;
#if UNITY_WEBGL && !UNITY_EDITOR
      // Key-up can be delivered to browser chrome instead of the game after blur.
      if(hadControls&&!controls){InputSystem.ResetDevice(k);InputSystem.ResetDevice(m);}
#endif
      hadControls=controls;
      var delta=DuelWebInput.ReadDelta();
      if(Local && Local.Health>0 && ControlsActive) {
        Look=DuelWebInput.Rotate(Look,delta,sensitivity);
        if(k.spaceKey.wasPressedThisFrame) pending.Set(Action.Jump,true);
        if(k.rKey.wasPressedThisFrame) pending.Set(Action.Reload,true);
        if(k.cKey.wasPressedThisFrame) pending.Set(Action.Slide,true);
      }

    }
    void FinishSmoke(){Application.Quit(0);}
    void ToggleSettings() {
      showSettings=!showSettings;showCredits=false;
      if(started){paused=true;DuelWebInput.Release();}
    }
    void OnDestroy(){DuelWebInput.SetActive(false);if(Instance==this)Instance=null;if(settingsIcon)Destroy(settingsIcon);}
    public void OnInput(NetworkRunner runner, NetworkInput input) {
      if(Local)Local.SyncSpawnView();
      var d=new DuelInput{Look=Look,Weapon=weapon,Buttons=pending};pending=default;weapon=-1;
      var k=Keyboard.current;var m=Mouse.current;
      if(k!=null && m!=null && ControlsActive) {
        if(m.leftButton.wasPressedThisFrame&&lastFirePressFrame!=Time.frameCount){firePress++;lastFirePressFrame=Time.frameCount;}
        d.Move=new Vector2((k.dKey.isPressed?1:0)-(k.aKey.isPressed?1:0),(k.wKey.isPressed?1:0)-(k.sKey.isPressed?1:0));
        d.Buttons.Set(Action.Fire,m.leftButton.isPressed||m.leftButton.wasPressedThisFrame);d.Buttons.Set(Action.Aim,m.rightButton.isPressed);d.Buttons.Set(Action.Sprint,k.leftShiftKey.isPressed);
      }
      d.FirePress=firePress;
      if(smoke && Local && Match && Match.Object && Match.Object.IsValid && Match.Phase==2) {
        d.Weapon=Local.HasWeapon(smokeWeapon)?smokeWeapon:-1;
        var enemy=Match.Players.FirstOrDefault(p=>p.Team!=Local.Team&&p.Health>0);
        if(enemy) {
          var delta=enemy.transform.position-Local.transform.position;
          var angle=Quaternion.LookRotation(delta.normalized).eulerAngles;
          Look=d.Look=new Vector2(angle.y,angle.x>180?angle.x-360:angle.x);
          var travel=Quaternion.Euler(0,-angle.y,0)*new Vector3(Mathf.Clamp(10-Local.transform.position.x,-1,1),0,0);
          d.Move=new Vector2(travel.x,travel.z);d.Buttons.Set(Action.Fire,true);
        }
      }
#if UNITY_EDITOR || DEVELOPMENT_BUILD
      if(DuelCombatSmoke.Running)d=new DuelInput{Look=Look,Weapon=DuelCombatSmoke.RequestedWeapon};
      if(DuelNetworkSmoke.Running)d=DuelNetworkSmoke.Input(this);
#endif
#if UNITY_EDITOR
      if(DuelBattleSmoke.Running)d=DuelBattleSmoke.Input(this);
#endif
      d.SpawnSequence=Local&&Local.IsReady?Local.SpawnSequence:0;
#if UNITY_EDITOR
      if(DuelBattleSmoke.Running&&DuelBattleSmoke.InputSpawnSequence.HasValue)d.SpawnSequence=DuelBattleSmoke.InputSpawnSequence.Value;
#endif
      input.Set(d);
      if(Local&&d.Buttons.IsSet(Action.Fire))Local.RecordFireInput();
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
      var rect=new Rect(1224,16,34,34);
      HudCard(rect);if(GUI.Button(rect,new GUIContent("","設定"),GUIStyle.none))ToggleSettings();
      GUI.DrawTexture(new Rect(rect.x+8,rect.y+8,18,18),settingsIcon);
      if(GUI.tooltip=="設定")GUI.Label(new Rect(1130,82,126,30),"設定",small);
    }
    void Panel(Rect r) {var old=GUI.color;GUI.color=new Color(.012f,.019f,.032f,.94f);GUI.DrawTexture(r,Texture2D.whiteTexture);GUI.color=old;}
    void Fill(Rect r,Color color) {var old=GUI.color;GUI.color=old*color;GUI.DrawTexture(r,Texture2D.whiteTexture);GUI.color=old;}
    void DrawCrosshair() {
      // Draw in square screen pixels even when the rest of the HUD is stretched.
      var previous=GUI.matrix;
      float scale=Mathf.Clamp(Screen.height/720f,.75f,2f);
      GUI.matrix=Matrix4x4.TRS(new Vector3(Screen.width*.5f,Screen.height*.5f,0),Quaternion.identity,new Vector3(scale,scale,1));
      float gap=5;
      if(Local&&Local.ViewCamera)gap+=Mathf.Tan(Local.SpreadAngle*Mathf.Deg2Rad)*360/Mathf.Tan(Local.ViewCamera.fieldOfView*.5f*Mathf.Deg2Rad);
      CrosshairStroke(new Rect(-1,-gap-7,2,7));CrosshairStroke(new Rect(-1,gap,2,7));
      CrosshairStroke(new Rect(-gap-7,-1,7,2));CrosshairStroke(new Rect(gap,-1,7,2));
      CrosshairStroke(new Rect(-1,-1,2,2));
      GUI.matrix=previous;
    }
    void CrosshairStroke(Rect rect) {
      Fill(new Rect(rect.x-1,rect.y-1,rect.width+2,rect.height+2),new Color(.025f,.035f,.05f));
      Fill(rect,Color.white);
    }
    bool ColorButton(Rect r,string label,Color color) {
      var old=GUI.backgroundColor;GUI.backgroundColor=color;bool clicked=GUI.Button(r,label,button);GUI.backgroundColor=old;return clicked;
    }
    void DrawSettings() {
      HudCard(new Rect(425,151,430,418),TeamColor(0));HudText(new Rect(453,174,374,42),"遊戲設定",27,null,TextAnchor.MiddleLeft,true);
      HudText(new Rect(453,231,374,22),"房間名稱",12,HudMuted,TextAnchor.MiddleLeft);
      HudText(new Rect(453,257,374,28),Runner&&Runner.IsRunning?ListingTitle(Runner.SessionInfo):RoomTitle(PlayerName),18,null,TextAnchor.MiddleLeft);
      HudText(new Rect(453,288,374,20),"名稱跟隨房主，無法單獨修改",12,HudMuted,TextAnchor.MiddleLeft);
      if(HudButton(new Rect(453,329,374,40),AudioEnabled?"聲音：開":"聲音：關"))SetAudioEnabled(!AudioEnabled);
      if(HudButton(new Rect(453,382,374,40),"素材與授權"))showCredits=true;
      if(HudButton(new Rect(453,435,374,44),"返回",true))showSettings=false;
      HudText(new Rect(453,513,374,21),"4 對 4 · 空位由電腦自動補齊",12,HudMuted);
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
      if(!started){DrawLobby();return;}
      if(!Match||!Match.Object||!Match.Object.IsValid){GUI.Label(new Rect(400,310,480,90),"馬上就好！",large);return;}
      DrawBattleHud();
      if(paused)DrawPauseMenu();
    }
    public void OnPlayerJoined(NetworkRunner r,PlayerRef p){Debug.Log($"RIVALS_JOINED {p} started={started} server={r.IsServer} match={Match != null}");EnsureRoster(r);}
    public void OnPlayerLeft(NetworkRunner r,PlayerRef p){
      if(r!=Runner)return;
      if(r.IsServer&&Match&&Match.Object&&Match.Object.IsValid) {
        var leaving=Match.Players.FirstOrDefault(player=>!player.IsBot&&player.Object.InputAuthority==p);
        if(leaving){int seat=leaving.Seat;var snapshot=Match.Phase==2?new SeatSnapshot(leaving):null;leaving.PrepareDespawn();r.Despawn(leaving.Object);SpawnBot(r,seat,snapshot);}
        FillBotSeats(r);
      }
      Message="";
    }
    public void OnConnectRequest(NetworkRunner r,NetworkRunnerCallbackArgs.ConnectRequest request,byte[] token){if(r.ActivePlayers.Count()<MaxPlayers)request.Accept();else request.Refuse();}
    public void OnConnectedToServer(NetworkRunner r){}
    public void OnInputMissing(NetworkRunner r,PlayerRef p,NetworkInput i){}
    public void OnSceneLoadDone(NetworkRunner r){}
    public void OnSceneLoadStart(NetworkRunner r){}
    public void OnObjectExitAOI(NetworkRunner r,NetworkObject o,PlayerRef p){}
    public void OnObjectEnterAOI(NetworkRunner r,NetworkObject o,PlayerRef p){}
    public void OnSessionListUpdated(NetworkRunner r,List<SessionInfo> list){if(r!=lobbyRunner)return;rooms.Clear();rooms.AddRange(list.Where(s=>s.IsVisible).OrderBy(s=>s.Name));nextLobbyReport=0;}
    public void OnCustomAuthenticationResponse(NetworkRunner r,Dictionary<string,object> data){}
    public void OnHostMigration(NetworkRunner r,HostMigrationToken token){}
    public void OnReliableDataReceived(NetworkRunner r,PlayerRef p,ReliableKey key,ReadOnlySpan<byte> data){}
    public void OnReliableDataProgress(NetworkRunner r,PlayerRef p,ReliableKey key,float progress){}
  }
}
