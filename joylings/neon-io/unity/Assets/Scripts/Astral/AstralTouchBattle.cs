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
        void BuildTouchBattle()
        {
            bool compact=ViewHeight<330;
            float stickSize=compact?104:136,lifeHeight=compact?48:64;
            var stick=Graphic(page,"Touch joystick",0,0,stickSize,stickSize,AstralGraphic.Shape.Disc,new Color(Panel.r,Panel.g,Panel.b,.88f),true);
            stick.thickness=1.4f;stick.border=new Color(Teal.r,Teal.g,Teal.b,.65f);
            Pin(stick.transform,Vector2.zero,new Vector2(12,12));
            var hint=Graphic(stick.transform,"Stick centre",0,0,compact?58:76,compact?58:76,AstralGraphic.Shape.Orbit,new Color(Gold.r,Gold.g,Gold.b,.3f));hint.thickness=1;
            var knob=Graphic(stick.transform,"Thumb",0,0,compact?46:58,compact?46:58,AstralGraphic.Shape.Disc,Teal);knob.border=Pearl;knob.thickness=1.2f;
            var controller=stick.gameObject.AddComponent<NeonTouchStick>();controller.knob=knob.rectTransform;controller.radius=(stickSize-knob.rectTransform.rect.width)*.48f;

            var life=Plate(page,"Vitality",0,0,196,lifeHeight).transform;Pin(life,Vector2.zero,new Vector2(12,stickSize+24));
            var level=Text(life,"Level","",-73,compact?8:14,40,28,14,Gold);
            var hp=Text(life,"Health","",20,compact?8:14,140,28,18,Pearl,TextAnchor.MiddleRight);
            Image(life,"Health track",0,compact?-13:-10,172,5,null,new Color(.3f,.32f,.4f,.7f));
            var fill=Image(life,"Health fill",0,compact?-13:-10,172,5,null,Teal);fill.type=UnityEngine.UI.Image.Type.Filled;fill.fillMethod=UnityEngine.UI.Image.FillMethod.Horizontal;
            var earned=compact?null:Text(life,"Earned stars","",0,-23,172,20,12,Gold);
            live.Add(()=>{var p=BattleManager.BM?BattleManager.BM.MyPlayerRole:null;if(!p)return;level.text="LV "+p.LV;hp.text=p.Health+" / "+p.MaxHealth;fill.fillAmount=p.HealthRatio;if(earned)earned.text="✦ "+p.Star;});

            var leave=TouchButton(page,"Leave arena",L("離開戰場","LEAVE"),0,0,112,()=>PopupUI.ShowConfirmCancel(L("確定離開目前的戰場？","Leave the current arena?"),()=>battle.LeaveRoom(),null),false,44,14);Pin(leave.transform,Vector2.one,new Vector2(12,12));
            int rowCount=compact?3:5;float rankHeight=compact?86:148;
            var ranking=Plate(page,"Leaderboard",0,0,176,rankHeight).transform;Pin(ranking,Vector2.one,new Vector2(12,compact?64:72));
            Text(ranking,"Title",L("排行榜","LEADERBOARD"),0,rankHeight*.5f-16,152,24,12,Gold);
            var names=new Text[rowCount];var scores=new Text[rowCount];
            for(int i=0;i<rowCount;i++)
            {
                float y=rankHeight*.5f-42-i*(compact?17:23);
                Text(ranking,"Rank "+i,(i+1).ToString(),-72,y,16,22,12,Muted);
                names[i]=Text(ranking,"Name "+i,"",-6,y,114,22,12);
                scores[i]=Text(ranking,"Score "+i,"",68,y,28,22,12,Gold,TextAnchor.MiddleRight);
            }
            var feed=Text(page,"Combat feed","",0,0,208,compact?42:84,12,Muted,TextAnchor.UpperLeft);Pin(feed.transform,new Vector2(0,1),new Vector2(12,12));
            var skills=Field<Dictionary<int,Skill>>(battle,"SkillDic");
            float skillHeight=compact?68:88;
            var dock=Rect(page,"Skill dock",0,0,220,skillHeight);Pin(dock,new Vector2(1,0),new Vector2(12,12));
            for(int i=0;i<3;i++)
            {
                int index=i;var box=Plate(dock,"Skill HUD "+i,(i-1)*76,0,68,skillHeight).transform;
                var icon=Image(box,"Icon",0,8,compact?32:44,compact?32:44,null,Color.white);icon.material=AstralIcons.Material;
                var cd=Image(box,"Cooldown",0,8,compact?36:48,compact?36:48,null,new Color(.03f,.05f,.1f,.75f));cd.type=UnityEngine.UI.Image.Type.Filled;cd.fillMethod=UnityEngine.UI.Image.FillMethod.Radial360;
                Text(box,"Part",PartName(i),0,-skillHeight*.5f+13,62,24,12,Muted,TextAnchor.MiddleCenter);
                var hover=box.gameObject.AddComponent<AstralHover>();box.GetComponent<AstralGraphic>().raycastTarget=true;
                hover.content=()=>skills!=null&&skills.TryGetValue(index,out var skill)&&skill?FeatureData.GetDescription(skill.MyFeatureDataID):L("尚未取得技能","No skill yet");
                live.Add(()=>{bool present=skills!=null&&skills.TryGetValue(index,out var current)&&current;icon.enabled=present;cd.enabled=present;if(present){var s=skills[index];icon.sprite=AstralIcons.Crop(FeatureData.GetIconSprite(s.MyFeatureDataID));cd.fillAmount=1-Mathf.Clamp01(s.GetCDRatio());}});
            }
            float noticeWidth=Mathf.Clamp(ViewWidth-452,170,360);
            var notification=Plate(page,"Skill notification",0,TouchTop-30,noticeWidth,36).gameObject;
            var notice=Text(notification.transform,"Notice","",0,0,noticeWidth-16,30,14,Gold,TextAnchor.MiddleCenter);
            float next=0,noticeUntil=0;var original=Field<Text>(battle,"GetSkillText");string lastSkill=original?original.text:"";int lastLevel=0;
            live.Add(()=>
            {
                if(Time.unscaledTime<next)return;next=Time.unscaledTime+.15f;
                var rows=LeaderBoardUI.ItemDic.Values.Where(r=>r).OrderBy(r=>r.Rank).Take(rowCount).ToArray();
                for(int i=0;i<rowCount;i++){names[i].text=i<rows.Length?rows[i].Name:"—";scores[i].text=i<rows.Length?rows[i].Score.ToString():"";}
                feed.text=string.Join("\n",battle.GetComponentsInChildren<LogItem>().Where(r=>r.gameObject.activeInHierarchy).TakeLast(compact?2:4).Select(r=>r.Log));
                var source=Field<Text>(battle,"GetSkillText");var player=BattleManager.BM?BattleManager.BM.MyPlayerRole:null;
                if(source&&!string.IsNullOrEmpty(source.text)&&source.text!=lastSkill){lastSkill=source.text;notice.text=L("獲得技能 · ","SKILL · ")+source.text;noticeUntil=Time.unscaledTime+4;}
                if(player&&player.LV!=lastLevel){if(lastLevel>0){notice.text=L("升級 · 等級 ","LEVEL UP · ")+player.LV;noticeUntil=Time.unscaledTime+3;}lastLevel=player.LV;}
                notification.SetActive(Time.unscaledTime<noticeUntil);
            });
        }
    }
}
