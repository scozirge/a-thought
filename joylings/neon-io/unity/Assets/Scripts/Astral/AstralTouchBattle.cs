using UnityEngine;
using static Neon.Astral.AstralWidgets;

namespace Neon.Astral
{
    public sealed partial class AstralPresentation
    {
        void BuildTouchBattle()
        {
            bool compact=ViewHeight<330;
            float stickSize=compact?100:116,bottom=compact?24:28;
            var stick=Graphic(page,"Touch joystick",0,0,stickSize,stickSize,AstralGraphic.Shape.Disc,HudColor(Night,.14f),true);
            stick.thickness=1;stick.border=HudColor(Teal,.32f);
            Pin(stick.transform,Vector2.zero,new Vector2(32,bottom));
            var knob=Graphic(stick.transform,"Thumb",0,0,compact?42:48,compact?42:48,AstralGraphic.Shape.Disc,HudColor(Teal,.42f));
            knob.border=HudColor(Pearl,.52f);knob.thickness=1;
            var controller=stick.gameObject.AddComponent<NeonTouchStick>();controller.knob=knob.rectTransform;controller.radius=(stickSize-knob.rectTransform.rect.width)*.48f;
            BuildBattleHud(true,bottom+stickSize+12);
        }
    }
}
