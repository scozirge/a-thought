using System.Collections.Generic;
using UnityEngine;

namespace RivalsPrototype {
  public partial class DuelSession {
    static Color TeamColor(int team)=>team==0?new Color(.30f,.75f,1):new Color(1,.43f,.37f);
    static Color TeamInk(int team)=>team==0?new Color(.06f,.24f,.38f,1):new Color(.40f,.13f,.13f,1);
    static readonly Color HudMuted=new Color(.72f,.80f,.85f),HudGold=new Color(1,.81f,.43f);
    static string TeamName(int team)=>team==0?"藍隊":"紅隊";
    public const float NameRange=14;
    readonly Dictionary<int,GUIStyle> hudStyles=new Dictionary<int,GUIStyle>();
    float hudWidth=1280,hudHeight=720,hudLeft=18,hudRight=18,hudTop=12,hudBottom=12;
    bool HudCompact=>hudHeight<500||DuelWebInput.TouchMode;
    bool HudShort=>hudHeight<330;
    Vector2 HudCenter=>new Vector2(hudWidth*.5f,hudHeight*.5f);
    Rect scoreBounds,healthBounds,ammoBounds;
    // Uniform CSS-sized units keep text legible across DPR and phone aspect ratios.
    void ConfigureBattleHud(){
      float width=Mathf.Max(1,DuelWebInput.HudMetric(0)),height=Mathf.Max(1,DuelWebInput.HudMetric(1));
      float uiScale=DuelWebInput.TouchMode?1:Mathf.Clamp(height/800f,1,1.35f);
      float scale=Screen.width/width*uiScale;hudWidth=Screen.width/scale;hudHeight=Screen.height/scale;
      hudLeft=Mathf.Max(12,(DuelWebInput.HudMetric(2)+8)/uiScale);hudRight=Mathf.Max(12,(DuelWebInput.HudMetric(3)+8)/uiScale);
      hudTop=Mathf.Max(10,(DuelWebInput.HudMetric(4)+8)/uiScale);hudBottom=Mathf.Max(8,(DuelWebInput.HudMetric(5)+4)/uiScale);
      GUI.matrix=Matrix4x4.Scale(new Vector3(scale,scale,1));
    }
    GUIStyle HudStyle(int size,TextAnchor anchor=TextAnchor.MiddleCenter,bool bold=false){
      int key=size*100+(int)anchor*2+(bold?1:0);
      if(!hudStyles.TryGetValue(key,out var style)){
        style=new GUIStyle(GUI.skin.label){font=classroomFont,fontSize=size,fontStyle=bold?FontStyle.Bold:FontStyle.Normal,alignment=anchor,wordWrap=false,clipping=TextClipping.Clip,padding=new RectOffset(0,0,0,0)};
        style.normal.textColor=Color.white;hudStyles.Add(key,style);
      }return style;
    }
    void HudText(Rect rect,string label,int size=16,Color? color=null,TextAnchor anchor=TextAnchor.MiddleCenter,bool bold=false){
      var previous=GUI.color;GUI.color=previous*(color??Color.white);GUI.Label(rect,label,HudStyle(size,anchor,bold));GUI.color=previous;
    }
    string FitHudName(string name,float width,int size=14){
      var style=HudStyle(size);if(style.CalcSize(new GUIContent(name)).x<=width)return name;
      while(name.Length>1&&style.CalcSize(new GUIContent(name+"…")).x>width)name=name.Substring(0,name.Length-1);return name+"…";
    }
    void HudRound(Rect rect,Color color,float radius=10)=>GUI.DrawTexture(rect,Texture2D.whiteTexture,ScaleMode.StretchToFill,true,0,QualitySettings.activeColorSpace==ColorSpace.Linear?color.linear:color,0,radius);
    void HudCard(Rect rect,Color? accent=null){
      HudRound(new Rect(rect.x,rect.y+3,rect.width,rect.height),new Color(.015f,.025f,.04f,.22f));HudRound(rect,new Color(.045f,.080f,.115f,.95f));
      var edge=new Color(.68f,.81f,.91f,.23f);GUI.DrawTexture(rect,Texture2D.whiteTexture,ScaleMode.StretchToFill,true,0,QualitySettings.activeColorSpace==ColorSpace.Linear?edge.linear:edge,1,10);
      if(accent.HasValue)HudRound(new Rect(rect.x+10,rect.y+10,3,rect.height-20),accent.Value,1.5f);
    }
    bool HudButton(Rect rect,string label,bool primary=false){
      bool hover=rect.Contains(Event.current.mousePosition)&&GUI.enabled;
      HudRound(new Rect(rect.x,rect.y+3,rect.width,rect.height),new Color(.01f,.02f,.04f,.3f));
      HudRound(rect,primary?(hover?new Color(.60f,.87f,1):TeamColor(0)):(hover?new Color(.21f,.31f,.40f):new Color(.14f,.23f,.31f)));
      HudText(rect,label,17,primary?new Color(.025f,.08f,.13f):Color.white,bold:true);return GUI.Button(rect,GUIContent.none,GUIStyle.none);
    }
    void DrawBattleHud(){
      ConfigureBattleHud();if(Match.Phase==4){DrawVictory();return;}
      if(!paused){DrawCombatHud();DrawNameTags();}DrawScoreboard();if(!paused)DrawKillFeed();
      if(Local){
        float h=HudShort?42:HudCompact?54:72,w=HudCompact?132:176;
        var health=new Rect(hudLeft,hudHeight-hudBottom-h,w,h);healthBounds=health;HudCard(health);
        var green=Local.Health<=DuelPlayer.MaxHealth*.3f?TeamColor(1):new Color(.45f,.90f,.71f);
        Fill(new Rect(health.x+13,health.y+17,14,4),green);Fill(new Rect(health.x+18,health.y+12,4,14),green);
        HudText(new Rect(health.x+35,health.y+3,59,h-13),Local.Health.ToString(),HudShort?25:32,Color.white,TextAnchor.MiddleLeft,true);
        if(!HudCompact)HudText(new Rect(health.x+98,health.y+7,w-110,h-17),"/ 300",14,HudMuted,TextAnchor.MiddleRight);
        HudRound(new Rect(health.x+12,health.yMax-9,w-24,4),new Color(.20f,.29f,.34f),2);
        if(Local.Health>0)HudRound(new Rect(health.x+12,health.yMax-9,(w-24)*Mathf.Clamp01((float)Local.Health/DuelPlayer.MaxHealth),4),green,2);
        DrawCurrentWeapon();if(!paused&&Local.Health>0&&(Match.Phase==1||Match.Phase==2))DrawCrosshair();
      }
      if(paused)return;
      int remaining=Mathf.CeilToInt(Match.Timer.RemainingTime(Runner)??0);
      if(Match.Phase==1&&Local){
        float w=Mathf.Min(340,hudWidth-32);var box=new Rect((hudWidth-w)/2,HudCenter.y-52,w,104);HudCard(box,TeamColor(Local.Team));
        HudText(new Rect(box.x+22,box.y+13,w-96,22),"準備就位",15,HudMuted,TextAnchor.MiddleLeft);
        HudText(new Rect(box.x+22,box.y+40,w-96,35),"你是"+TeamName(Local.Team),27,TeamColor(Local.Team),TextAnchor.MiddleLeft,true);
        HudText(new Rect(box.xMax-77,box.y+17,60,64),remaining.ToString(),46,HudGold,bold:true);
      }else if(Local&&Local.Health<=0&&Match.Phase==2){
        int respawn=Mathf.CeilToInt(Local.RespawnSecondsRemaining);float w=Mathf.Min(284,hudWidth-32);var box=new Rect((hudWidth-w)/2,HudCenter.y-41,w,82);HudCard(box,TeamColor(Local.Team));
        HudText(new Rect(box.x+16,box.y+10,w-32,33),respawn>0?$"{respawn} 秒後復活":"正在準備復活",26,HudGold,bold:true);
        HudText(new Rect(box.x+16,box.y+48,w-32,22),"隨機位置 · 滿血與手槍",15,HudMuted);
      }
#if !UNITY_WEBGL || UNITY_EDITOR
      if(!smoke&&Local&&Match.Phase==2&&!DuelWebInput.HasControl)if(HudButton(new Rect(HudCenter.x-100,HudCenter.y+80,200,44),"點一下，開始玩",true))ResumeControls();
#endif
    }
    void DrawScoreboard(){
      bool narrow=hudWidth<520;float reserve=DuelWebInput.TouchMode&&!narrow?174:0,available=hudWidth-hudLeft-hudRight-reserve;
      float width=Mathf.Min(HudCompact?340:436,available),x=hudLeft+(available-width)/2,y=hudTop+(DuelWebInput.TouchMode&&narrow?52:0),height=HudCompact?60:76;
      scoreBounds=new Rect(x,y,width,height);float centerWidth=HudCompact?66:86,teamWidth=(width-centerWidth-16)/2;
      DrawTeamRoster(0,new Rect(x,y,teamWidth,height));DrawTeamRoster(1,new Rect(x+teamWidth+centerWidth+16,y,teamWidth,height));
      var goal=new Rect(x+teamWidth+8,y,centerWidth,height);HudCard(goal);HudText(new Rect(goal.x,goal.y+5,goal.width,20),"目標",14,HudMuted);
      HudText(new Rect(goal.x,goal.y+23,goal.width,30),DuelMatch.KillsToWin.ToString(),28,HudGold,bold:true);
      if(!HudCompact)HudText(new Rect(goal.x,goal.y+53,goal.width,19),"擊殺獲勝",13,HudMuted);
    }
    void DrawTeamRoster(int team,Rect rect){
      var color=TeamColor(team);HudCard(rect);int kills=team==0?Match.Blue:Match.Red;
      HudText(new Rect(rect.x+13,rect.y+7,42,24),TeamName(team),16,color,TextAnchor.MiddleLeft,true);
      HudText(new Rect(rect.xMax-65,rect.y+3,52,38),kills.ToString(),HudCompact?32:36,Color.white,TextAnchor.MiddleRight,true);
      float barWidth=(rect.width-35)/4;
      foreach(var p in Players){if(p.Team!=team)continue;float left=rect.x+13+(p.Seat/2)*(barWidth+3);
        HudRound(new Rect(left,rect.y+43,barWidth,5),p.Health>0?color:new Color(.22f,.29f,.34f),2);
        if(p==Local)Fill(new Rect(left+barWidth*.5f-2,rect.y+52,4,3),HudGold);
      }
      if(!HudCompact){int alive=0;foreach(var p in Players)if(p.Team==team&&p.Health>0)alive++;HudText(new Rect(rect.x+13,rect.y+53,rect.width-26,18),$"{alive} / 4 就位",13,HudMuted,TextAnchor.MiddleLeft);}
    }
    void DrawCurrentWeapon(){
      float w=HudCompact?148:214,h=HudShort?42:HudCompact?54:72;var box=new Rect(hudWidth-hudRight-w,hudHeight-hudBottom-h,w,h);ammoBounds=box;HudCard(box);var icons=DuelArt.Get?DuelArt.Get.WeaponIcons:null;
      if(!HudCompact&&icons!=null&&Local.Weapon<icons.Length&&icons[Local.Weapon])GUI.DrawTexture(new Rect(box.x+12,box.y+20,62,34),icons[Local.Weapon],ScaleMode.ScaleToFit,true);
      HudText(new Rect(box.x+12,box.y+3,HudCompact?43:w-24,HudCompact?h-9:22),Weapons.Names[Local.Weapon],14,HudMuted,HudCompact?TextAnchor.MiddleLeft:TextAnchor.MiddleRight);
      string ammo=Local.ReloadTimer.IsRunning?"裝填中":$"{Local.Ammo} / {Weapons.Magazines[Local.Weapon]}";
      HudText(new Rect(box.x+52,box.y+(HudCompact?2:27),w-64,HudCompact?h-12:32),ammo,Local.ReloadTimer.IsRunning?18:HudShort?22:25,null,TextAnchor.MiddleRight,true);
      float progress=Local.ReloadTimer.IsRunning?Local.ReloadProgress:(float)Local.Ammo/Weapons.Magazines[Local.Weapon];HudRound(new Rect(box.x+12,box.yMax-8,w-24,3),new Color(.20f,.29f,.34f),1.5f);
      if(progress>0)HudRound(new Rect(box.x+12,box.yMax-8,(w-24)*Mathf.Clamp01(progress),3),Weapons.Color(Local.Weapon),1.5f);
      if(!paused&&Local.Health>0&&Match.Phase==2&&Local.ReloadTimer.IsRunning){var reload=new Rect(HudCenter.x-100,HudCenter.y+46,200,40);HudCard(reload);
        HudText(new Rect(reload.x+8,reload.y+4,184,26),Weapons.ReloadStage(Local.Weapon,Local.ReloadProgress)+$"  {Local.ReloadTimer.RemainingTime(Runner)??0:0.0}s",15);
        Fill(new Rect(reload.x+12,reload.y+33,176*Local.ReloadProgress,3),Weapons.Color(Local.Weapon));}
    }
    public bool ShouldShowName(DuelPlayer player){
      if(!Local||!Local.ViewCamera||Local.Health<=0||Match.Phase!=2||!player||!player.IsReady||player==Local||player.Health<=0)return false;
      return (player.transform.position-Local.ViewCamera.transform.position).sqrMagnitude<NameRange*NameRange&&nameVisible[player.Seat];
    }
    void DrawNameTags(){
      if(!Local||!Local.ViewCamera)return;foreach(var p in Players){if(!ShouldShowName(p)||p==aimTarget)continue;
        var screen=Local.ViewCamera.WorldToViewportPoint(p.transform.position+Vector3.up*2.1f);if(screen.z<=0||screen.x<.04f||screen.x>.96f||screen.y<.14f||screen.y>.90f)continue;
        float distance=Vector3.Distance(p.transform.position,Local.ViewCamera.transform.position);var old=GUI.color;GUI.color=new Color(1,1,1,Mathf.Clamp01((NameRange-distance)/3));
        string label=FitHudName(p.DisplayName,126,15);float width=HudStyle(15).CalcSize(new GUIContent(label)).x+22;var box=new Rect(screen.x*hudWidth-width/2,(1-screen.y)*hudHeight-14,width,28);
        HudRound(box,new Color(.035f,.065f,.095f,.95f),5);Fill(new Rect(box.x+4,box.y+6,3,16),TeamColor(p.Team));HudText(new Rect(box.x+10,box.y,width-14,28),label,15);GUI.color=old;}
    }
    void FeedName(Rect rect,string name,int team){HudRound(rect,TeamInk(team),4);HudText(new Rect(rect.x+5,rect.y,rect.width-10,rect.height),FitHudName(name,rect.width-10,14),14,TeamColor(team),bold:true);}
    void DrawKillFeed(){
      int shown=0,limit=HudShort?1:HudCompact?2:4;float width=HudCompact?260:308,x=HudCompact?scoreBounds.x:hudWidth-hudRight-width,y=HudCompact?scoreBounds.yMax+8:hudTop+88;
      if(hudWidth<520)x=(hudWidth-width)/2;
      for(int sequence=Match.EliminationSequence;sequence>Mathf.Max(0,Match.EliminationSequence-DuelMatch.FeedCapacity)&&shown<limit;sequence--){
        var e=Match.Eliminations[(sequence-1)%DuelMatch.FeedCapacity];if(e.Sequence!=sequence||e.Game!=Match.Game||e.Lifetime.ExpiredOrNotRunning(Runner))continue;
        var old=GUI.color;GUI.color=new Color(1,1,1,Mathf.Clamp01(e.Lifetime.RemainingTime(Runner)??0));float top=y+shown++*34,nameWidth=(width-44)/2;
        HudRound(new Rect(x,top,width,30),new Color(.04f,.07f,.10f,.92f),6);FeedName(new Rect(x+3,top+3,nameWidth,24),e.Killer.ToString(),e.KillerTeam);
        HudText(new Rect(x+nameWidth+3,top,38,30),"擊倒",13,HudMuted);FeedName(new Rect(x+width-nameWidth-3,top+3,nameWidth,24),e.Victim.ToString(),e.VictimTeam);GUI.color=old;}
    }
    void DrawVictory(){
      var podium=Match.GetComponent<DuelPodium>();var color=TeamColor(Match.Winner);float width=Mathf.Min(360,hudWidth-32);var box=new Rect(HudCenter.x-width/2,hudTop+8,width,82);HudCard(box,color);
      HudText(new Rect(box.x+16,box.y+9,width-32,24),$"第 {Match.Game} 場 · {Match.Blue} : {Match.Red} 擊殺",16,HudMuted);HudText(new Rect(box.x+16,box.y+34,width-32,39),TeamName(Match.Winner)+"獲勝！",32,color,bold:true);
      if(podium&&podium.Camera)for(int i=0;i<4;i++){if(!podium.Winners[i])continue;var p=podium.Camera.WorldToViewportPoint(podium.Winners[i].position+Vector3.up*2.55f);float nameWidth=Mathf.Min(130,(hudWidth-32)/4);FeedName(new Rect(p.x*hudWidth-nameWidth/2,(1-p.y)*hudHeight-12,nameWidth,28),Match.Winners[i].Name.ToString(),Match.Winner);}
      var countdown=new Rect(HudCenter.x-width/2,hudHeight-hudBottom-48,width,42);HudCard(countdown);HudText(countdown,$"{Mathf.CeilToInt(Match.Timer.RemainingTime(Runner)??0)} 秒後重新分隊",16);
    }
    void DrawPauseMenu(){
      if(DuelWebInput.TouchMode)return;Fill(new Rect(0,0,hudWidth,hudHeight),new Color(.025f,.04f,.07f,.62f));var box=new Rect(HudCenter.x-195,HudCenter.y-181,390,362);HudCard(box,TeamColor(0));
      HudText(new Rect(box.x+28,box.y+20,334,40),"休息一下",30,null,TextAnchor.MiddleLeft,true);HudText(new Rect(box.x+28,box.y+72,334,24),"WASD 移動 · 左鍵射擊 · 右鍵瞄準",16,HudMuted);HudText(new Rect(box.x+28,box.y+100,334,24),"Space 跳躍 · R 裝填 · 四角撿槍",16,HudMuted);
      if(HudButton(new Rect(box.x+28,box.y+143,334,44),"繼續玩",true))ResumeControls();if(HudButton(new Rect(box.x+28,box.y+199,334,40),AudioEnabled?"聲音：開":"聲音：關"))SetAudioEnabled(!AudioEnabled);if(HudButton(new Rect(box.x+28,box.y+251,334,40),"回到大廳"))Leave();HudText(new Rect(box.x+28,box.y+311,334,24),"房間內的對戰會繼續進行",14,HudMuted);
    }
  }
}
