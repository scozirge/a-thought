Shader "Neon/Arena Black Mist"
{
    Properties { _Radius("Safe radius",Float)=4000 }
    SubShader
    {
        Tags { "Queue"="Overlay-1" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Cull Off Lighting Off ZWrite Off ZTest Always
        Blend SrcAlpha OneMinusSrcAlpha
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #include "UnityCG.cginc"
            struct appdata { float4 vertex:POSITION; };
            struct v2f { float4 vertex:SV_POSITION; float2 world:TEXCOORD0; };
            float _Radius;
            v2f vert(appdata v) { v2f o;o.vertex=UnityObjectToClipPos(v.vertex);o.world=mul(unity_ObjectToWorld,v.vertex).xy;return o; }
            float hash(float2 p) { return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453); }
            float noise(float2 p)
            {
                float2 cell=floor(p), f=frac(p);f=f*f*(3-2*f);
                return lerp(lerp(hash(cell),hash(cell+float2(1,0)),f.x),lerp(hash(cell+float2(0,1)),hash(cell+1),f.x),f.y);
            }
            fixed4 frag(v2f i):SV_Target
            {
                float distance=length(i.world)-_Radius;
                // Leave the safe interior completely clear; evaluate noise only near/in the fog.
                if(distance < -170 && _Radius > 0) return fixed4(0,0,0,0);
                float2 drift=float2(_Time.y*.035,-_Time.y*.026);
                float clouds=noise(i.world*.0027+drift);
                float detail=noise(i.world*.007-drift*1.6);
                float edge=distance+(clouds-.5)*110+(detail-.5)*35;
                float opacity=smoothstep(-120,240,edge)*(.84+.12*clouds);
                // Once the safe area vanishes there is no transparent pinhole at the origin.
                opacity=lerp(.90,opacity,saturate(_Radius/100));
                float3 tint=lerp(float3(.009,.012,.021),float3(.036,.043,.063),clouds*.6+detail*.4);
                return fixed4(tint,opacity);
            }
            ENDCG
        }
    }
}
