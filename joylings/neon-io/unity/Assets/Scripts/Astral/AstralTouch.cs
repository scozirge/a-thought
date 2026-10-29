using System;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using Starbro.NeonIO;
using Scoz.Func;
using static Neon.Astral.AstralWidgets;

namespace Neon.Astral
{
    // Mobile uses CSS-pixel-sized controls and scrollable content, not a scaled desktop screenshot.
    public sealed partial class AstralPresentation
    {
        const float TouchMargin = 12;
        float TouchTop => ViewHeight*.5f;
        float TouchBottom => -ViewHeight*.5f;
        void BuildTouchView(string value)
        {
            switch(value)
            {
                case "lobby": BuildTouchLobby(); break;
                case "collection": case "select": BuildTouchCollection(value=="select"); break;
                case "loadout": case "matching": case "versus": BuildTouchLoadout(); break;
                case "settings": case "clamor": case "credits": BuildTouchSettings(value); break;
                case "battle": BuildTouchBattle(); BuildArenaHud(); break;
                case "arena-waiting": BuildArenaWaiting(); break;
                case "arena-result": BuildArenaResult(); break;
                case "arena-spectate": BuildArenaSpectator(); break;
                case "result": BuildTouchBattle(); BuildTouchResult(); break;
                default:
                    if(UnityEngine.SceneManagement.SceneManager.GetActiveScene().name!="Init")
                        Text(page,"Loading",L("載入中…","LOADING…"),0,TouchBottom+36,ViewWidth-32,44,16,Gold,TextAnchor.MiddleCenter);
                    break;
            }
        }
        Button TouchButton(Transform parent,string name,string label,float x,float y,float width,Action action,bool primary=false,float height=44,int size=16)
        {
            return Button(parent,name,label,x,y,width,height,action==null?(UnityEngine.Events.UnityAction)null:()=>action(),primary,size);
        }
        void TouchHeader(string title,Action back,bool stars=false)
        {
            var heading=TitleArt(page,"Page title",title,0,0,ViewWidth-100,36);
            Pin(heading,new Vector2(0,1),new Vector2(20,17));
            if(back!=null){var b=IconButton(page,"Back",AstralGraphic.Shape.Back,0,0,44,()=>back());Pin(b.transform,Vector2.one,new Vector2(16,12));}
            var rule=Graphic(page,"Header rule",0,TouchTop-65,ViewWidth-40,1,AstralGraphic.Shape.Rule,new Color(Gold.r,Gold.g,Gold.b,.28f));rule.thickness=1;
        }
        void TopContent(RectTransform t,float y){t.anchorMin=t.anchorMax=new Vector2(.5f,1);t.anchoredPosition=new Vector2(t.anchoredPosition.x,y);}
        Text TouchParagraph(Transform parent,string name,string value,float width,int size,TextAnchor align=TextAnchor.UpperLeft)
        {
            var text=Text(parent,name,value,0,0,width,600,size,Pearl,align);
            float h=Mathf.Max(size*1.6f,text.preferredHeight+8);text.rectTransform.sizeDelta=new Vector2(width,h);TopContent(text.rectTransform,-h*.5f);
            return text;
        }
        void BuildTouchLobby()
        {
            RecoverArenaRating();
            float w=Mathf.Clamp(ViewWidth*.40f,286,380),h=Mathf.Max(180,ViewHeight-24),x=-ViewWidth*.5f+16+w*.5f;
            var backing=Plate(page,"Menu backing",x,0,w,h);backing.color=new Color(Night.r,Night.g,Night.b,.7f);backing.border=new Color(Gold.r,Gold.g,Gold.b,.25f);
            var scroll=Scroll(backing.transform,"Lobby actions",0,29,w-8,h-66,out var content);content.sizeDelta=new Vector2(0,390);scroll.GetComponent<Image>().color=Color.clear;
            float inner=w-32;
            var brand=TitleArt(content,"Brand",L("星際遊俠","NOVAROVE"),0,0,inner,42);TopContent(brand,-28);
            var original=Field<InputField>(lobby,"NameInputField");
            var input=Input(content,"Player name",original?original.text:MyPlayer.Name,L("輸入玩家名稱","Your name"),0,-79,inner,44,v=>{if(original)original.text=v;},24);TopContent((RectTransform)input.transform,-79);input.textComponent.fontSize=16;((Text)input.placeholder).fontSize=16;
            input.onEndEdit.AddListener(v=>{if(!string.IsNullOrWhiteSpace(v))MyPlayer.SetName(v.Trim());});
            var arena=TouchButton(content,"Arena",L("競技模式","ARENA"),0,-139,inner,StartArena,false,54,18);TopContent((RectTransform)arena.transform,-139);
            var infinity=TouchButton(content,"Infinity",L("無際戰場","INFINITY WAR"),0,-203,inner,()=>lobby.Connect(),false,54,18);TopContent((RectTransform)infinity.transform,-203);
            var duel=TouchButton(content,"Challenge",L("頂尖對決","CHALLENGE"),0,-267,inner,()=>{if(original&&!string.IsNullOrWhiteSpace(original.text))MyPlayer.SetName(original.text.Trim());lobby.ActiveControlPanel(false);challenge.SetActive(true);},false,54,18);TopContent((RectTransform)duel.transform,-267);
            foreach(var b in new[]{arena,infinity,duel}){var label=b.GetComponentInChildren<Text>();label.rectTransform.anchoredPosition=new Vector2(23,0);label.rectTransform.sizeDelta=new Vector2(inner-68,46);label.alignment=TextAnchor.MiddleLeft;var icon=Graphic(b.transform,"Mode icon",-inner*.5f+27,0,28,28,b==arena?AstralGraphic.Shape.Star:b==infinity?AstralGraphic.Shape.Infinity:AstralGraphic.Shape.Duel,Gold);icon.thickness=1.7f;}
            var collection=TouchButton(content,"Collection",L("收藏","COLLECTION"),0,-325,inner,()=>{part=0;selected=null;lobby.ActiveControlPanel(false);lobby.ActiveShopUI(true);},false,44,16);TopContent((RectTransform)collection.transform,-325);
            Graphic(collection.transform,"Collection icon",-inner*.5f+27,0,23,23,AstralGraphic.Shape.Collection,Gold);
            var rating=Text(content,"Arena rating",ArenaRatingLabel(),0,-367,inner,28,16,Gold,TextAnchor.MiddleLeft);TopContent(rating.rectTransform,-367);
            live.Add(()=>{if(rating)rating.text=ArenaRatingLabel();});
            if(ViewHeight<330)
            {
                // Prioritize the two playable modes when browser chrome leaves a short viewport.
                brand.sizeDelta=new Vector2(Mathf.Min(inner,32*brand.rect.width/brand.rect.height),32);TopContent(brand,-18);
                foreach(var b in new[]{arena,infinity,duel}){var r=(RectTransform)b.transform;r.sizeDelta=new Vector2(inner,44);TopContent(r,b==arena?-62:b==infinity?-114:-166);}
                TopContent((RectTransform)input.transform,-222);TopContent((RectTransform)collection.transform,-276);content.sizeDelta=new Vector2(0,342);TopContent(rating.rectTransform,-316);
            }
            float footer=-h*.5f+32,left=-w*.5f+38;
            IconButton(backing.transform,"Settings",AstralGraphic.Shape.Gear,left,footer,44,()=>{lobby.ActiveControlPanel(false);lobby.ActiveSettingUI(true);});
            IconButton(backing.transform,"Tutorial",AstralGraphic.Shape.Book,left+50,footer,44,()=>lobby.WatchTutorial());
            IconButton(backing.transform,"Quit",AstralGraphic.Shape.Exit,left+100,footer,44,()=>lobby.ExitGame());
            CurrencyRow(backing.transform,w*.5f-66,footer,true);
        }
        void BuildTouchCollection(bool choosing)
        {
            TouchHeader(choosing?L("選擇技能","CHOOSE A SKILL"):L("收藏","COLLECTION"),()=>{if(choosing)challenge.ActiveSelectUI(false);else Home();});
            float detailWidth=Mathf.Clamp(ViewWidth*.33f,210,320),gridWidth=ViewWidth-detailWidth-40;
            float gridX=-ViewWidth*.5f+12+gridWidth*.5f,tabWidth=(gridWidth-12)/3;
            for(int i=0;i<3;i++){int tab=i;TouchButton(page,"Part "+i,PartName(i),gridX-tabWidth-6+i*(tabWidth+6),TouchTop-98,tabWidth,()=>{part=tab;selected=null;Refresh();},part==i);}
            var data=FeatureData.GetAllFeatureDatas((FeaturePart)part);
            if(selected==null||selected.MyFeaturePart!=(FeaturePart)part)selected=data.FirstOrDefault();
            float gridHeight=Mathf.Max(64,ViewHeight-140),cardWidth=(gridWidth-32)/3;
            Scroll(page,"Skill grid",gridX,TouchTop-128-gridHeight*.5f,gridWidth,gridHeight,out var content);
            content.sizeDelta=new Vector2(0,Mathf.Max(gridHeight,Mathf.Ceil(data.Count/3f)*110));
            for(int n=0;n<data.Count;n++)
            {
                var f=data[n];int col=n%3,row=n/3;
                var card=TouchButton(content,"Skill "+f.ID,"",(col-1)*(cardWidth+8),-54-row*110,cardWidth,()=>{selected=f;BuildTouchDetail(choosing);},false,102);TopContent((RectTransform)card.transform,-54-row*110);
                Image(card.transform,"Original icon",0,15,48,48,f.IconSprite,Color.white);
                Text(card.transform,"Name",f.Name,0,-30,cardWidth-8,36,14,Pearl,TextAnchor.MiddleCenter);
            }
            BuildTouchDetail(choosing);
        }
        void BuildTouchDetail(bool choosing)
        {
            var old=page.Find("Skill detail");if(old){old.gameObject.SetActive(false);Destroy(old.gameObject);}
            if(selected==null)return;var f=selected;
            float w=Mathf.Clamp(ViewWidth*.33f,210,320),h=ViewHeight-88;
            var box=Plate(page,"Skill detail",ViewWidth*.5f-12-w*.5f,-32,w,h).transform;
            bool small=h<230;float heading=small?42:88;
            if(!small)Image(box,"Original icon",-w*.5f+44,h*.5f-44,56,56,f.IconSprite,Color.white);
            Text(box,"Name",f.Name,small?0:36,h*.5f-(small?22:32),small?w-24:w-98,small?32:40,18,Pearl,small?TextAnchor.MiddleCenter:TextAnchor.MiddleLeft);
            if(!small)Text(box,"Type",PartName((int)f.MyFeaturePart),36,h*.5f-63,w-98,24,12,Gold);
            float bodyHeight=Mathf.Max(32,h-heading-70);
            Scroll(box,"Description",0,h*.5f-heading-bodyHeight*.5f,w-24,bodyHeight,out var c);
            var text=TouchParagraph(c,"Text",f.Description,w-56,16);c.sizeDelta=new Vector2(0,Mathf.Max(bodyHeight,text.rectTransform.rect.height));
            var action=TouchButton(box,"Use skill",choosing?L("裝備此技能","EQUIP SKILL"):L("已擁有","OWNED"),0,-h*.5f+34,w-24,()=>
            {if(choosing&&f.Owned){challenge.SetFeature(f);challenge.ActiveSelectUI(false);selected=null;}
             else if(!choosing&&!f.Owned){var item=lobby.GetComponentsInChildren<PurchaseItem>(true).FirstOrDefault(x=>x.MyFeatureData==f);if(item)item.Purchase();}},choosing);
            var label=action.GetComponentInChildren<Text>();
            live.Add(()=>{if(!action)return;action.interactable=choosing?f.Owned:!f.Owned;label.text=choosing?(f.Owned?L("裝備","EQUIP"):L("尚未擁有","LOCKED")):f.Owned?L("已擁有","OWNED"):L("解鎖 ","UNLOCK ")+(f.SoldType==Currency.Star?"✦ "+f.Fee:f.Fee+" Kreds");});
        }
        void BuildTouchLoadout()
        {
            bool searching=CurrentView=="matching",versus=CurrentView=="versus";
            TouchHeader(versus?L("對手已就緒","OPPONENT READY"):searching?L("正在尋找對手","FINDING AN OPPONENT"):L("頂尖對決","CHALLENGE"),searching||versus?(Action)null:Home,false);
            var features=Field<FeatureData[]>(challenge,"P1Features");
            float width=ViewWidth-24,bodyHeight=Mathf.Max(64,ViewHeight-(versus?88:144));
            Scroll(page,"Loadout list",0,TouchTop-76-bodyHeight*.5f,width,bodyHeight,out var content);
            float cardHeight=versus?132:Mathf.Clamp(bodyHeight,132,240),slotWidth=(width-62)/5;
            content.sizeDelta=new Vector2(0,versus?336:cardHeight);
            for(int i=0;i<5;i++)
            {
                int index=i;var f=features!=null?features[i]:null;
                var card=TouchButton(content,"Loadout "+i,"",(i-2)*(slotWidth+10),-cardHeight*.5f,slotWidth,()=>{challenge.SetSelectIndex(index);part=f!=null?(int)f.MyFeaturePart:0;selected=f;challenge.ActiveSelectUI(true);},false,cardHeight);TopContent((RectTransform)card.transform,-cardHeight*.5f);card.interactable=!searching&&!versus;
                if(f!=null)Image(card.transform,"Icon",0,cardHeight*.5f-45,54,54,f.IconSprite,Color.white);
                Text(card.transform,"Name",f?.Name??"—",0,-cardHeight*.5f+35,slotWidth-8,52,14,Pearl,TextAnchor.MiddleCenter);
                if(!versus&&cardHeight>=190)Text(card.transform,"Slot",(i+1).ToString("00"),0,cardHeight*.5f-92,slotWidth-12,24,12,Gold,TextAnchor.MiddleCenter);
            }
            if(versus)
            {
                var opponent=Text(content,"Opponent",L("對手：","OPPONENT: ")+(ChallengeUI.P2NameString??""),0,-160,width-32,32,16,Gold,TextAnchor.MiddleCenter);TopContent(opponent.rectTransform,-160);
                for(int i=0;i<5;i++){var f=ChallengeUI.P2Features!=null?ChallengeUI.P2Features[i]:null;var p=Plate(content,"Opponent slot "+i,(i-2)*(slotWidth+10),-254,slotWidth,132);TopContent(p.rectTransform,-254);if(f!=null){Image(p.transform,"Icon",0,20,54,54,f.IconSprite,Color.white);Text(p.transform,"Name",f.Name,0,-40,slotWidth-8,40,14,Pearl,TextAnchor.MiddleCenter);}}
            }
            else
            {
                Text(page,"Player",MyPlayer.Name,-ViewWidth*.5f+172,TouchBottom+36,320,44,16,Gold);
                var button=TouchButton(page,searching?"Cancel matchmaking":"Start matchmaking",searching?L("取消配對","CANCEL SEARCH"):L("開始配對","FIND OPPONENT"),0,0,200,()=>{if(searching)challenge.CancelChallenge();else challenge.Connect();},!searching,48);
                Pin(button.transform,new Vector2(1,0),new Vector2(12,12));
            }
        }
        void BuildTouchSettings(string section)
        {
            TouchHeader(L("設定","SETTINGS"),Home,false);
            string[] tabs={L("一般設定","GENERAL"),L("喊話設定","SHOUTS"),L("製作名單","CREDITS")};float tw=(ViewWidth-36)/3;
            for(int i=0;i<3;i++){int index=i;TouchButton(page,"Settings tab "+i,tabs[i],(i-1)*(tw+6),TouchTop-96,tw,()=>lobby.SetSettingCurrentTab(index),section==(i==0?"settings":i==1?"clamor":"credits"));}
            if(section=="clamor"){BuildTouchClamor();return;}
            float h=Mathf.Max(64,ViewHeight-140),w=ViewWidth-24;
            Scroll(page,section=="credits"?"Credits":"Preferences",0,TouchTop-128-h*.5f,w,h,out var c);
            if(section=="credits")
            {
                var source=Field<GameObject[]>(lobby,"SettingSubObjs")[2];
                var lines=source.GetComponentsInChildren<Text>(true).Where(t=>!t.GetComponentInParent<Button>()&&!string.IsNullOrWhiteSpace(t.text)).Select(t=>t.text).Distinct();
                var text=TouchParagraph(c,"Original credits",string.Join("\n\n",lines),w-56,16,TextAnchor.UpperCenter);c.sizeDelta=new Vector2(0,Mathf.Max(h,text.rectTransform.rect.height));return;
            }
            float rowWidth=Mathf.Min(900,w-36);c.sizeDelta=new Vector2(0,420);
            TouchSettingSlider(c,"MusicSlider",L("音樂音量","Music volume"),rowWidth,-30);
            TouchSettingSlider(c,"SoundSlider",L("音效音量","Sound volume"),rowWidth,-90);
            TouchSettingChoice(c,"BattleSongDropDown",L("戰鬥音樂","Battle music"),rowWidth,-150);
            TouchSettingChoice(c,"LanguageDropDown",L("語言","Language"),rowWidth,-210);
            TouchSettingChoice(c,"RegionDropDown",L("連線地區","Connection region"),rowWidth,-270);
            var hint=Text(c,"Settings hint",L("地區設定會套用至下一次連線。","Region applies to your next connection."),0,-320,rowWidth,36,14,Muted);TopContent(hint.rectTransform,-320);
            var fullscreen=TouchButton(c,"Fullscreen",L("切換全螢幕","FULLSCREEN"),-110,-378,200,()=>lobby.FullScreen());TopContent((RectTransform)fullscreen.transform,-378);
            var tutorial=TouchButton(c,"Tutorial",L("遊玩教學","HOW TO PLAY"),110,-378,200,()=>lobby.WatchTutorial());TopContent((RectTransform)tutorial.transform,-378);
        }
        void TouchSettingSlider(Transform parent,string field,string label,float width,float y)
        {
            var source=Field<Slider>(lobby,field);
            var row=Rect(parent,field+" row",0,y,width,52);TopContent(row,y);
            Text(row,field+" label",label,-width*.5f+100,0,200,44,16);
            Slider(row,field,source?source.value:1,112,0,width-248,v=>{if(source)source.value=v;});
        }
        void TouchSettingChoice(Transform parent,string field,string label,float width,float y)
        {
            var source=Field<Dropdown>(lobby,field);var row=Rect(parent,field+" row",0,y,width,52);TopContent(row,y);
            Text(row,field+" label",label,-width*.5f+100,0,200,44,16);
            var button=TouchButton(row,field,"",112,0,width-224,()=>OpenTouchChoices(source));
            var labelText=button.GetComponentInChildren<Text>();live.Add(()=>{if(source&&source.options.Count>0)labelText.text=source.options[source.value].text+"  ▾";});
        }
        void OpenTouchChoices(Dropdown source)
        {
            if(!source)return;var shade=Scrim(page,"Choice overlay",new Color(0,0,0,.82f));
            float w=Mathf.Min(600,ViewWidth-24),h=Mathf.Min(480,ViewHeight-24);
            var panel=Plate(shade.transform,"Choices",0,0,w,h).transform;
            TitleAt(panel,"Choose title",L("選擇設定","SELECT OPTION"),-w*.5f+16,h*.5f-34,w-100,32);
            IconButton(panel,"Close choices",AstralGraphic.Shape.Back,w*.5f-38,h*.5f-34,44,()=>Destroy(shade.gameObject));
            float bodyHeight=h-84;Scroll(panel,"Options",0,-30,w-24,bodyHeight,out var c);c.sizeDelta=new Vector2(0,Mathf.Max(bodyHeight,source.options.Count*52));
            for(int i=0;i<source.options.Count;i++){int index=i;var b=TouchButton(c,"Option "+i,source.options[i].text,0,-24-i*52,w-56,()=>{source.value=index;Destroy(shade.gameObject);},i==source.value);TopContent((RectTransform)b.transform,-24-i*52);}
        }
        void BuildTouchClamor()
        {
            var controller=lobby.GetComponentInChildren<ClamorUI>(true);if(!controller)return;
            float w=ViewWidth-24,h=Mathf.Max(48,ViewHeight-198);
            Scroll(page,"Shout list",0,TouchTop-128-h*.5f,w,h,out var c);
            var items=controller.GetComponentsInChildren<ClamorItem>(true).Where(i=>i.gameObject.activeInHierarchy).ToArray();
            c.sizeDelta=new Vector2(0,Mathf.Max(h,64+items.Length*94));
            float buttonWidth=(w-44)/3;
            for(int i=0;i<3;i++){int partIndex=i;var b=TouchButton(c,"Unlock shout "+i,PartName(i)+L("喊話解鎖"," SHOUTS"),(i-1)*(buttonWidth+8),-24,buttonWidth,()=>controller.PurchaseSpellClamor(partIndex),false,44,14);TopContent((RectTransform)b.transform,-24);}
            for(int i=0;i<items.Length;i++)
            {
                var item=items[i];var row=Rect(c,"Shout "+i,0,-108-i*94,w-36,88);TopContent(row,-108-i*94);
                Text(row,"Trigger",item.NameText.text,0,29,w-48,26,14,Gold);
                bool unlockable=item.MyFeatureData==null;float inputWidth=w-(unlockable?156:44);
                var input=Input(row,"Message",item.ContentInput.text,L("輸入喊話內容","Enter your shout"),unlockable?-56:0,-12,inputWidth,44,v=>{item.ContentInput.text=v;item.SaveContentChange(v);},item.ContentInput.characterLimit>0?item.ContentInput.characterLimit:80);input.textComponent.fontSize=16;((Text)input.placeholder).fontSize=16;input.interactable=item.ContentInput.interactable;
                var unlock=TouchButton(row,"Unlock",L("解鎖","UNLOCK"),w*.5f-70,-12,100,()=>item.Purchase(),false,44,14);
                live.Add(()=>{input.interactable=item.ContentInput.interactable;unlock.gameObject.SetActive(!input.interactable&&unlockable);});
            }
            var save=TouchButton(page,"Save shouts",L("儲存喊話","SAVE SHOUTS"),0,0,184,()=>controller.Save(),true,48);Pin(save.transform,new Vector2(1,0),new Vector2(12,12));
            var countdown=Text(page,"Save countdown","",-ViewWidth*.5f+172,TouchBottom+36,320,44,14,Muted);
            var oldButton=Field<Button>(controller,"SaveBtn");var oldCountdown=Field<Text>(controller,"CoutDownText");live.Add(()=>{save.interactable=oldButton&&oldButton.interactable;countdown.text=oldCountdown&&oldCountdown.gameObject.activeInHierarchy?oldCountdown.text:"";});
        }
        void BuildTouchDialog(Transform parent,string kind,string title,string message)
        {
            float w=Mathf.Min(600,ViewWidth-24),h=Mathf.Min(340,ViewHeight-24);
            var box=Plate(parent,"Dialog",0,0,w,h).transform;
            TitleAt(box,"Title",string.IsNullOrEmpty(title)?kind=="confirm"?L("確認操作","CONFIRM"):kind=="loading"?L("正在處理","PLEASE WAIT"):L("提示","NOTICE"):title,-w*.5f+16,h*.5f-34,w-32,32);
            float bodyHeight=Mathf.Max(32,h-136);Scroll(box,"Message",0,0,w-32,bodyHeight,out var c);
            var text=TouchParagraph(c,"Content",message,w-64,16);c.sizeDelta=new Vector2(0,Mathf.Max(bodyHeight,text.rectTransform.rect.height));
            float buttonWidth=(w-44)*.5f,y=-h*.5f+34;
            if(kind=="confirm")
            {TouchButton(box,"Cancel dialog",L("取消","CANCEL"),-(buttonWidth+12)*.5f,y,buttonWidth,()=>popup.Cancel());TouchButton(box,"Confirm dialog",L("確定","CONFIRM"),(buttonWidth+12)*.5f,y,buttonWidth,()=>popup.Confirm(),true);}
            else if(kind!="loading")TouchButton(box,"Close dialog",L("我知道了","CONTINUE"),0,y,w-32,()=>{if(kind=="notice")popup.HidewClickCancel();else if(kind=="titleNotice")popup.HidekCancelTitle();else{var g=Field<GameObject>(popup,"RestartGo");if(g)g.SetActive(false);}},true);
            else Text(box,"Progress",L("連線與載入中，請稍候…","Connecting and loading…"),0,y,w-32,44,14,Muted,TextAnchor.MiddleCenter);
        }
        void BuildTouchResult()
        {
            var shade=Scrim(page,"Result shade",new Color(.025f,.04f,.085f,.94f));bool duel=PhotonLauncher.SelectGameType==GameType.Challenge;
            float w=Mathf.Min(800,ViewWidth-24),h=Mathf.Min(duel?300:254,ViewHeight-24),col=(w-32)/3;
            var box=Plate(shade.transform,"Result panel",0,0,w,h).transform;
            if(duel)Text(box,"Result",Value("ResultText"),0,h*.5f-22,w-32,32,22,Gold,TextAnchor.MiddleCenter);
            string[] labels={L("擊敗數","KILLS"),L("生存時間","TIME ALIVE"),L("獲得星星","STARS EARNED")};string[] values={Value("KillText"),ResultTime(),Value("GetStarText")};
            float y=h*.5f-(duel?60:32);
            for(int i=0;i<3;i++){Text(box,"Stat label "+i,labels[i],(i-1)*col,y,col-8,24,14,Muted,TextAnchor.MiddleCenter);Text(box,"Stat "+i,values[i],(i-1)*col,y-40,col-8,48,28,Pearl,TextAnchor.MiddleCenter);}
            Text(box,"Record",duel?L("連勝紀錄 ","WIN STREAK ")+Value("WinningStreakText")+" · "+L("積分 ","SCORE ")+Value("GetRankScoreText"):L("最佳擊敗數 ","BEST KILLS ")+Value("BestKillText"),0,-h*.5f+86,w-32,28,14,Muted,TextAnchor.MiddleCenter);
            if(duel)TouchButton(box,"Return to lobby",L("返回大廳","RETURN TO LOBBY"),0,-h*.5f+34,w-32,()=>battle.LeaveRoom(),true);
            else{float bw=(w-44)*.5f;TouchButton(box,"Play again",L("再次出戰","PLAY AGAIN"),-(bw+12)*.5f,-h*.5f+34,bw,()=>Invoke(battle.transform,"RestartBtn"),true);TouchButton(box,"Return to lobby",L("返回大廳","RETURN TO LOBBY"),(bw+12)*.5f,-h*.5f+34,bw,()=>battle.LeaveRoom());}
        }
    }
}
