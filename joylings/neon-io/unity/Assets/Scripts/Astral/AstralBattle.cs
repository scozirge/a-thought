using System.Collections.Generic;
using System.Linq;
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
            foreach(var role in FindObjectsByType<Role>(FindObjectsSortMode.None))
            {
                if(!role.RoleCanvas)continue;
                StyleWorldText(role.RoleCanvas.transform);
                var health=Field<Image>(role,"HealthImage");if(health)health.color=role.MyForce==Force.Player?FactionVisuals.Friendly:FactionVisuals.Hostile;
            }
        }
        void StyleWorldText(Transform root)
        {
            foreach(var t in root.GetComponentsInChildren<Text>(true))
            {if(styledWorldText.Add(t.GetInstanceID())){t.font=Body;t.fontStyle=FontStyle.Normal;var shadow=t.GetComponent<Shadow>();if(!shadow)shadow=t.gameObject.AddComponent<Shadow>();shadow.effectColor=new Color(.03f,.04f,.09f,.8f);shadow.effectDistance=new Vector2(1,-1);}}
        }
        void BuildBattle()
        {

            var leave=Button(page,"Leave arena",L("離開戰場","LEAVE"),765,475,230,52,()=>PopupUI.ShowConfirmCancel(L("確定離開目前的戰場？","Leave the current arena?"),()=>battle.LeaveRoom(),null),false,21);
            Pin(leave.transform,Vector2.one,new Vector2(24,24));
            var life=Plate(page,"Vitality",-635,-436,500,130).transform;
            Pin(life,Vector2.zero,new Vector2(24,24));
            Graphic(life,"Level orbit",-176,0,100,100,AstralGraphic.Shape.Orbit,Gold);
            Text(life,"Level label","LV",-176,25,90,35,16,Gold,TextAnchor.MiddleCenter,true);
            var level=Text(life,"Level","",-176,-10,90,70,32,Gold,TextAnchor.MiddleCenter,true);
            var hp=Text(life,"Health","",32,24,295,40,24,Pearl);
            Image(life,"Health track",32,-16,295,12,null,new Color(.3f,.32f,.4f,.7f));
            var fill=Image(life,"Health fill",32,-16,295,12,null,Teal);fill.type=UnityEngine.UI.Image.Type.Filled;fill.fillMethod=UnityEngine.UI.Image.FillMethod.Horizontal;
            var stars=Text(life,"Earned stars","",32,-44,295,32,20,Gold);
            live.Add(()=>{var p=BattleManager.BM?BattleManager.BM.MyPlayerRole:null;if(!p)return;level.text=p.LV.ToString();hp.text=p.Health+" / "+p.MaxHealth;fill.fillAmount=p.HealthRatio;stars.text="✦ "+p.Star;});
            var skills=Field<Dictionary<int,Skill>>(battle,"SkillDic");
            var skillDock=Rect(page,"Skill dock",0,0,492,164);
            Pin(skillDock,new Vector2(1,0),new Vector2(24,24));
            for(int i=0;i<3;i++)
            {
                int index=i;float x=-172+i*172;
                var box=Plate(skillDock,"Skill HUD "+i,x,0,148,164).transform;
                Graphic(box,"Orbit",0,15,120,120,AstralGraphic.Shape.Orbit,Gold);
                var icon=Image(box,"Icon",0,15,83,83,null,Color.white);
                icon.material=AstralIcons.Material;
                var cd=Image(box,"Cooldown",0,15,96,96,null,new Color(.03f,.05f,.1f,.75f));cd.type=UnityEngine.UI.Image.Type.Filled;cd.fillMethod=UnityEngine.UI.Image.FillMethod.Radial360;
                Text(box,"Part",PartName(i),0,-57,136,34,20,Muted,TextAnchor.MiddleCenter);
                var hover=box.gameObject.AddComponent<AstralHover>();box.GetComponent<AstralGraphic>().raycastTarget=true;
                hover.content=()=>skills!=null&&skills.TryGetValue(index,out var s)&&s?FeatureData.GetDescription(s.MyFeatureDataID):L("尚未取得技能","No skill yet");
                live.Add(()=>{bool present=skills!=null&&skills.TryGetValue(index,out var s0)&&s0;icon.enabled=present;cd.enabled=present;if(present){var s=skills[index];icon.sprite=AstralIcons.Crop(FeatureData.GetIconSprite(s.MyFeatureDataID));cd.fillAmount=1-Mathf.Clamp01(s.GetCDRatio());}});
            }
            var rankPanel=Plate(page,"Leaderboard",669,257,430,320).transform;
            Pin(rankPanel,Vector2.one,new Vector2(24,100));
            Text(rankPanel,"Title",L("排行榜","LEADERBOARD"),0,126,376,40,23,Gold);
            Text[] names=new Text[5],scores=new Text[5];
            for(int i=0;i<5;i++){Text(rankPanel,"Rank "+i,(i+1).ToString("00"),-170,70-i*48,45,40,21,Gold);names[i]=Text(rankPanel,"Name "+i,"",-4,70-i*48,260,40,22);scores[i]=Text(rankPanel,"Score "+i,"",167,70-i*48,60,40,22,Gold,TextAnchor.MiddleRight);}
            var log=Text(page,"Combat feed","",-577,335,620,220,22,Muted,TextAnchor.UpperLeft);
            Pin(log.transform,new Vector2(0,1),new Vector2(24,24));
            var notification=Plate(page,"Skill notification",0,435,640,85).gameObject;
            var notice=Text(notification.transform,"Notice","",0,0,590,70,24,Gold,TextAnchor.MiddleCenter);
            float next=0,noticeUntil=0;var initialSkill=Field<Text>(battle,"GetSkillText");string lastSkill=initialSkill?initialSkill.text:"";int lastLevel=0;
            live.Add(()=>
            {
                if(Time.unscaledTime<next)return;next=Time.unscaledTime+.15f;
                var rows=LeaderBoardUI.ItemDic.Values.Where(r=>r).OrderBy(r=>r.Rank).Take(5).ToArray();
                for(int i=0;i<5;i++){names[i].text=i<rows.Length?rows[i].Name:"—";scores[i].text=i<rows.Length?rows[i].Score.ToString():"";}
                var logs=battle.GetComponentsInChildren<LogItem>().Where(r=>r.gameObject.activeInHierarchy).TakeLast(4).Select(r=>r.Log);log.text=string.Join("\n",logs);
                var source=Field<Text>(battle,"GetSkillText");var player=BattleManager.BM?BattleManager.BM.MyPlayerRole:null;
                if(source&&!string.IsNullOrEmpty(source.text)&&source.text!=lastSkill){lastSkill=source.text;notice.text=L("獲得技能 · ","SKILL ACQUIRED · ")+source.text;noticeUntil=Time.unscaledTime+4;}
                if(player&&player.LV!=lastLevel){if(lastLevel>0){notice.text=L("升級 · 等級 ","LEVEL UP · ")+player.LV;noticeUntil=Time.unscaledTime+3;}lastLevel=player.LV;}
                notification.SetActive(Time.unscaledTime<noticeUntil);
            });
        }
        string Value(string name){var t=Field<Text>(battle,name);return t?t.text:"—";}
        void Pin(Transform target,Vector2 corner,Vector2 inset)
        {
            var pin=target.gameObject.AddComponent<AstralCorner>();pin.safe=safe;pin.corner=corner;pin.inset=inset;
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
