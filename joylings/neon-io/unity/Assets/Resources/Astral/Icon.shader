Shader "UI/Astral Icon"
{
    Properties
    {
        [PerRendererData] _MainTex("Icon",2D)="white"{}
        _StencilComp("Stencil Comparison",Float)=8
        _Stencil("Stencil ID",Float)=0
        _StencilOp("Stencil Operation",Float)=0
        _StencilWriteMask("Stencil Write Mask",Float)=255
        _StencilReadMask("Stencil Read Mask",Float)=255
        _ColorMask("Color Mask",Float)=15
    }
    SubShader
    {
        Tags {"Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "CanUseSpriteAtlas"="True"}
        Stencil {Ref [_Stencil] Comp [_StencilComp] Pass [_StencilOp] ReadMask [_StencilReadMask] WriteMask [_StencilWriteMask]}
        Cull Off Lighting Off ZWrite Off ZTest [unity_GUIZTestMode]
        Blend SrcAlpha OneMinusSrcAlpha
        ColorMask [_ColorMask]
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_local _ UNITY_UI_CLIP_RECT
            #include "UnityCG.cginc"
            #include "UnityUI.cginc"
            struct appdata {float4 vertex:POSITION;float2 uv:TEXCOORD0;fixed4 color:COLOR;};
            struct v2f {float4 vertex:SV_POSITION;float2 uv:TEXCOORD0;fixed4 color:COLOR;float4 local:TEXCOORD1;};
            sampler2D _MainTex;float4 _ClipRect;
            v2f vert(appdata v){v2f o;o.local=v.vertex;o.vertex=UnityObjectToClipPos(v.vertex);o.uv=v.uv;o.color=v.color;return o;}
            fixed4 frag(v2f i):SV_Target
            {
                fixed4 art=tex2D(_MainTex,i.uv);float ink=smoothstep(.27,.72,max(art.r,max(art.g,art.b)));
                fixed4 col=fixed4(lerp(float3(.08,.12,.20),float3(.9,.79,.55),ink),art.a)*i.color;
                #ifdef UNITY_UI_CLIP_RECT
                col.a*=UnityGet2DClipping(i.local.xy,_ClipRect);
                #endif
                return col;
            }
            ENDCG
        }
    }
}
