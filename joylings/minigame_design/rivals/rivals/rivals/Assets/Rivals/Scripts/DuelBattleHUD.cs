using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace RivalsPrototype {
  public partial class DuelSession {
    static Color TeamColor(int team)=>team==0?new Color(.38f,.77f,1):new Color(1,.43f,.43f);
    // Opaque royal blue / crimson remain distinct over green ground and damage FX.
    static Color TeamInk(int team)=>team==0?new Color(.025f,.075f,.62f,1):new Color(.55f,.025f,.04f,1);
    static readonly Color HudMuted=new Color(.63f,.72f,.81f);
    static readonly Color HudGold=new Color(1,.84f,.43f);
    static string TeamName(int team)=>team==0?"藍隊":"紅隊";
    public const float NameRange=14;
    readonly Dictionary<int,GUIStyle> hudStyles=new Dictionary<int,GUIStyle>();
    GUIStyle HudStyle(int size,TextAnchor anchor=TextAnchor.MiddleCenter,bool bold=false){
      int key=size*100+(int)anchor*2+(bold?1:0);
      if(!hudStyles.TryGetValue(key,out var style)){
        style=new GUIStyle(GUI.skin.label){font=classroomFont,fontSize=size,fontStyle=bold?FontStyle.Bold:FontStyle.Normal,
          alignment=anchor,wordWrap=false,clipping=TextClipping.Clip,padding=new RectOffset(0,0,0,0)};
        style.normal.textColor=Color.white;hudStyles.Add(key,style);
      }
      return style;
    }
    void HudText(Rect rect,string label,int size=14,Color? color=null,TextAnchor anchor=TextAnchor.MiddleCenter,bool bold=false){
      var previous=GUI.color;GUI.color=previous*(color??Color.white);GUI.Label(rect,label,HudStyle(size,anchor,bold));GUI.color=previous;
    }
    string FitHudName(string name,float width,int size=12){
      var style=HudStyle(size);if(style.CalcSize(new GUIContent(name)).x<=width)return name;
      while(name.Length>1&&style.CalcSize(new GUIContent(name+"…")).x>width)name=name.Substring(0,name.Length-1);
      return name+"…";
    }
    void HudCard(Rect rect,Color? accent=null){
      Fill(new Rect(rect.x+2,rect.y+3,rect.width,rect.height),new Color(.01f,.02f,.035f,.22f));
      Fill(rect,new Color(.055f,.085f,.12f,.87f));
      Fill(new Rect(rect.x,rect.y,rect.width,1),new Color(.72f,.83f,.94f,.20f));
      if(accent.HasValue)Fill(new Rect(rect.x,rect.y,3,rect.height),accent.Value);
    }
    bool HudButton(Rect rect,string label,bool primary=false){
      bool hover=rect.Contains(Event.current.mousePosition);
      Fill(new Rect(rect.x,rect.y+3,rect.width,rect.height),new Color(.01f,.02f,.04f,.5f));
      Fill(rect,primary?(hover?new Color(.66f,.87f,1):TeamColor(0)):(hover?new Color(.19f,.27f,.35f):new Color(.13f,.19f,.26f)));
      Fill(new Rect(rect.x,rect.y,rect.width,1),new Color(1,1,1,.2f));
      HudText(rect,label,16,primary?new Color(.04f,.1f,.17f):Color.white,bold:true);
      return GUI.Button(rect,GUIContent.none,GUIStyle.none);
    }
    void DrawBattleHud() {
      if(Match.Phase==4){DrawVictory();return;}
      if(!paused){DrawCombatHud();DrawNameTags();DrawKillFeed();}
      DrawTeamRoster(0);DrawTeamRoster(1);
      HudCard(new Rect(574,16,132,62));
      HudText(new Rect(579,21,122,18),$"第 {Match.Game} 場 · 團隊擊殺",11,HudMuted);
      int remaining=Mathf.CeilToInt(Match.Timer.RemainingTime(Runner)??0);
      HudText(new Rect(582,41,116,29),$"先達 {DuelMatch.KillsToWin} 擊殺",16,HudGold,bold:true);
      if(Local){
        HudCard(new Rect(22,640,174,58),TeamColor(Local.Team));
        Fill(new Rect(37,658,16,5),new Color(.7f,.93f,.77f));Fill(new Rect(42.5f,652.5f,5,16),new Color(.7f,.93f,.77f));
        HudText(new Rect(64,644,63,32),Local.Health.ToString(),28,Local.Health<=DuelPlayer.MaxHealth*.3f?TeamColor(1):Color.white,TextAnchor.MiddleLeft,true);
        HudText(new Rect(127,649,54,23),"/ "+DuelPlayer.MaxHealth,11,HudMuted);
        Fill(new Rect(37,685,143,4),new Color(.24f,.29f,.32f));Fill(new Rect(37,685,143*Mathf.Clamp01((float)Local.Health/DuelPlayer.MaxHealth),4),Local.Health<=DuelPlayer.MaxHealth*.3f?TeamColor(1):new Color(.5f,.87f,.62f));
        DrawCurrentWeapon();
        if(!paused&&Local.Health>0&&(Match.Phase==1||Match.Phase==2))DrawCrosshair();
      }
      if(paused)return;
      if(Match.Phase==1&&Local){
        HudCard(new Rect(454,206,372,120),TeamColor(Local.Team));
        HudText(new Rect(474,219,250,20),"新對戰 · 全員就位",12,HudMuted,TextAnchor.MiddleLeft);
        HudText(new Rect(474,247,250,35),"你是"+TeamName(Local.Team),26,TeamColor(Local.Team),TextAnchor.MiddleLeft,true);
        HudText(new Rect(474,288,310,21),$"率先累積 {DuelMatch.KillsToWin} 擊殺，贏得勝利",14,null,TextAnchor.MiddleLeft);
        HudText(new Rect(740,227,64,58),remaining.ToString(),44,HudGold,bold:true);
      }else if(Local&&Local.Health<=0&&Match.Phase==2){
        int respawn=Mathf.CeilToInt(Local.RespawnSecondsRemaining);
        HudCard(new Rect(489,521,302,86),TeamColor(Local.Team));
        HudText(new Rect(504,531,272,31),respawn>0?$"{respawn} 秒後復活":"正在準備復活",23,HudGold,bold:true);
        HudText(new Rect(504,572,272,20),"隨機位置 · 滿血與手槍",13,HudMuted);
      }
#if !UNITY_WEBGL || UNITY_EDITOR
      if(!smoke&&Local&&Match.Phase==2&&!DuelWebInput.HasControl)
        if(HudButton(new Rect(550,463,180,36),"點一下，開始玩",true))ResumeControls();
#endif
    }
    void DrawTeamRoster(int team) {
      float x=team==0?342:718;var color=TeamColor(team);
      HudCard(new Rect(x,16,220,62),color);
      int alive=0;foreach(var p in Players)if(p.Team==team&&p.Health>0)alive++;
      HudText(new Rect(x+13,21,70,18),$"{TeamName(team)}  {alive}/4",12,color,TextAnchor.MiddleLeft,true);
      int kills=team==0?Match.Blue:Match.Red;
      HudText(new Rect(x+117,19,90,22),$"{kills} / {DuelMatch.KillsToWin}",17,color,TextAnchor.MiddleRight,true);
      Fill(new Rect(x+12,75,196,2),new Color(.3f,.35f,.4f));
      Fill(new Rect(x+12,75,196*Mathf.Clamp01((float)kills/DuelMatch.KillsToWin),2),color);
      foreach(var p in Players){
        if(p.Team!=team)continue;
        bool living=p.Health>0;float left=x+40+(p.Seat/2)*42;
        if(p==Local)Fill(new Rect(left-3,42,31,30),new Color(1,.87f,.5f,.85f));
        Fill(new Rect(left-1,44,27,26),new Color(.045f,.06f,.08f));
        var skin=living?DuelAvatar.Skin(p.Seat):new Color(.25f,.28f,.3f);
        Fill(new Rect(left+2,48,21,20),skin);Fill(new Rect(left,44,25,6),living?color:new Color(.23f,.25f,.28f));
        var ink=living?new Color(.08f,.1f,.13f):new Color(.17f,.19f,.22f);
        Fill(new Rect(left+6,54,3,3),ink);Fill(new Rect(left+16,54,3,3),ink);Fill(new Rect(left+9,62,7,2),ink);
      }
    }
    void DrawCurrentWeapon() {
      HudCard(new Rect(1040,634,218,64));var icons=DuelArt.Get?DuelArt.Get.WeaponIcons:null;
      if(icons!=null&&Local.Weapon<icons.Length&&icons[Local.Weapon])GUI.DrawTexture(new Rect(1049,648,78,34),icons[Local.Weapon],ScaleMode.ScaleToFit,true);
      HudText(new Rect(1135,640,106,20),Weapons.Names[Local.Weapon],12,HudMuted,TextAnchor.MiddleRight);
      HudText(new Rect(1128,660,115,29),Local.ReloadTimer.IsRunning?"裝填中":$"{Local.Ammo} / {Weapons.Magazines[Local.Weapon]}",Local.ReloadTimer.IsRunning?16:24,null,TextAnchor.MiddleRight,true);
      float progress=Local.ReloadTimer.IsRunning?1-(Local.ReloadTimer.RemainingTime(Runner)??0)/Weapons.Reload[Local.Weapon]:1;
      Fill(new Rect(1052,693,194*Mathf.Clamp01(progress),3),Weapons.Color(Local.Weapon));
      if(!paused&&Local.Health>0&&Match.Phase==2&&Local.ReloadTimer.IsRunning) {
        HudCard(new Rect(557,429,166,39));
        HudText(new Rect(563,432,154,23),Weapons.ReloadStage(Local.Weapon,Local.ReloadProgress)+$"  {Local.ReloadTimer.RemainingTime(Runner)??0:0.0}s",12);
        Fill(new Rect(566,460,148,3),new Color(.2f,.25f,.3f));
        Fill(new Rect(566,460,148*Local.ReloadProgress,3),Weapons.Color(Local.Weapon));
      }
    }
    public bool ShouldShowName(DuelPlayer player) {
      if(!Local||!Local.ViewCamera||Local.Health<=0||Match.Phase!=2||!player||!player.IsReady||player==Local||player.Health<=0)return false;
      return (player.transform.position-Local.ViewCamera.transform.position).sqrMagnitude<NameRange*NameRange&&nameVisible[player.Seat];
    }
    void DrawNameTags() {
      if(!Local||!Local.ViewCamera)return;
      foreach(var p in Players){
        if(!ShouldShowName(p))continue;
        var point=p.transform.position+Vector3.up*2.1f;var screen=Local.ViewCamera.WorldToViewportPoint(point);
        if(screen.z<=0||screen.x<.04f||screen.x>.96f||screen.y<.14f||screen.y>.90f)continue;
        float distance=Vector3.Distance(p.transform.position,Local.ViewCamera.transform.position);
        var old=GUI.color;GUI.color=new Color(1,1,1,Mathf.Clamp01((NameRange-distance)/3));
        string label=FitHudName(p.DisplayName,90,12);float width=HudStyle(12).CalcSize(new GUIContent(label)).x+16;
        var box=new Rect(screen.x*1280-width/2,(1-screen.y)*720-10,width,19);
        Fill(box,new Color(.04f,.07f,.10f,.76f));Fill(new Rect(box.x,box.y,2,19),TeamColor(p.Team));
        HudText(box,label,12);GUI.color=old;
      }
    }
    void FeedName(Rect rect,string name,int team){
      Fill(rect,TeamInk(team));Fill(new Rect(rect.x,rect.y,2,rect.height),TeamColor(team));
      HudText(new Rect(rect.x+6,rect.y,rect.width-12,rect.height),FitHudName(name,rect.width-12),12);
    }
    void DrawKillFeed(){
      int shown=0;
      for(int sequence=Match.EliminationSequence;sequence>Mathf.Max(0,Match.EliminationSequence-DuelMatch.FeedCapacity)&&shown<4;sequence--){
        var e=Match.Eliminations[(sequence-1)%DuelMatch.FeedCapacity];
        if(e.Sequence!=sequence||e.Game!=Match.Game||e.Lifetime.ExpiredOrNotRunning(Runner))continue;
        float life=e.Lifetime.RemainingTime(Runner)??0;var old=GUI.color;GUI.color=new Color(1,1,1,Mathf.Clamp01(life));
        float y=99+shown++*31;const float x=954;
        Fill(new Rect(x,y,304,26),new Color(.045f,.065f,.09f,.86f));
        FeedName(new Rect(x+2,y+2,110,22),e.Killer.ToString(),e.KillerTeam);
        var icons=DuelArt.Get?DuelArt.Get.WeaponIcons:null;
        if(icons!=null&&e.Weapon<icons.Length&&icons[e.Weapon])GUI.DrawTexture(new Rect(x+120,y+5,25,16),icons[e.Weapon],ScaleMode.ScaleToFit,true);
        HudText(new Rect(x+147,y,42,26),"擊倒",11,HudMuted);
        FeedName(new Rect(x+192,y+2,110,22),e.Victim.ToString(),e.VictimTeam);GUI.color=old;
      }
    }
    void DrawVictory() {
      var podium=Match.GetComponent<DuelPodium>();var color=TeamColor(Match.Winner);
      HudCard(new Rect(442,25,396,98),color);
      HudText(new Rect(460,35,360,20),$"第 {Match.Game} 場 · {Match.Blue} : {Match.Red} 擊殺",12,HudMuted);
      HudText(new Rect(460,61,360,49),TeamName(Match.Winner)+"獲勝！",36,color,bold:true);
      if(podium&&podium.Camera)for(int i=0;i<4;i++){
        if(!podium.Winners[i])continue;
        var p=podium.Camera.WorldToViewportPoint(podium.Winners[i].position+Vector3.up*2.55f);
        FeedName(new Rect(p.x*1280-65,(1-p.y)*720-12,130,24),Match.Winners[i].Name.ToString(),Match.Winner);
      }
      HudCard(new Rect(427,630,426,46));
      HudText(new Rect(443,637,394,30),$"{Mathf.CeilToInt(Match.Timer.RemainingTime(Runner)??0)} 秒後重新分隊 · 開始下一場",14);
    }
    void DrawPauseMenu(){
      Fill(new Rect(0,0,1280,720),new Color(.025f,.04f,.07f,.48f));HudCard(new Rect(445,174,390,362),TeamColor(0));
      HudText(new Rect(473,194,334,40),"休息一下",28,null,TextAnchor.MiddleLeft,true);
      HudText(new Rect(473,245,334,24),"WASD 移動  /  左鍵射擊  /  右鍵瞄準",13,HudMuted,TextAnchor.MiddleLeft);
      HudText(new Rect(473,273,334,24),"Space 跳躍  /  R 裝填  /  四角撿槍",13,HudMuted,TextAnchor.MiddleLeft);
      if(HudButton(new Rect(473,317,334,44),"繼續玩",true))ResumeControls();
      if(HudButton(new Rect(473,373,334,40),AudioEnabled?"聲音：開":"聲音：關"))SetAudioEnabled(!AudioEnabled);
      if(HudButton(new Rect(473,425,334,40),"回到大廳"))Leave();
      HudText(new Rect(473,485,334,24),"房間內的對戰會繼續進行",12,HudMuted);
    }
  }
}
