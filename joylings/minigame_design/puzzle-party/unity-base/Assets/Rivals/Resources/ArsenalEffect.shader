Shader "Rivals/ArsenalEffect" {
  Properties { _BaseColor("Color",Color)=(1,1,1,1) }
  SubShader {
    Tags { "RenderType"="Transparent" "Queue"="Transparent" "RenderPipeline"="UniversalPipeline" }
    Pass {
      Tags { "LightMode"="UniversalForward" }
      Blend SrcAlpha OneMinusSrcAlpha
      ZWrite Off
      Cull Back
      HLSLPROGRAM
      #pragma vertex Vert
      #pragma fragment Frag
      #pragma multi_compile_fog
      #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
      CBUFFER_START(UnityPerMaterial)
      half4 _BaseColor;
      CBUFFER_END
      struct Attributes { float4 positionOS:POSITION; };
      struct Varyings { float4 positionCS:SV_POSITION; half fog:TEXCOORD0; };
      Varyings Vert(Attributes input){Varyings output;output.positionCS=TransformObjectToHClip(input.positionOS.xyz);output.fog=ComputeFogFactor(output.positionCS.z);return output;}
      half4 Frag(Varyings input):SV_Target{return half4(MixFog(_BaseColor.rgb,input.fog),_BaseColor.a);}
      ENDHLSL
    }
  }
}
