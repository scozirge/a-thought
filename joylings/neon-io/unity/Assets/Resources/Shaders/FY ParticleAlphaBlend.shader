// Upgrade NOTE: replaced 'mul(UNITY_MATRIX_MVP,*)' with 'UnityObjectToClipPos(*)'

Shader "FY/ParticleAlphaBlend"
{
	Properties
	{
		_MainTex ("Base (RGB), Alpha (A)", 2D) = "white" {} 
	}
	
	SubShader
	{
		LOD 100

		Tags
		{
			"Queue" = "Transparent"
			"IgnoreProjector" = "True"
			"RenderType" = "Transparent"
		}
		
		Pass
		{
			Cull Off
			Lighting Off
			ZWrite Off
			Fog { Mode Off }
			Blend SrcAlpha OneMinusSrcAlpha
			CGPROGRAM
			#pragma vertex vert
			#pragma fragment frag
			#pragma multi_compile NO_SCALE
			
			#include "UnityCG.cginc"
	
			struct appdata_t 
			{
				float4 vertex : POSITION; 
				float4 color : COLOR;
				float2 texcoord : TEXCOORD0;
			};
	
			struct v2f
			{
				float4 vertex : POSITION; 
				float4 color : COLOR;
				float2 texcoord : TEXCOORD0;
			};
	
			sampler2D _MainTex;
			float4 _MainTex_ST;
			
			v2f vert (appdata_t v)
			{
				v2f o;
				o.vertex = UnityObjectToClipPos(v.vertex);
				o.color = v.color;
				o.texcoord = TRANSFORM_TEX(v.texcoord, _MainTex);
				return o;
			}
				
			float4 frag (v2f i) : COLOR
			{
				float4 c = tex2D(_MainTex, i.texcoord) * i.color;
				return c;
			}
			ENDCG
		}
	}
}