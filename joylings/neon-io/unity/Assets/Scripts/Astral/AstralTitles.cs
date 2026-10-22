using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using static Neon.Astral.AstralWidgets;

namespace Neon.Astral
{
    public sealed partial class AstralPresentation
    {
        static readonly Dictionary<string,string> titleKeys=new Dictionary<string,string>
        {
            {"星際遊俠","brand"},{"NOVAROVE","brand"},
            {"頂尖對決","duel"},{"CHALLENGE","duel"},{"無際戰場","infinity"},{"INFINITY WAR","infinity"},
            {"收藏","collection"},{"COLLECTION","collection"},{"選擇技能","skills"},{"CHOOSE A SKILL","skills"},
            {"設定","settings"},{"SETTINGS","settings"},{"正在尋找對手","matching"},{"FINDING AN OPPONENT","matching"},
            {"對手已就緒","ready"},{"OPPONENT READY","ready"},{"遊玩教學","tutorial"},{"HOW TO PLAY","tutorial"},
            {"確認操作","confirm"},{"CONFIRM","confirm"},{"提示","notice"},{"NOTICE","notice"},
            {"正在處理","processing"},{"PLEASE WAIT","processing"},{"選擇設定","options"},{"SELECT OPTION","options"}
        };
        readonly Dictionary<string,Sprite> titleSprites=new Dictionary<string,Sprite>();
        RectTransform TitleAt(Transform parent,string name,string title,float left,float y,float maxWidth,float height)
        {
            var art=TitleArt(parent,name,title,0,y,maxWidth,height);art.anchoredPosition=new Vector2(left+art.rect.width*.5f,y);return art;
        }
        RectTransform TitleArt(Transform parent,string name,string title,float x,float y,float maxWidth,float height)
        {
            string key;
            if(!titleKeys.TryGetValue(title.Replace(" ",""),out key)&&!titleKeys.TryGetValue(title,out key))
                return Text(parent,name,title,x,y,maxWidth,height,TouchUI?22:42,Gold).rectTransform;
            string resource=key+(Chinese?"-zh":"-en");
            if(!titleSprites.TryGetValue(resource,out var sprite))titleSprites[resource]=sprite=Resources.Load<Sprite>("Astral/Titles/"+resource);
            if(!sprite)return Text(parent,name,title,x,y,maxWidth,height,TouchUI?22:42,Gold).rectTransform;
            float width=Mathf.Min(maxWidth,height*sprite.rect.width/sprite.rect.height);
            var rect=Rect(parent,name,x,y,width,height);var image=rect.gameObject.AddComponent<Image>();
            image.sprite=sprite;image.preserveAspect=true;image.raycastTarget=false;
            return rect;
        }
        void CurrencyRow(Transform parent,float x,float y,bool touch)
        {
            // A real mesh star cannot disappear when the Chinese font is subsetted.
            float width=touch?108:150,height=touch?36:50;
            var row=Rect(parent,"Currency",x,y,width,height);
            var star=Graphic(row,"Currency star",-width*.5f+height*.3f,0,height*.44f,height*.44f,AstralGraphic.Shape.Star,Gold);
            balance=Text(row,"Stars","",height*.25f,0,width-height*.7f,height,touch?16:26,Gold,TextAnchor.MiddleLeft);
        }
    }
}
