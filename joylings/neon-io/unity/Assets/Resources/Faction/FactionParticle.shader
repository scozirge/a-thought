Shader "Neon/Faction/Particle"
{
    Properties
    {
        _MainTex("Texture",2D)="white"{}
        _Color("Tint",Color)=(1,1,1,1)
        _SrcBlend("Source blend",Float)=5
        _DstBlend("Destination blend",Float)=10
        _SourceMode("Original shader mode",Float)=0
        _SubRate("Subtractive rate",Float)=1
        _Intensity("Intensity",Float)=1
        _LegacyFactor("Legacy color factor",Float)=1
        _InvFade("Soft particles",Float)=1
        [PerRendererData] _NeonSide("Viewer side",Float)=0
    }
    SubShader
    {
        Tags {"Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent"}
        Cull Off Lighting Off ZWrite Off
        Blend [_SrcBlend] [_DstBlend]
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_particles
            #include "UnityCG.cginc"
            #include "Palette.cginc"
            sampler2D _MainTex;float4 _MainTex_ST,_Color;
            float _SourceMode,_NeonSide,_SubRate,_Intensity,_LegacyFactor,_InvFade;
            UNITY_DECLARE_DEPTH_TEXTURE(_CameraDepthTexture);
            struct appdata {float4 vertex:POSITION;float4 color:COLOR;float2 uv:TEXCOORD0;};
            struct v2f {float4 vertex:SV_POSITION;float4 color:COLOR;float2 uv:TEXCOORD0;float4 projected:TEXCOORD1;};
            v2f vert(appdata v)
            {
                v2f o;o.vertex=UnityObjectToClipPos(v.vertex);o.color=v.color;o.uv=TRANSFORM_TEX(v.uv,_MainTex);
                o.projected=ComputeScreenPos(o.vertex);COMPUTE_EYEDEPTH(o.projected.z);return o;
            }
            float4 frag(v2f i):SV_Target
            {
                #ifdef SOFTPARTICLES_ON
                float depth=LinearEyeDepth(SAMPLE_DEPTH_TEXTURE_PROJ(_CameraDepthTexture,UNITY_PROJ_COORD(i.projected)));
                i.color.a*=saturate(_InvFade*(depth-i.projected.z));
                #endif
                float4 tex=tex2D(_MainTex,i.uv);
                float4 c=tex*i.color*_Color*_LegacyFactor;
                if(_SourceMode==2)
                {
                    float gray=Luminance(tex.rgb)*_Color.a*_SubRate*i.color.a;
                    c=float4(tex.rgb*i.color.rgb*_Color.rgb*tex.a*i.color.a*_Intensity*_Color.a,gray*2*_Intensity);
                }
                else if(_SourceMode==3)c.rgb*=c.a;
                c.rgb=NeonPalette(c.rgb,_NeonSide);
                if(_SourceMode==4)c.rgb=lerp(float3(1,1,1),c.rgb,c.a);
                return c;
            }
            ENDCG
        }
    }
}
