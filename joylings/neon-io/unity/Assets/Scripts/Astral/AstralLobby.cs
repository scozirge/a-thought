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
            // The original lobby scene supplies the guardian, meteors and entrance burst.
            // A quiet panel supports readable controls without covering that presentation.
            var menu=Plate(page,"Menu backing",-555,-20,650,970);menu.color=new Color(Night.r,Night.g,Night.b,.87f);menu.border=new Color(Gold.r,Gold.g,Gold.b,.26f);menu.ornament=0;
            balance=Text(page,"Stars","",535,468,300,45,25,Gold,TextAnchor.MiddleRight);
            Button(page,"Settings",L("設定","SETTINGS"),780,468,150,54,()=>{lobby.ActiveControlPanel(false);lobby.ActiveSettingUI(true);},false,22);
            Text(page,"NEON","NEON",-555,335,600,135,90,Pearl,TextAnchor.MiddleCenter,true);
            Text(page,"IMPACT","IMPACT",-555,230,600,135,85,Gold,TextAnchor.MiddleCenter,true);
            var original=Field<InputField>(lobby,"NameInputField");
            var nameInput=Input(page,"Player name",original?original.text:MyPlayer.Name,L("輸入玩家名稱","Your name"),-555,105,550,62,v=>{if(original)original.text=v;},24);
            nameInput.onEndEdit.AddListener(v=>{if(!string.IsNullOrWhiteSpace(v))MyPlayer.SetName(v.Trim());});
            ModeCard("Infinity",L("無際戰場","INFINITY WAR"),L("收集星星，取得技能並生存。","Collect stars. Evolve your skills. Survive the arena."),-555,-30,()=>lobby.Connect(),true,"∞");
            ModeCard("Challenge",L("頂尖對決","CHALLENGE"),L("選擇五項技能出戰。","Choose five skills. Challenge an opponent."),-555,-185,()=>{if(original&&!string.IsNullOrWhiteSpace(original.text))MyPlayer.SetName(original.text.Trim());lobby.ActiveControlPanel(false);challenge.SetActive(true);},false,"II");
            Button(page,"Collection",L("收 藏","COLLECTION"),-555,-330,550,70,()=>{part=0;selected=null;lobby.ActiveControlPanel(false);lobby.ActiveShopUI(true);},false,26);
            var team=Button(page,"Team",L("組隊競技 · 尚未開放","TEAM · COMING SOON"),-555,-425,550,60,null,false,22);team.interactable=false;
            Button(page,"Quit",L("離開遊戲","QUIT"),786,-491,150,40,()=>lobby.ExitGame(),false,18);
        }
        void ModeCard(string name,string title,string desc,float x,float y,UnityEngine.Events.UnityAction action,bool primary,string mark)
        {
            var b=Button(page,name,"",x,y,550,128,action,primary);
            var c=primary?Night:Gold;Graphic(b.transform,"Medallion",-215,0,80,80,AstralGraphic.Shape.Orbit,c);
            Text(b.transform,"Symbol",mark,-215,0,70,65,40,c,TextAnchor.MiddleCenter,true);
            Text(b.transform,"Title",title,32,23,360,48,32,primary?Night:Pearl);
            Text(b.transform,"Description",desc,32,-25,360,44,20,primary?Night:Muted);
            Text(b.transform,"Arrow","›",239,0,30,65,42,c,TextAnchor.MiddleCenter);
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
