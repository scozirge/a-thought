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
      BuildCurrent();
    }
    [MenuItem("RIVALS/Build current Web scene")]
    public static void BuildCurrent() {
      var args=Environment.GetCommandLineArgs();int outputIndex=Array.IndexOf(args,"-rivalsWebOutput");
      string output=outputIndex>=0&&outputIndex+1<args.Length?args[outputIndex+1]:"Builds/Web";
      var config=NetworkProjectConfig.Global;
      config.AllowClientServerModesInWebGL=true;
      NetworkProjectConfigUtilities.SaveGlobalConfig(config);
      PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;
      PlayerSettings.WebGL.dataCaching=false;
      PlayerSettings.WebGL.initialMemorySize=256;
      PlayerSettings.WebGL.maximumMemorySize=1024;
      PlayerSettings.WebGL.template="PROJECT:Rivals";
      UnityEditor.WebGL.UserBuildSettings.codeOptimization=UnityEditor.WebGL.WasmCodeOptimization.RuntimeSpeed;
      PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL,Il2CppCompilerConfiguration.Release);
      PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL,ManagedStrippingLevel.Low);
      var report=BuildPipeline.BuildPlayer(EditorBuildSettings.scenes,output,BuildTarget.WebGL,BuildOptions.None);
      if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Web build failed");
      File.Copy("ASSET_CREDITS.txt",Path.Combine(output,"ASSET_CREDITS.txt"),true);
      foreach(var file in Directory.GetFiles("Assets/ThirdParty","*.txt",SearchOption.AllDirectories)) {
        var target=Path.Combine(output,"ThirdPartyLicenses",file.Substring("Assets/ThirdParty/".Length));
        Directory.CreateDirectory(Path.GetDirectoryName(target));File.Copy(file,target,true);
      }
      Debug.Log("RIVALS_WEB_BUILD_OK");
    }
  }
}
