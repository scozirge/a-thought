Shader "Neon/Faction/Sprite"
{
    Properties
    {
        [PerRendererData] _MainTex("Sprite",2D)="white"{}
        _Color("Tint",Color)=(1,1,1,1)
        [MaterialToggle] PixelSnap("Pixel snap",Float)=0
        [HideInInspector] _RendererColor("Renderer color",Color)=(1,1,1,1)
        [HideInInspector] _Flip("Flip",Vector)=(1,1,1,1)
        [PerRendererData] _AlphaTex("External alpha",2D)="white"{}
        [PerRendererData] _EnableExternalAlpha("External alpha enabled",Float)=0
        [PerRendererData] _NeonSide("Viewer side",Float)=0
    }
    SubShader
    {
        Tags {"Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent" "PreviewType"="Plane" "CanUseSpriteAtlas"="True"}
        Cull Off Lighting Off ZWrite Off
        Blend One OneMinusSrcAlpha
        Pass
        {
            CGPROGRAM
            #pragma vertex SpriteVert
            #pragma fragment FactionFrag
            #pragma target 2.0
            #pragma multi_compile_instancing
            #pragma multi_compile _ PIXELSNAP_ON
            #pragma multi_compile _ ETC1_EXTERNAL_ALPHA
            #include "UnitySprites.cginc"
            #include "Palette.cginc"
            float _NeonSide;
            fixed4 FactionFrag(v2f IN):SV_Target
            {
                fixed4 c=SampleSpriteTexture(IN.texcoord)*IN.color;
                c.rgb=NeonPalette(c.rgb,_NeonSide)*c.a;
                return c;
            }
            ENDCG
        }
    }
}
