Shader "Neon/BattleCosmos"
{
    Properties { _Aspect ("Aspect", Float) = 1.77778 _Drift ("Parallax", Vector) = (0,0,0,0) }
    SubShader
    {
        Tags { "Queue"="Background" "RenderType"="Opaque" }
        Cull Off ZWrite Off ZTest Always
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            float _Aspect;
            float4 _Drift;
            struct appdata { float4 vertex:POSITION; float2 uv:TEXCOORD0; };
            struct v2f { float4 position:SV_POSITION; float2 uv:TEXCOORD0; };
            v2f vert(appdata v) { v2f o; o.position=UnityObjectToClipPos(v.vertex); o.uv=v.uv; return o; }
            float hash(float2 p) { return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453); }
            float noise(float2 p)
            {
                float2 cell=floor(p), f=frac(p); f=f*f*(3-2*f);
                return lerp(lerp(hash(cell),hash(cell+float2(1,0)),f.x),lerp(hash(cell+float2(0,1)),hash(cell+1),f.x),f.y);
            }
            fixed4 frag(v2f i):SV_Target
            {
                float2 p=(i.uv-.5)*float2(_Aspect,1)+_Drift.xy;
                float n=noise(p*3.2+2.8)*.7+noise(p*7.1-1.3)*.3;
                float ribbon=exp(-pow((p.y-p.x*.26+n*.16+.04)*3.5,2));
                float veil=ribbon*smoothstep(.22,.78,n);
                float3 color=lerp(float3(.023,.040,.075),float3(.045,.073,.120),ribbon*.70);
                // Broad ink-like layers, restrained blue/teal and a trace of violet.
                color+=veil*float3(.013,.039,.048);
                color+=smoothstep(.52,.74,n)*ribbon*float3(.010,.013,.026);
                color+=exp(-dot(p-float2(-.65,.22),p-float2(-.65,.22))*3)*float3(.014,.009,.025);

                // A distant off-centre planet, with a narrow, matte rim.
                float2 planet=p-float2(.74,.48);
                float radius=.43, d=length(planet);
                float aa=max(fwidth(d),.001);
                float disk=1-smoothstep(radius-aa,radius+aa,d);
                float terminator=smoothstep(-.24,.28,planet.x+planet.y*.6);
                color=lerp(color,lerp(float3(.029,.049,.087),float3(.050,.089,.124),terminator),disk*.78);
                float rim=1-smoothstep(.0015,.0015+aa,abs(d-radius));
                color+=rim*float3(.032,.055,.065)*(.4+.6*terminator);
                float2 orbit=float2(planet.x*.86+planet.y*.32,planet.y*1.75-planet.x*.25);
                float arc=1-smoothstep(.001,.001+aa,abs(length(orbit)-.56));
                color+=arc*(1-disk)*smoothstep(-.4,.2,planet.y)*float3(.035,.030,.019);
                float vignette=1-.23*smoothstep(.28,1.15,length((i.uv-.5)*float2(1.25,1)));
                return fixed4(color*vignette,1);
            }
            ENDCG
        }
    }
}
