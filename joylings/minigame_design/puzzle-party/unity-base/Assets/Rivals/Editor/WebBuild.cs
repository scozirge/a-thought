using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
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
      // Lossless transport compression; keep the existing compiler, stripping,
      // textures and gameplay settings. Pages cannot set custom Content-Encoding
      // headers, so use Unity's supported decompressor for .unityweb files.
      PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Brotli;
      PlayerSettings.WebGL.decompressionFallback=true;
      PlayerSettings.WebGL.dataCaching=true;
      PlayerSettings.WebGL.nameFilesAsHashes=true;
      PlayerSettings.WebGL.initialMemorySize=256;
      PlayerSettings.WebGL.maximumMemorySize=1024;
      PlayerSettings.WebGL.template="PROJECT:Rivals";
      PlayerSettings.SplashScreen.show=false;
      UnityEditor.WebGL.UserBuildSettings.codeOptimization=UnityEditor.WebGL.WasmCodeOptimization.RuntimeSpeed;
      PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL,Il2CppCompilerConfiguration.Release);
      PlayerSettings.SetIl2CppCodeGeneration(NamedBuildTarget.WebGL,Il2CppCodeGeneration.OptimizeSpeed);
      PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL,ManagedStrippingLevel.Low);
      var report=BuildPipeline.BuildPlayer(EditorBuildSettings.scenes,output,BuildTarget.WebGL,BuildOptions.None);
      if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Web build failed");
      PrepareDelivery(output);
      File.Copy("ASSET_CREDITS.txt",Path.Combine(output,"ASSET_CREDITS.txt"),true);
      foreach(var file in Directory.GetFiles("Assets/ThirdParty","*.txt",SearchOption.AllDirectories)) {
        var target=Path.Combine(output,"ThirdPartyLicenses",file.Substring("Assets/ThirdParty/".Length));
        Directory.CreateDirectory(Path.GetDirectoryName(target));File.Copy(file,target,true);
      }
      Debug.Log("RIVALS_WEB_BUILD_OK");
    }

    [Serializable] sealed class DeliveryAsset { public string name; public long bytes; public string sha256; }
    [Serializable] sealed class DeliveryManifest { public DeliveryAsset[] assets; }

    // Can update delivery for an already validated build without recompiling gameplay.
    public static void PrepareDeliveryCurrent() {
      var args=Environment.GetCommandLineArgs();int i=Array.IndexOf(args,"-rivalsWebOutput");
      if(i<0||i+1>=args.Length)throw new Exception("Missing -rivalsWebOutput");
      PrepareDelivery(args[i+1]);
      Debug.Log("RIVALS_WEB_DELIVERY_OK");
    }

    static void PrepareDelivery(string output) {
      var files=Directory.GetFiles(Path.Combine(output,"Build"),"*.unityweb")
        .Where(p=>p.EndsWith(".data.unityweb")||p.EndsWith(".wasm.unityweb")).OrderBy(p=>p).ToArray();
      if(files.Length!=2)throw new Exception("Expected exactly one data and one wasm asset");
      var manifest=new DeliveryManifest { assets=files.Select(p=> {
        using(var stream=File.OpenRead(p))using(var sha=SHA256.Create())return new DeliveryAsset {
          name=Path.GetFileName(p),bytes=stream.Length,sha256=BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant()
        };
      }).ToArray() };
      var index=Path.Combine(output,"index.html");
      string html=File.ReadAllText(index);
      var tag=new Regex("<script type=\"application/json\" id=\"rivals-asset-manifest\">.*?</script>");
      // Existing releases may predate the manifest hook.
      if(!tag.IsMatch(html)) {
        int start=html.IndexOf("  <script>",StringComparison.Ordinal);
        if(start<0)throw new Exception("Missing Web template script");
        html=html.Insert(start,"  <script type=\"application/json\" id=\"rivals-asset-manifest\">{\"assets\":[]}</script>\n  <script src=\"asset-delivery.js?v=cdn-load-20261001\"></script>\n");
      }
      html=tag.Replace(html,"<script type=\"application/json\" id=\"rivals-asset-manifest\">"+JsonUtility.ToJson(manifest)+"</script>",1);
      File.WriteAllText(index,html.Replace("\r\n","\n"),new UTF8Encoding(false));
      File.Copy("Assets/WebGLTemplates/Rivals/asset-delivery.js",Path.Combine(output,"asset-delivery.js"),true);
    }
  }
}
