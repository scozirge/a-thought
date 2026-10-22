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
        void BuildLobby()
        {
            // The original animated guardian, meteors and entrance burst remain visible.
            var menu=Plate(page,"Menu backing",0,0,560,920);menu.color=new Color(Night.r,Night.g,Night.b,.68f);menu.border=new Color(Gold.r,Gold.g,Gold.b,.24f);
            Pin(menu.transform,new Vector2(0,.5f),new Vector2(32,0));
            var brand=TitleArt(menu.transform,"Brand",L("星際遊俠","NOVAROVE"),0,328,480,150);
            var original=Field<InputField>(lobby,"NameInputField");
            var nameInput=Input(menu.transform,"Player name",original?original.text:MyPlayer.Name,L("輸入玩家名稱","Your name"),0,205,480,62,v=>{if(original)original.text=v;},24);
            nameInput.onEndEdit.AddListener(v=>{if(!string.IsNullOrWhiteSpace(v))MyPlayer.SetName(v.Trim());});
            ModeCard(menu.transform,"Infinity",L("無際戰場","INFINITY WAR"),L("收集星星，取得技能並生存。","Collect stars. Evolve. Survive."),0,73,()=>lobby.Connect(),AstralGraphic.Shape.Infinity);
            ModeCard(menu.transform,"Challenge",L("頂尖對決","CHALLENGE"),L("選擇五項技能出戰。","Choose five skills. Duel."),0,-77,()=>{if(original&&!string.IsNullOrWhiteSpace(original.text))MyPlayer.SetName(original.text.Trim());lobby.ActiveControlPanel(false);challenge.SetActive(true);},AstralGraphic.Shape.Duel);
            var collection=Button(menu.transform,"Collection",L("收藏","COLLECTION"),0,-207,480,66,()=>{part=0;selected=null;lobby.ActiveControlPanel(false);lobby.ActiveShopUI(true);},false,26);
            Graphic(collection.transform,"Collection icon",-194,0,36,36,AstralGraphic.Shape.Collection,Gold);
            var team=Button(menu.transform,"Team",L("組隊競技 · 尚未開放","TEAM · COMING SOON"),0,-293,480,54,null,false,21);team.interactable=false;
            var settings=IconButton(menu.transform,"Settings",AstralGraphic.Shape.Gear,-207,-385,66,()=>{lobby.ActiveControlPanel(false);lobby.ActiveSettingUI(true);});
            settings.gameObject.AddComponent<AstralHover>().content=()=>L("設定","Settings");
            var tutorial=IconButton(menu.transform,"Tutorial",AstralGraphic.Shape.Book,-123,-385,66,()=>lobby.WatchTutorial());
            tutorial.gameObject.AddComponent<AstralHover>().content=()=>L("遊玩教學","How to play");
            var quit=IconButton(menu.transform,"Quit",AstralGraphic.Shape.Exit,-39,-385,66,()=>lobby.ExitGame());
            quit.gameObject.AddComponent<AstralHover>().content=()=>L("離開遊戲","Quit game");
            CurrencyRow(menu.transform,150,-385,false);
        }
        void ModeCard(Transform parent,string name,string title,string desc,float x,float y,UnityEngine.Events.UnityAction action,AstralGraphic.Shape symbol)
        {
            var b=Button(parent,name,"",x,y,480,126,action,false);
            var icon=Graphic(b.transform,"Mode icon",-188,0,54,54,symbol,Gold);icon.thickness=2.6f;
            Text(b.transform,"Title",title,38,21,330,44,31,Pearl);
            Text(b.transform,"Description",desc,38,-25,330,40,20,Muted);
        }
        string PartName(int index)=>index==0?L("頭部","HEAD"):index==1?L("身體","BODY"):L("背部","BACK");
        void BuildCollection(bool choosing)
        {
            Header(choosing?L("選擇技能","CHOOSE A SKILL"):L("收 藏","COLLECTION"),choosing?L("選擇已擁有的技能，加入本次對決配裝。","Select an owned skill for your loadout."):"",()=>{if(choosing)challenge.ActiveSelectUI(false);else Home();});
            var data=FeatureData.GetAllFeatureDatas((FeaturePart)part);
            if(selected==null||selected.MyFeaturePart!=(FeaturePart)part)selected=data.FirstOrDefault();
            for(int i=0;i<3;i++){int tab=i;Button(page,"Part "+i,PartName(i),-708+i*350,302,330,60,()=>{part=tab;selected=null;Refresh();},part==i,25);}
            var scroll=Scroll(page,"Skill grid",-356,-80,1080,660,out var content);
            int rows=Mathf.CeilToInt(data.Count/4f);content.sizeDelta=new Vector2(0,Mathf.Max(660,rows*180));
            int n=0;
            foreach(var feature in data)
            {
                var f=feature;int col=n%4,row=n/4;float x=-390+col*260,y=-90-row*180;
                var card=Button(content,"Skill "+f.ID,"",x,y,244,164,()=>{selected=f;BuildDetail(choosing);},false);
                card.GetComponent<RectTransform>().anchorMin=card.GetComponent<RectTransform>().anchorMax=new Vector2(.5f,1);
                Graphic(card.transform,"Halo",0,20,110,110,AstralGraphic.Shape.Orbit,new Color(Gold.r,Gold.g,Gold.b,.3f));
                var icon=Image(card.transform,"Original icon",0,20,98,98,f.IconSprite,Color.white);
                Text(card.transform,"Name",f.Name,0,-39,224,36,22,Pearl,TextAnchor.MiddleCenter);
                var status=Text(card.transform,"Ownership","",0,-67,220,26,17,Muted,TextAnchor.MiddleCenter);
                live.Add(()=>{status.text=f.Owned?L("已擁有","OWNED"):f.SoldType==Currency.Star?"✦ "+f.Fee:f.Fee+" Kreds";icon.color=f.Owned?Color.white:new Color(.55f,.58f,.64f,1);});n++;
            }
            BuildDetail(choosing);
        }
        void BuildDetail(bool choosing)
        {
            if(TouchUI){BuildTouchDetail(choosing);return;}
            var old=page.Find("Skill detail");if(old){old.gameObject.SetActive(false);Destroy(old.gameObject);}
            if(selected==null)return;var f=selected;
            var box=Plate(page,"Skill detail",574,-80,620,680).transform;
            Graphic(box,"Halo",0,203,235,235,AstralGraphic.Shape.Orbit,Gold);
            Image(box,"Original icon",0,204,180,180,f.IconSprite,Color.white);
            Text(box,"Name",f.Name,0,49,540,68,40,Pearl,TextAnchor.MiddleCenter);
            Text(box,"Type",PartName((int)f.MyFeaturePart)+"  /  "+L("技能","SKILL"),0,-10,530,42,21,Gold,TextAnchor.MiddleCenter);
            Graphic(box,"Rule",0,-55,500,2,AstralGraphic.Shape.Rule,new Color(Gold.r,Gold.g,Gold.b,.4f));
            Scroll(box,"Description",0,-148,530,158,out var descContent);
            var desc=Text(descContent,"Text",f.Description,0,-80,490,154,25,Muted,TextAnchor.UpperLeft);desc.rectTransform.anchorMin=desc.rectTransform.anchorMax=new Vector2(.5f,1);
            float h=Mathf.Max(142,desc.preferredHeight);desc.rectTransform.sizeDelta=new Vector2(490,h);desc.rectTransform.anchoredPosition=new Vector2(0,-h*.5f);descContent.sizeDelta=new Vector2(0,h+8);
            var action=Button(box,"Use skill","",0,-277,508,70,()=>
            {
                if(choosing){if(f.Owned){challenge.SetFeature(f);challenge.ActiveSelectUI(false);selected=null;}}
                else if(!f.Owned)
                {var item=lobby.GetComponentsInChildren<PurchaseItem>(true).FirstOrDefault(x=>x.MyFeatureData==f);if(item)item.Purchase();}
            },true,25);
            var label=action.GetComponentInChildren<Text>();
            // Detail can be replaced independently of the page; remove dead bindings safely.
            live.Add(()=>{if(!action)return;action.interactable=choosing?f.Owned:!f.Owned;label.text=choosing?(f.Owned?L("裝備此技能","EQUIP SKILL"):L("尚未擁有","NOT OWNED")):f.Owned?L("已擁有","OWNED"):L("解鎖 · ","UNLOCK · ")+(f.SoldType==Currency.Star?"✦ "+f.Fee:f.Fee+" Kreds");});
        }
        void BuildLoadout()
        {
            bool searching=CurrentView=="matching",versus=CurrentView=="versus";
            Header(versus?L("對手已就緒","OPPONENT READY"):searching?L("正在尋找對手","FINDING AN OPPONENT"):L("頂尖對決","CHALLENGE"),versus?L("準備進入對戰。","Preparing the match."):searching?L("正在配對，請稍候…","Finding a match…"):L("五項技能，一場對決。點選欄位調整配裝。","Five skills. One duel. Select a slot to change your loadout."),searching||versus?(System.Action)null:Home);
            var features=Field<FeatureData[]>(challenge,"P1Features");
            Text(page,"Player",MyPlayer.Name,0,178,1300,64,34,Gold,TextAnchor.MiddleCenter);
            for(int i=0;i<5;i++)
            {
                int slot=i;var f=features!=null&&i<features.Length?features[i]:null;
                var card=Button(page,"Loadout "+i,"",-676+i*338,versus?40:-20,308,versus?190:330,()=>{challenge.SetSelectIndex(slot);part=f!=null?(int)f.MyFeaturePart:0;selected=f;challenge.ActiveSelectUI(true);});card.interactable=!searching&&!versus;
                Graphic(card.transform,"Halo",0,versus?18:48,versus?135:200,versus?135:200,AstralGraphic.Shape.Orbit,new Color(Gold.r,Gold.g,Gold.b,.6f));
                if(f!=null)Image(card.transform,"Icon",0,versus?18:48,versus?95:142,versus?95:142,f.IconSprite,Color.white);
                Text(card.transform,"Name",f?.Name??"—",0,versus?-65:-77,270,55,24,Pearl,TextAnchor.MiddleCenter);
                if(!versus)Text(card.transform,"Slot",L("技能欄位 ","SLOT ")+(i+1),0,-132,270,34,18,Muted,TextAnchor.MiddleCenter);
            }
            if(versus)
            {
                Text(page,"Versus","V S",0,-111,700,60,36,Gold,TextAnchor.MiddleCenter,true);
                Text(page,"Opponent",ChallengeUI.P2NameString??"",0,-171,1200,46,30,Pearl,TextAnchor.MiddleCenter);
                for(int i=0;i<5;i++)
                {var f=ChallengeUI.P2Features!=null?ChallengeUI.P2Features[i]:null;var p=Plate(page,"Opponent slot "+i,-676+i*338,-293,308,160);if(f!=null){Image(p.transform,"Icon",0,22,100,100,f.IconSprite,Color.white);Text(p.transform,"Name",f.Name,0,-53,275,42,22,Pearl,TextAnchor.MiddleCenter);}}
            }
            else if(searching)Button(page,"Cancel matchmaking",L("取消配對","CANCEL SEARCH"),0,-317,510,78,()=>challenge.CancelChallenge());
            else Button(page,"Start matchmaking",L("開始配對","FIND OPPONENT"),0,-317,510,78,()=>challenge.Connect(),true,30);
        }
    }
}
