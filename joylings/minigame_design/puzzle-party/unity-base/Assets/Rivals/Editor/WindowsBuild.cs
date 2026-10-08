using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace RivalsPrototype.Editor {
  public static class WindowsBuild {
    [MenuItem("RIVALS/Build current Windows release")]
    public static void BuildCurrent() {
      var args=Environment.GetCommandLineArgs();int outputIndex=Array.IndexOf(args,"-rivalsOutput");
      string output=outputIndex>=0&&outputIndex+1<args.Length?args[outputIndex+1]:"Builds/WindowsRelease";
      // Keep the authored scene and use the supported native Mono release player.
      PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);
      PlayerSettings.SplashScreen.show=false;
      PlayerSettings.defaultScreenWidth=1280;PlayerSettings.defaultScreenHeight=720;
      PlayerSettings.fullScreenMode=FullScreenMode.Windowed;
      var report=BuildPipeline.BuildPlayer(EditorBuildSettings.scenes,Path.Combine(output,"Rivals.exe"),BuildTarget.StandaloneWindows64,BuildOptions.None);
      if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Windows release build failed");
      if((report.summary.options&BuildOptions.Development)!=0)throw new Exception("Expected a non-development player");
      File.Copy("ASSET_CREDITS.txt",Path.Combine(output,"ASSET_CREDITS.txt"),true);
      foreach(var file in Directory.GetFiles("Assets/ThirdParty","*.txt",SearchOption.AllDirectories)) {
        var target=Path.Combine(output,"ThirdPartyLicenses",file.Substring("Assets/ThirdParty/".Length));
        Directory.CreateDirectory(Path.GetDirectoryName(target));File.Copy(file,target,true);
      }
      Debug.Log("RIVALS_WINDOWS_RELEASE_BUILD_OK target=StandaloneWindows64 development=false");
    }
  }
}
