using System;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Neon.Astral
{
    public static class AstralWidgets
    {
        public static readonly Color Night = Hex("10172D"), Panel = Hex("18223A"), Deep = Hex("0B1121"), Gold = Hex("C7AD70"), Pearl = Hex("ECE8DA"), Muted = Hex("A6B0C5"), Teal = Hex("91C8CA"), Red = Hex("D98985");
        static Font body, title;
        public static Font Body => body ? body : body = Resources.Load<Font>("Astral/Fonts/NotoSansTC-Medium") ?? Resources.Load<Font>("Font/NotoSansCJKtc-Black");
        public static Font Title => title ? title : title = Resources.Load<Font>("Astral/Fonts/Cinzel-SemiBold") ?? Body;
        public static Color Hex(string h){ColorUtility.TryParseHtmlString("#"+h,out var c);return c;}
        public static RectTransform Rect(Transform parent,string name,float x,float y,float w,float h)
        {
            var r=new GameObject(name,typeof(RectTransform)).GetComponent<RectTransform>();r.SetParent(parent,false);
            r.anchorMin=r.anchorMax=new Vector2(.5f,.5f);r.pivot=new Vector2(.5f,.5f);r.anchoredPosition=new Vector2(x,y);r.sizeDelta=new Vector2(w,h);return r;
        }
        public static void Stretch(RectTransform r,float margin=0){r.anchorMin=Vector2.zero;r.anchorMax=Vector2.one;r.offsetMin=Vector2.one*margin;r.offsetMax=Vector2.one*-margin;}
        public static AstralGraphic Graphic(Transform parent,string name,float x,float y,float w,float h,AstralGraphic.Shape shape,Color color,bool block=false)
        {
            var g=Rect(parent,name,x,y,w,h).gameObject.AddComponent<AstralGraphic>();g.shape=shape;g.color=color;g.raycastTarget=block;return g;
        }
        public static AstralGraphic Plate(Transform p,string name,float x,float y,float w,float h,bool primary=false,bool block=false)
        {
            var g=Graphic(p,name,x,y,w,h,AstralGraphic.Shape.Plate,primary?Gold:Panel,block);g.border=primary?Pearl:new Color(Gold.r,Gold.g,Gold.b,.55f);return g;
        }
        public static Image Image(Transform parent,string name,float x,float y,float w,float h,Sprite sprite,Color color)
        {
            var g=Rect(parent,name,x,y,w,h).gameObject.AddComponent<Image>();g.sprite=AstralIcons.Crop(sprite);if(g.sprite!=sprite)g.material=AstralIcons.Material;g.color=color;g.preserveAspect=sprite;g.raycastTarget=false;return g;
        }
        public static Text Text(Transform p,string name,string value,float x,float y,float w,float h,int size=28,Color? color=null,TextAnchor align=TextAnchor.MiddleLeft,bool serif=false)
        {
            var t=Rect(p,name,x,y,w,h).gameObject.AddComponent<Text>();t.font=serif?Title:Body;t.text=value;t.color=color??Pearl;t.fontSize=size;t.alignment=align;t.raycastTarget=false;
            t.horizontalOverflow=HorizontalWrapMode.Wrap;t.verticalOverflow=VerticalWrapMode.Truncate;t.supportRichText=true;return t;
        }
        public static Button Button(Transform p,string name,string label,float x,float y,float w,float h,UnityAction action,bool primary=false,int size=28)
        {
            var g=Plate(p,name,x,y,w,h,primary,true);g.ornament=0;var b=g.gameObject.AddComponent<Button>();b.targetGraphic=g;b.transition=Selectable.Transition.None;
            var t=Text(g.transform,"Label",label,0,0,w-36,h-8,size,primary?Night:Pearl,TextAnchor.MiddleCenter);
            var state=g.gameObject.AddComponent<AstralButtonState>();state.face=g;state.label=t;state.primary=primary;
            if(action!=null)b.onClick.AddListener(action);
            return b;
        }
        public static InputField Input(Transform p,string name,string value,string placeholder,float x,float y,float w,float h,UnityAction<string> changed,int max=32)
        {
            var g=Plate(p,name,x,y,w,h,false,true);g.ornament=0;
            var field=g.gameObject.AddComponent<InputField>();field.targetGraphic=g;field.characterLimit=max;
            field.textComponent=Text(g.transform,"Text","",0,0,w-38,h-12,26,Pearl);
            field.placeholder=Text(g.transform,"Placeholder",placeholder,0,0,w-38,h-12,26,Muted);
            field.text=value??"";field.caretColor=Gold;field.customCaretColor=true;field.selectionColor=new Color(Gold.r,Gold.g,Gold.b,.3f);
            if(changed!=null)field.onValueChanged.AddListener(changed);
            return field;
        }
        public static Image Scrim(Transform parent,string name,Color color)
        {
            var g=Image(parent,name,0,0,1920,1080,null,color);g.raycastTarget=true;g.gameObject.AddComponent<AstralViewportFill>();return g;
        }
        public static ScrollRect Scroll(Transform p,string name,float x,float y,float w,float h,out RectTransform content)
        {
            var root=Rect(p,name,x,y,w,h);var bg=root.gameObject.AddComponent<Image>();bg.color=new Color(.025f,.04f,.08f,.3f);
            var viewport=Rect(root,"Viewport",0,0,w-18,h);viewport.gameObject.AddComponent<RectMask2D>();
            content=Rect(viewport,"Content",0,0,w-30,h);content.anchorMin=new Vector2(0,1);content.anchorMax=new Vector2(1,1);content.pivot=new Vector2(.5f,1);content.anchoredPosition=Vector2.zero;content.sizeDelta=new Vector2(0,h);
            var scroll=root.gameObject.AddComponent<ScrollRect>();scroll.viewport=viewport;scroll.content=content;scroll.horizontal=false;scroll.vertical=true;scroll.movementType=ScrollRect.MovementType.Clamped;scroll.scrollSensitivity=55;
            var rail=Rect(root,"Scrollbar",w*.5f-5,0,5,h);var railImage=rail.gameObject.AddComponent<Image>();railImage.color=new Color(Gold.r,Gold.g,Gold.b,.12f);
            var bar=rail.gameObject.AddComponent<Scrollbar>();bar.direction=Scrollbar.Direction.BottomToTop;
            var handle=Rect(rail,"Handle",0,0,5,70);Stretch(handle);var hi=handle.gameObject.AddComponent<Image>();hi.color=Gold;bar.handleRect=handle;bar.targetGraphic=hi;scroll.verticalScrollbar=bar;scroll.verticalScrollbarVisibility=ScrollRect.ScrollbarVisibility.AutoHide;
            if(Neon.Networking.NeonWebBridge.TouchLayout){bar.interactable=false;bar.enabled=false;railImage.raycastTarget=false;hi.raycastTarget=false;}
            return scroll;
        }
        public static Slider Slider(Transform p,string name,float value,float x,float y,float w,UnityAction<float> changed)
        {
            var r=Rect(p,name,x,y,w,44);var slider=r.gameObject.AddComponent<Slider>();
            var hit=r.gameObject.AddComponent<Image>();hit.color=Color.clear;hit.raycastTarget=true;
            var bg=Image(r,"Track",0,0,w,6,null,new Color(Gold.r,Gold.g,Gold.b,.2f));bg.raycastTarget=true;
            var area=Rect(r,"Fill area",0,0,w,6);var fill=Image(area,"Fill",0,0,w,6,null,Gold);Stretch(fill.rectTransform);slider.fillRect=fill.rectTransform;
            var handleArea=Rect(r,"Handle area",0,0,w,44);var handle=Graphic(handleArea,"Handle",0,0,25,25,AstralGraphic.Shape.Star,Pearl,true);slider.handleRect=handle.rectTransform;slider.targetGraphic=handle;
            slider.value=value;if(changed!=null)slider.onValueChanged.AddListener(changed);return slider;
        }
        public static void Clear(Transform p){foreach(Transform t in p){t.gameObject.SetActive(false);UnityEngine.Object.Destroy(t.gameObject);}}
    }
    public sealed class AstralViewportFill : MonoBehaviour
    {
        void LateUpdate(){var r=(RectTransform)transform;var scale=r.lossyScale;r.sizeDelta=new Vector2(Screen.width/Mathf.Max(.001f,scale.x),Screen.height/Mathf.Max(.001f,scale.y));}
    }
    public sealed class AstralButtonState : MonoBehaviour,IPointerEnterHandler,IPointerExitHandler,ISelectHandler,IDeselectHandler
    {
        public AstralGraphic face;public Text label;public bool primary;bool hover,focus;bool? last;bool lastHover;
        void Update(){var b=GetComponent<Selectable>();bool enabled=b&&b.IsInteractable();bool hot=hover||focus;if(last==enabled&&lastHover==hot)return;last=enabled;lastHover=hot;
            face.color=primary?(enabled?(hot?AstralWidgets.Pearl:AstralWidgets.Gold):new Color(.35f,.34f,.31f,1)):(hot&&enabled?new Color(.17f,.22f,.32f,1):AstralWidgets.Panel);
            face.border=new Color(AstralWidgets.Gold.r,AstralWidgets.Gold.g,AstralWidgets.Gold.b,enabled?(hot?1:.6f):.22f);face.SetVerticesDirty();
            if(label)label.color=primary?AstralWidgets.Night:(enabled?AstralWidgets.Pearl:AstralWidgets.Muted*.75f);
        }
        public void OnPointerEnter(PointerEventData e){hover=true;}public void OnPointerExit(PointerEventData e){hover=false;}
        public void OnSelect(BaseEventData e){focus=true;}public void OnDeselect(BaseEventData e){focus=false;}
    }
    public sealed class AstralHover : MonoBehaviour,IPointerEnterHandler,IPointerExitHandler,IPointerDownHandler,IPointerUpHandler
    {
        public Func<string> content;int? touchPointer;
        void Show(){if(content!=null)AstralPresentation.Instance?.ShowTooltip(content());}
        void Hide(){touchPointer=null;AstralPresentation.Instance?.ShowTooltip(null);}
        // A released touch can leave an emulated mouse over newly created HUD elements.
        // Mobile descriptions require a real press; desktop descriptions retain hover.
        public void OnPointerEnter(PointerEventData e){if(!Neon.Networking.NeonWebBridge.TouchLayout)Show();}
        public void OnPointerDown(PointerEventData e){if(Neon.Networking.NeonWebBridge.TouchLayout&&Neon.Networking.NeonWebBridge.InputAvailable&&!AstralPresentation.InputBlocked){touchPointer=e.pointerId;Show();}}
        public void OnPointerUp(PointerEventData e){if(touchPointer==e.pointerId)Hide();}
        public void OnPointerExit(PointerEventData e){if(!Neon.Networking.NeonWebBridge.TouchLayout||touchPointer==e.pointerId)Hide();}
        void OnDisable(){Hide();}
    }
}
