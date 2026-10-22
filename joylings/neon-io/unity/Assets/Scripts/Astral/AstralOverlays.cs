using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using Scoz.Func;
using Starbro.NeonIO;
using static Neon.Astral.AstralWidgets;

namespace Neon.Astral
{
    public sealed partial class AstralPresentation
    {
        void UpdatePopup()
        {
            if(!popup)return;
            string kind="",title="",message="";Book book=null;GameObject bookPage=null;
            // Confirmation has priority over tutorials and progress messages.
            if(Is(popup,"ConfirmCancelGo")){kind="confirm";message=PopupText("ConfrimCancelText");}
            else if(Is(popup,"ClickCancelGo")){kind="notice";message=PopupText("ClickCancel_Value");}
            else if(Is(popup,"ClickCancelTitleGo")){kind="titleNotice";title=PopupText("ClickCancelTitle");message=PopupText("ClickCancelValue");}
            else
            {
                var books=Field<System.Collections.Generic.List<Book>>(popup,"MyBooks");book=books?.FirstOrDefault(b=>b&&b.gameObject.activeInHierarchy);
                if(book){kind="book";bookPage=book.PageList?.FirstOrDefault(p=>p&&p.activeSelf);message=(bookPage?bookPage.name:"")+"/"+(book.PageText?book.PageText.text:"");}
                else if(Is(popup,"LoadingTitleGo")){kind="loading";title=PopupText("LoadingTitle");message=PopupText("LoadingValue");}
                else if(Is(popup,"LoadingGo")){kind="loading";message=PopupText("Loading_Value");}
                else if(Is(popup,"RestartGo")){kind="restart";message=PopupText("Restart_Value");}
            }
            string key=kind+"/"+title+"/"+message+"/"+MyPlayer.UseLanguage;
            if(key==popupKey)return;popupKey=key;Clear(modal);ShowTooltip(null);
            if(kind=="")return;
            var shade=Scrim(modal,"Modal shade",new Color(.02f,.03f,.065f,.9f));
            if(kind=="book"){BuildBook(shade.transform,book,bookPage);return;}
            // Size the message area to its actual text; long messages still scroll.
            var box=Plate(shade.transform,"Dialog",0,0,1000,400).transform;
            var measure=Text(box,"Measure",message,0,0,852,600,28);
            float messageHeight=Mathf.Clamp(measure.preferredHeight+28,92,360);
            Destroy(measure.gameObject);
            float height=messageHeight+236;
            ((RectTransform)box).sizeDelta=new Vector2(1000,height);
            Text(box,"Title",string.IsNullOrEmpty(title)?kind=="confirm"?L("確認操作","CONFIRM"):kind=="loading"?L("正在處理","PLEASE WAIT"):L("提示","NOTICE"):title,0,height*.5f-57,880,62,34,Gold,TextAnchor.MiddleLeft);
            Scroll(box,"Message",0,8,880,messageHeight,out var c);
            var text=Text(c,"Content",message,0,-messageHeight*.5f,830,messageHeight,28,Pearl,TextAnchor.UpperLeft);text.rectTransform.anchorMin=text.rectTransform.anchorMax=new Vector2(.5f,1);
            float h=Mathf.Max(messageHeight,text.preferredHeight+10);text.rectTransform.sizeDelta=new Vector2(830,h);text.rectTransform.anchoredPosition=new Vector2(0,-h*.5f);c.sizeDelta=new Vector2(0,h);
            float buttonY=-height*.5f+62;
            if(kind=="confirm")
            {Button(box,"Cancel dialog",L("取消","CANCEL"),-230,buttonY,420,68,()=>popup.Cancel(),false,26);Button(box,"Confirm dialog",L("確定","CONFIRM"),230,buttonY,420,68,()=>popup.Confirm(),true,26);}
            else if(kind!="loading")Button(box,"Close dialog",L("我知道了","CONTINUE"),0,buttonY,590,68,()=>{if(kind=="notice")popup.HidewClickCancel();else if(kind=="titleNotice")popup.HidekCancelTitle();else {var g=Field<GameObject>(popup,"RestartGo");if(g)g.SetActive(false);}},true,26);
            else Text(box,"Progress",L("連線與載入中，請稍候…","Connecting and loading…"),0,buttonY,850,66,24,Muted,TextAnchor.MiddleCenter);
        }
        string PopupText(string field){var t=Field<Text>(popup,field);return t?t.text:"";}
        void BuildBook(Transform parent,Book book,GameObject bookPage)
        {
            var box=Plate(parent,"Tutorial",0,0,1600,930).transform;
            Text(box,"Title",L("遊玩教學","HOW TO PLAY"),-340,373,760,90,48,Gold);
            Button(box,"Close tutorial",L("關閉教學","CLOSE GUIDE"),588,381,290,62,()=>book.OpenBook(false),false,23);
            Graphic(box,"Rule",0,302,1460,2,AstralGraphic.Shape.Rule,Gold);
            Scroll(box,"Guide text",275,12,855,506,out var c);
            var original=bookPage?bookPage.GetComponentsInChildren<Text>(false).Where(t=>!t.GetComponentInParent<Button>()&&!string.IsNullOrWhiteSpace(t.text)).Select(t=>t.text).Distinct().ToArray():new string[0];
            string value=string.Join("\n\n",original);
            if(bookPage)
            {
                var localized=bookPage.GetComponentsInChildren<MyText>();var names=localized.FirstOrDefault(t=>t.UIString=="Buffer");var descriptions=localized.FirstOrDefault(t=>t.UIString=="BufferDescription");
                if(names&&descriptions)
                {
                    var labels=names.text.Split('\n');var details=descriptions.text.Split('\n');var rows=labels.Select((label,i)=>label.Trim().TrimEnd(':','：')+"："+(i<details.Length?details[i]:""));
                    value=string.Join("\n\n",original.Where(s=>s!=names.text&&s!=descriptions.text))+"\n\n"+string.Join("\n\n",rows);
                }
            }
            if(string.IsNullOrWhiteSpace(value))value=L("移動滑鼠引導角色，收集星星並取得技能。技能會依原有規則自動施放。\n\n在收藏中解鎖技能，再於頂尖對決選擇五項技能出戰。","Guide your character with the mouse. Collect stars and skills. Skills activate automatically.\n\nUnlock skills in Collection, then choose five for Challenge.");
            var text=Text(c,"Guide content",value,0,-240,790,480,30,Pearl,TextAnchor.UpperLeft);text.rectTransform.anchorMin=text.rectTransform.anchorMax=new Vector2(.5f,1);float h=Mathf.Max(480,text.preferredHeight+20);text.rectTransform.sizeDelta=new Vector2(790,h);text.rectTransform.anchoredPosition=new Vector2(0,-h*.5f);c.sizeDelta=new Vector2(0,h);
            Graphic(box,"Guide orbit",-474,24,440,440,AstralGraphic.Shape.Orbit,Gold);
            var f=FeatureData.GetAllFeatureDatas().FirstOrDefault(x=>x.MyFeaturePart==Starbro.NeonIO.FeaturePart.Body&&x.Owned);
            if(f!=null)Image(box,"Original guardian",-474,24,245,345,f.IconSprite,Color.white);
            Button(box,"Previous page",L("‹  上一頁","‹  PREVIOUS"),-465,-380,390,70,()=>book.PreviousPage()).interactable=book.LeftArrow&&book.LeftArrow.activeSelf;
            Text(box,"Page",book.PageText?book.PageText.text:"",0,-380,410,60,28,Gold,TextAnchor.MiddleCenter);
            Button(box,"Next page",L("下一頁  ›","NEXT  ›"),465,-380,390,70,()=>book.NextPage(),true).interactable=book.RightArrow&&book.RightArrow.activeSelf;
        }
    }
}
