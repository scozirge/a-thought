Shader "UI/Astral Guardian"
{
    Properties { [PerRendererData] _MainTex("Guardian",2D)="white"{} }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Cull Off Lighting Off ZWrite Off ZTest [unity_GUIZTestMode]
        Blend SrcAlpha OneMinusSrcAlpha
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #include "UnityCG.cginc"
            struct appdata {float4 vertex:POSITION;float2 uv:TEXCOORD0;fixed4 color:COLOR;};
            struct v2f {float4 vertex:SV_POSITION;float2 uv:TEXCOORD0;fixed4 color:COLOR;};
            sampler2D _MainTex;float4 _MainTex_TexelSize;
            v2f vert(appdata v){v2f o;o.vertex=UnityObjectToClipPos(v.vertex);o.uv=v.uv;o.color=v.color;return o;}
            fixed4 frag(v2f i):SV_Target
            {
                fixed4 art=tex2D(_MainTex,i.uv);
                float2 px=_MainTex_TexelSize.xy*1.2;
                float3 dx=tex2D(_MainTex,i.uv+float2(px.x,0)).rgb-tex2D(_MainTex,i.uv-float2(px.x,0)).rgb;
                float3 dy=tex2D(_MainTex,i.uv+float2(0,px.y)).rgb-tex2D(_MainTex,i.uv-float2(0,px.y)).rgb;
                float ink=saturate(max(length(dx),length(dy))*3.8);
                return fixed4(lerp(float3(.075,.12,.20),float3(.87,.76,.51),ink),art.a)*i.color;
            }
            ENDCG
        }
    }
}
