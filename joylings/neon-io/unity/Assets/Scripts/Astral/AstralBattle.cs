using System.Collections.Generic;
using System.Linq;
using Neon.Networking;
using UnityEngine;
using UnityEngine.UI;
using Starbro.NeonIO;
using Scoz.Func;
using static Neon.Astral.AstralWidgets;

namespace Neon.Astral
{
    public sealed partial class AstralPresentation
    {
        readonly HashSet<int> styledWorldText=new HashSet<int>();
        void StyleWorldLabels()
        {
            var roles=CombatRegistry.Roles;
            for(int i=0;i<roles.Count;i++)
            {
                var role=roles[i];if(!role)continue;
                if(!role.RoleCanvas)continue;
                StyleWorldText(role.RoleCanvas.transform);
                var health=Field<Image>(role,"HealthImage");if(health)health.color=role is GodRole?HudColor(Teal,.75f):role.MyForce==Force.Player?FactionVisuals.Friendly:FactionVisuals.Hostile;
            }
        }
        void StyleWorldText(Transform root)
        {
            foreach(var t in root.GetComponentsInChildren<Text>(true))
            {if(styledWorldText.Add(t.GetInstanceID())){t.font=Body;t.fontStyle=FontStyle.Normal;var shadow=t.GetComponent<Shadow>();if(!shadow)shadow=t.gameObject.AddComponent<Shadow>();shadow.effectColor=new Color(.03f,.04f,.09f,.8f);shadow.effectDistance=new Vector2(1,-1);}}
        }
        static Color HudColor(Color color,float alpha)=>new Color(color.r,color.g,color.b,alpha);
        Text HudText(Transform parent,string name,string value,float x,float y,float width,float height,int size,Color color,TextAnchor align=TextAnchor.MiddleLeft)
        {
            var text=Text(parent,name,value,x,y,width,height,size,color,align);
            var shadow=text.gameObject.AddComponent<Shadow>();shadow.effectColor=HudColor(Deep,.75f);shadow.effectDistance=new Vector2(0,TouchUI?-1:-1.5f);
            return text;
        }
        void BuildBattle()=>BuildBattleHud(false,32);
        void BuildBattleHud(bool touch,float healthBottom)
        {
            bool compact=touch&&ViewHeight<330;
            float edge=touch?24:32,leaveSize=touch?44:66;
            // The visible icon is small; its transparent hit area stays comfortable on a phone.
            var leaveHit=Image(page,"Leave arena",0,0,leaveSize,leaveSize,null,Color.clear);leaveHit.raycastTarget=true;
            var exit=Graphic(leaveHit.transform,"Exit icon",0,0,touch?22:33,touch?22:33,AstralGraphic.Shape.Exit,Color.white);exit.thickness=touch?1.6f:2.4f;
            var leave=leaveHit.gameObject.AddComponent<Button>();leave.targetGraphic=exit;
            var colors=leave.colors;colors.normalColor=HudColor(Pearl,.7f);colors.highlightedColor=Gold;colors.pressedColor=Pearl;colors.selectedColor=Gold;colors.fadeDuration=.12f;leave.colors=colors;
            leave.navigation=new Navigation{mode=Navigation.Mode.None};
            leave.onClick.AddListener(()=>PopupUI.ShowConfirmCancel(L("確定離開目前的戰場？","Leave the current arena?"),()=>battle.LeaveRoom(),null));
            if(!touch)leave.gameObject.AddComponent<AstralHover>().content=()=>L("離開戰場","Leave arena");
            Pin(leave.transform,Vector2.one,new Vector2(edge,touch?12:20));

            float healthWidth=touch?144:256,healthHeight=touch?48:78;
            var life=Rect(page,"Vitality",0,0,healthWidth,healthHeight);Pin(life,Vector2.zero,new Vector2(32,healthBottom));
            var hp=HudText(life,"Health","",0,touch?14:25,healthWidth,touch?20:32,touch?13:22,HudColor(Pearl,.88f));
            Image(life,"Health track",0,touch?1:5,healthWidth,touch?3:5,null,HudColor(Deep,.6f));
            var fill=Image(life,"Health fill",0,touch?1:5,healthWidth,touch?3:5,Solid,HudColor(Teal,.9f));fill.preserveAspect=false;fill.type=UnityEngine.UI.Image.Type.Filled;fill.fillMethod=UnityEngine.UI.Image.FillMethod.Horizontal;
            float levelWidth=touch?42:70,expWidth=healthWidth-levelWidth-8;
            var level=HudText(life,"Level","",-healthWidth*.5f+levelWidth*.5f,touch?-14:-23,levelWidth,touch?20:30,touch?12:19,HudColor(Gold,.9f));
            var experience=Rect(life,"Experience",(levelWidth+8)*.5f,touch?-14:-23,expWidth,touch?10:16);
            Image(experience,"Experience track",0,0,expWidth,touch?3:5,null,HudColor(Gold,.18f));
            var expFill=Image(experience,"Experience fill",0,0,expWidth,touch?3:5,Solid,HudColor(Gold,.78f));expFill.preserveAspect=false;expFill.type=UnityEngine.UI.Image.Type.Filled;expFill.fillMethod=UnityEngine.UI.Image.FillMethod.Horizontal;
            live.Add(()=>{var p=BattleManager.BM?BattleManager.BM.MyPlayerRole:null;if(!p)return;hp.text=p.Health+" / "+p.MaxHealth;fill.fillAmount=p.HealthRatio;level.text="LV "+p.LV;expFill.fillAmount=p.ExperienceRatio;});

            var skills=Field<Dictionary<int,Skill>>(battle,"SkillDic");
            float slotWidth=touch?48:78,slotHeight=touch?(compact?56:64):104,gap=touch?(compact?8:12):20;
            var skillDock=Rect(page,"Skill dock",0,0,slotWidth*3+gap*2,slotHeight);
            Pin(skillDock,new Vector2(1,0),new Vector2(edge,touch?(compact?24:28):32));
            for(int i=0;i<3;i++)
            {
                int index=i;float iconSize=touch?(compact?30:36):58,iconY=touch?8:13;
                var hit=Image(skillDock,"Skill HUD "+i,(i-1)*(slotWidth+gap),0,slotWidth,slotHeight,null,Color.clear);hit.raycastTarget=true;var box=hit.transform;
                var ring=Graphic(box,"Slot",0,iconY,slotWidth-4,slotWidth-4,AstralGraphic.Shape.Disc,HudColor(Night,.1f));ring.border=HudColor(Gold,.2f);ring.thickness=touch ? .8f : 1.2f;
                var icon=Image(box,"Icon",0,iconY,iconSize,iconSize,null,Color.white);
                icon.material=AstralIcons.Material;
                var cd=Image(box,"Cooldown",0,iconY,iconSize,iconSize,null,HudColor(Deep,.78f));cd.material=AstralIcons.Material;cd.type=UnityEngine.UI.Image.Type.Filled;cd.fillMethod=UnityEngine.UI.Image.FillMethod.Radial360;
                HudText(box,"Part",PartName(i),0,-slotHeight*.5f+(touch?9:15),slotWidth,touch?18:30,touch?11:18,HudColor(Muted,.75f),TextAnchor.MiddleCenter);
                var hover=box.gameObject.AddComponent<AstralHover>();
                hover.content=()=>skills!=null&&skills.TryGetValue(index,out var s)&&s?FeatureData.GetDescription(s.MyFeatureDataID):L("尚未取得技能","No skill yet");
                live.Add(()=>{bool present=skills!=null&&skills.TryGetValue(index,out var s0)&&s0;icon.enabled=present;cd.enabled=present;if(present){var s=skills[index];icon.sprite=AstralIcons.Crop(FeatureData.GetIconSprite(s.MyFeatureDataID));cd.sprite=icon.sprite;cd.fillAmount=1-Mathf.Clamp01(s.GetCDRatio());}});
            }

            int rowCount=compact?3:5;float rankWidth=touch?156:272,rankHeight=touch?(compact?82:124):210;
            var rankPanel=Image(page,"Leaderboard",0,0,rankWidth,rankHeight,null,HudColor(Night,.22f)).transform;
            Pin(rankPanel,Vector2.one,new Vector2(edge,touch?60:96));
            HudText(rankPanel,"Title",L("排行榜","LEADERBOARD"),0,rankHeight*.5f-(touch?12:20),rankWidth-(touch?16:28),touch?20:32,touch?11:18,HudColor(Gold,.75f));
            var names=new Text[rowCount];var scores=new Text[rowCount];
            for(int i=0;i<rowCount;i++)
            {
                float y=rankHeight*.5f-(touch?32:54)-i*(touch?(compact?17:19):32),rowHeight=touch?20:32;
                HudText(rankPanel,"Rank "+i,(i+1).ToString(),touch?-63:-111,y,touch?14:24,rowHeight,touch?11:18,HudColor(Muted,.75f));
                names[i]=HudText(rankPanel,"Name "+i,"",touch?-2:-3,y,touch?98:174,rowHeight,touch?12:20,HudColor(Pearl,.88f));
                scores[i]=HudText(rankPanel,"Score "+i,"",touch?58:101,y,touch?24:42,rowHeight,touch?11:18,HudColor(Gold,.8f),TextAnchor.MiddleRight);
            }
            var log=HudText(page,"Combat feed","",0,0,touch?208:540,touch?(compact?42:84):180,touch?12:20,Muted,TextAnchor.UpperLeft);
            Pin(log.transform,new Vector2(0,1),new Vector2(touch?12:32,touch?12:32));
            float noticeWidth=touch?Mathf.Clamp(ViewWidth-452,170,360):540;
            var notification=Image(page,"Skill notification",0,touch?TouchTop-30:435,noticeWidth,touch?36:60,null,HudColor(Night,.3f)).gameObject;
            var notice=HudText(notification.transform,"Notice","",0,0,noticeWidth-(touch?16:28),touch?30:48,touch?14:22,Gold,TextAnchor.MiddleCenter);
            if(NeonArenaFlow.Active)notification.transform.localPosition += new Vector3(0,touch?-48:-90,0);
            float next=0,noticeUntil=0;var initialSkill=Field<Text>(battle,"GetSkillText");string lastSkill=initialSkill?initialSkill.text:"";
            live.Add(()=>
            {
                if(Time.unscaledTime<next)return;next=Time.unscaledTime+.15f;
                var rows=LeaderBoardUI.ItemDic.Values.Where(r=>r).OrderBy(r=>r.Rank).Take(rowCount).ToArray();
                for(int i=0;i<rowCount;i++){names[i].text=i<rows.Length?rows[i].Name:"—";scores[i].text=i<rows.Length?rows[i].Score.ToString():"";}
                if(NeonArenaFlow.Active && NeonArena.Instance)
                {
                    var arena=NeonArena.Instance;
                    var standings=Enumerable.Range(0,16).Select(i=>arena.Entries[i]).OrderBy(e=>(bool)e.Eliminated).ThenByDescending(e=>e.Kills).ThenByDescending(e=>e.Damage).Take(rowCount).ToArray();
                    for(int i=0;i<rowCount;i++){names[i].text=standings[i].Name.ToString();scores[i].text=standings[i].Kills.ToString();}
                }
                var logs=battle.GetComponentsInChildren<LogItem>().Where(r=>r.gameObject.activeInHierarchy).TakeLast(compact?2:4).Select(r=>r.Log);log.text=string.Join("\n",logs);
                var source=Field<Text>(battle,"GetSkillText");
                if(source&&!string.IsNullOrEmpty(source.text)&&source.text!=lastSkill){lastSkill=source.text;notice.text=L("獲得技能 · ","SKILL ACQUIRED · ")+source.text;noticeUntil=Time.unscaledTime+4;}
                notification.SetActive(Time.unscaledTime<noticeUntil);
            });
        }
        string Value(string name){var t=Field<Text>(battle,name);return t?t.text:"—";}
        void Pin(Transform target,Vector2 corner,Vector2 inset)
        {
            var pin=target.GetComponent<AstralCorner>();if(!pin)pin=target.gameObject.AddComponent<AstralCorner>();pin.safe=safe;pin.corner=corner;pin.inset=inset;
        }
        string ResultTime()
        {
            string value=Value("TimeText");
            return Chinese?value.Replace("m","分").Replace("s","秒").Replace("M","分").Replace("S","秒"):value;
        }
        void BuildResult()
        {
            var shade=Scrim(page,"Result shade",new Color(.025f,.04f,.085f,.94f));
            bool duel=PhotonLauncher.SelectGameType==GameType.Challenge;
            var box=Plate(shade.transform,"Result panel",0,0,1180,duel?530:430).transform;
            if(duel)Text(box,"Result",Value("ResultText"),0,190,1000,75,48,Gold,TextAnchor.MiddleCenter);
            string[] labels={L("擊敗數","KILLS"),L("生存時間","TIME ALIVE"),L("獲得星星","STARS EARNED")};string[] values={Value("KillText"),ResultTime(),Value("GetStarText")};
            for(int i=0;i<3;i++){Text(box,"Stat label "+i,labels[i],-350+i*350,108,310,44,24,Muted,TextAnchor.MiddleCenter);Text(box,"Stat "+i,values[i],-350+i*350,42,310,74,38,Pearl,TextAnchor.MiddleCenter);}
            Graphic(box,"Rule",0,-22,1040,2,AstralGraphic.Shape.Rule,new Color(Gold.r,Gold.g,Gold.b,.6f));
            Text(box,"Record",duel?L("連勝紀錄 ","WIN STREAK ")+Value("WinningStreakText")+"    ·    "+L("積分 ","SCORE ")+Value("GetRankScoreText"):L("最佳擊敗數 ","BEST KILLS ")+Value("BestKillText"),0,-66,1040,50,24,Muted,TextAnchor.MiddleCenter);
            if(duel)Button(box,"Return to lobby",L("返回大廳","RETURN TO LOBBY"),0,-164,580,74,()=>battle.LeaveRoom(),true,28);
            else
            {
                Button(box,"Play again",L("再次出戰","PLAY AGAIN"),-270,-143,480,74,()=>Invoke(battle.transform,"RestartBtn"),true,27);
                Button(box,"Return to lobby",L("返回大廳","RETURN TO LOBBY"),270,-143,480,74,()=>battle.LeaveRoom(),false,27);
                var revive=Field<Button>(battle,"ReviveBtn");var premium=Field<Button>(battle,"PremiumBtn");
                if(!KongregateAPIBehaviour.UsesLocalProfile&&revive&&revive.gameObject.activeInHierarchy&&revive.interactable){var b=Button(shade.transform,"Revive",L("復活服務","REVIVE SERVICE"),-270,-310,480,52,()=>revive.onClick.Invoke(),false,21);b.interactable=revive.interactable;}
                if(!KongregateAPIBehaviour.UsesLocalProfile&&premium&&premium.gameObject.activeInHierarchy&&premium.interactable){var b=Button(shade.transform,"Premium",L("進階服務","PREMIUM SERVICE"),270,-310,480,52,()=>premium.onClick.Invoke(),false,21);b.interactable=premium.interactable;}
            }
        }
    }
}
