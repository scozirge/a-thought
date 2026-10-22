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
        void BuildSettings(string section)
        {
            Header(L("設 定","SETTINGS"),"",Home);
            string[] tabs={L("一般設定","GENERAL"),L("喊話設定","SHOUTS"),L("製作名單","CREDITS")};
            for(int i=0;i<3;i++){int tab=i;Button(page,"Settings tab "+i,tabs[i],-595+i*595,302,570,60,()=>lobby.SetSettingCurrentTab(tab),section==(i==0?"settings":i==1?"clamor":"credits"),25);}
            if(section=="clamor"){BuildClamor();return;}
            if(section=="credits")
            {
                Scroll(page,"Credits",0,-80,1680,660,out var c);
                var source=Field<GameObject[]>(lobby,"SettingSubObjs")[2];
                var lines=source.GetComponentsInChildren<Text>(true).Where(t=>!t.GetComponentInParent<Button>()&&!string.IsNullOrWhiteSpace(t.text)).Select(t=>t.text).Distinct();
                var text=Text(c,"Original credits",string.Join("\n\n",lines),0,-240,1520,480,27,Pearl,TextAnchor.UpperCenter);
                text.rectTransform.anchorMin=text.rectTransform.anchorMax=new Vector2(.5f,1);float height=Mathf.Max(480,text.preferredHeight+20);text.rectTransform.sizeDelta=new Vector2(1520,height);text.rectTransform.anchoredPosition=new Vector2(0,-height*.5f);c.sizeDelta=new Vector2(0,height);return;
            }
            Plate(page,"Preferences",0,-80,1740,660);
            Text(page,"Audio label",L("聲音","AUDIO"),-760,92,180,42,24,Gold);
            SettingSlider("MusicSlider",L("音樂音量","Music volume"),-5,70);
            SettingSlider("SoundSlider",L("音效音量","Sound volume"),-5,-16);
            SettingChoice("BattleSongDropDown",L("戰鬥音樂","Battle music"),-5,-102);
            SettingChoice("LanguageDropDown",L("語言","Language"),-5,-188);
            SettingChoice("RegionDropDown",L("連線地區","Connection region"),-5,-274);
            Text(page,"Settings hint",L("地區設定會套用至下一次連線。","Region applies to your next connection."),-610,-347,420,60,20,Muted);
            Button(page,"Fullscreen",L("切換全螢幕","FULLSCREEN"),-655,-33,305,62,()=>lobby.FullScreen(),false,23);
            Button(page,"Tutorial",L("遊玩教學","HOW TO PLAY"),-655,-120,305,62,()=>lobby.WatchTutorial(),false,23);
        }
        void SettingSlider(string field,string label,float x,float y)
        {
            var source=Field<Slider>(lobby,field);Text(page,field+" label",label,x+50,y,380,52,27);
            Slider(page,field,source?source.value:1,x+580,y,370,v=>{if(source)source.value=v;});
        }
        void SettingChoice(string field,string label,float x,float y)
        {
            var source=Field<Dropdown>(lobby,field);Text(page,field+" label",label,x+50,y,380,52,27);
            var b=Button(page,field,"",x+580,y,390,60,()=>OpenChoices(source),false,22);
            var t=b.GetComponentInChildren<Text>();live.Add(()=>{if(source&&source.options.Count>0)t.text=source.options[source.value].text+"  ▾";});
        }
        void OpenChoices(Dropdown source)
        {
            if(TouchUI){OpenTouchChoices(source);return;}
            if(!source)return;var shade=Scrim(page,"Choice overlay",new Color(0,0,0,.82f));
            var panel=Plate(shade.transform,"Choices",0,0,800,850).transform;
            Button(panel,"Close choices",L("關閉","CLOSE"),250,355,220,55,()=>Destroy(shade.gameObject),false,22);
            Text(panel,"Choose title",L("選擇設定","SELECT OPTION"),-160,355,400,65,30,Gold);
            Scroll(panel,"Options",0,-40,730,650,out var c);c.sizeDelta=new Vector2(0,Mathf.Max(650,source.options.Count*78));
            for(int i=0;i<source.options.Count;i++)
            {int index=i;var b=Button(c,"Option "+i,source.options[i].text,0,-40-i*78,670,65,()=>{source.value=index;Destroy(shade.gameObject);},i==source.value,25);b.GetComponent<RectTransform>().anchorMin=b.GetComponent<RectTransform>().anchorMax=new Vector2(.5f,1);}
        }
        void BuildClamor()
        {
            var controller=lobby.GetComponentInChildren<ClamorUI>(true);if(!controller)return;
            var sourceItems=controller.GetComponentsInChildren<ClamorItem>(true).Where(i=>i.gameObject.activeInHierarchy).ToArray();
            Scroll(page,"Shout list",-155,-75,1420,660,out var c);c.sizeDelta=new Vector2(0,Mathf.Max(660,sourceItems.Length*98));
            for(int i=0;i<sourceItems.Length;i++)
            {
                var item=sourceItems[i];float y=-49-i*98;
                var row=Rect(c,"Shout "+i,0,y,1350,100);row.anchorMin=row.anchorMax=new Vector2(.5f,1);
                Text(row,"Trigger",item.NameText.text,-482,0,355,84,22,Gold);
                var input=Input(row,"Message",item.ContentInput.text,L("輸入喊話內容","Enter your shout"),100,0,750,68,v=>{item.ContentInput.text=v;item.SaveContentChange(v);},item.ContentInput.characterLimit>0?item.ContentInput.characterLimit:80);
                input.interactable=item.ContentInput.interactable;
                var unlock=Button(row,"Unlock",L("解鎖","UNLOCK"),570,0,155,64,()=>item.Purchase(),false,20);
                live.Add(()=>{input.interactable=item.ContentInput.interactable;unlock.gameObject.SetActive(!input.interactable&&item.MyFeatureData==null);});
            }
            for(int i=0;i<3;i++)
            {int p=i;Button(page,"Unlock shout "+i,PartName(i)+L("喊話解鎖"," SHOUTS"),726,195-i*88,280,66,()=>controller.PurchaseSpellClamor(p),false,21);}
            var save=Button(page,"Save shouts",L("儲存喊話","SAVE SHOUTS"),713,-305,300,74,()=>controller.Save(),true,25);
            var countdown=Text(page,"Save countdown","",713,-376,300,44,22,Muted,TextAnchor.MiddleCenter);
            var oldButton=Field<Button>(controller,"SaveBtn");var oldCountdown=Field<Text>(controller,"CoutDownText");
            live.Add(()=>{save.interactable=oldButton&&oldButton.interactable;countdown.text=oldCountdown&&oldCountdown.gameObject.activeInHierarchy?oldCountdown.text:"";});
        }
    }
}
