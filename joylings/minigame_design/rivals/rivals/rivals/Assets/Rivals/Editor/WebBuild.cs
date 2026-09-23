using System;
using System.IO;
using Fusion;
using Fusion.Editor;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace RivalsPrototype.Editor {
  public static class WebBuild {
    [MenuItem("RIVALS/Build Web test")]
    public static void Build() {
      RivalsSetup.Create();
      var config=NetworkProjectConfig.Global;
      config.AllowClientServerModesInWebGL=true;
      NetworkProjectConfigUtilities.SaveGlobalConfig(config);
      PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;
      PlayerSettings.WebGL.dataCaching=false;
      PlayerSettings.WebGL.initialMemorySize=256;
      PlayerSettings.WebGL.maximumMemorySize=1024;
      PlayerSettings.WebGL.template="PROJECT:Rivals";
      UnityEditor.WebGL.UserBuildSettings.codeOptimization=UnityEditor.WebGL.WasmCodeOptimization.BuildTimes;
      PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL,Il2CppCompilerConfiguration.Debug);
      PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL,ManagedStrippingLevel.Low);
      var report=BuildPipeline.BuildPlayer(EditorBuildSettings.scenes,"Builds/Web",BuildTarget.WebGL,BuildOptions.None);
      if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Web build failed");
      File.Copy("ASSET_CREDITS.txt","Builds/Web/ASSET_CREDITS.txt",true);
      foreach(var file in Directory.GetFiles("Assets/ThirdParty","*.txt",SearchOption.AllDirectories)) {
        var target="Builds/Web/ThirdPartyLicenses/"+file.Substring("Assets/ThirdParty/".Length);
        Directory.CreateDirectory(Path.GetDirectoryName(target));File.Copy(file,target,true);
      }
      Debug.Log("RIVALS_WEB_BUILD_OK");
    }
  }
}
