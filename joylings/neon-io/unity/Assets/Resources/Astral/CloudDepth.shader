Shader "Neon/Astral/CloudDepth"
{
    Properties
    {
        [PerRendererData] _MainTex("Sprite",2D)="white"{}
        _Color("Tint",Color)=(1,1,1,1)
        _Fill("Flat fill",Color)=(.075,.12,.19,1)
        _Ink("Contour ink",Color)=(.68,.59,.39,1)
        _Opacity("Opacity",Float)=1
        [HideInInspector] _RendererColor("Renderer color",Color)=(1,1,1,1)
        [HideInInspector] _Flip("Flip",Vector)=(1,1,1,1)
        [PerRendererData] _AlphaTex("External alpha",2D)="white"{}
        [PerRendererData] _EnableExternalAlpha("External alpha enabled",Float)=0
    }
    SubShader
    {
        Tags {"Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent" "CanUseSpriteAtlas"="True"}
        Cull Off Lighting Off ZWrite Off
        Blend One OneMinusSrcAlpha
        Pass
        {
            CGPROGRAM
            #pragma vertex SpriteVert
            #pragma fragment CloudFrag
            #pragma target 2.0
            #pragma multi_compile_instancing
            #pragma multi_compile _ ETC1_EXTERNAL_ALPHA
            #include "UnitySprites.cginc"
            fixed4 _Fill, _Ink;
            float _Opacity;
            fixed4 CloudFrag(v2f IN):SV_Target
            {
                fixed4 tex=SampleSpriteTexture(IN.texcoord);
                // Preserve the original flat silhouette and fine line artwork, with two depth palettes.
                float inkWeight=smoothstep(.24,.40,max(tex.r,max(tex.g,tex.b)));
                fixed4 c=fixed4(lerp(_Fill.rgb,_Ink.rgb,inkWeight),tex.a*_Opacity)*IN.color;
                c.rgb*=c.a;
                return c;
            }
            ENDCG
        }
    }
}
