using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Security.Cryptography;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using Together;

public static class PuzzleBuild {
 [Serializable] class Cases {public Case[] cases;}
 [Serializable] class Case {public string game,digest;public int index,count,successCount;}
 public static void Check(){
  var levels=JsonUtility.FromJson<LevelBook>(File.ReadAllText("Assets/Resources/levels.json")).levels;
  var cases=JsonUtility.FromJson<Cases>(File.ReadAllText("Assets/PuzzleParty/Editor/parity-cases.json")).cases;
  int total=0;if(cases.Length!=levels.Length)throw new Exception("比對資料缺少關卡");
  foreach(var c in cases){
   var l=levels.First(l=>l.game==c.game&&l.index==c.index);int count=0,successCount=0;var settings=new string[l.Decisions];
   using(var hash=SHA256.Create()){
    void Visit(int i){
     if(i<settings.Length){foreach(var option in l.options){settings[i]=option;Visit(i+1);}return;}
     var r=Rules.Run(l,settings);
     string output=l.game=="sticker"?string.Join(",",r.board.Select(v=>v??"")):string.Join(";",r.positions.Select(p=>p.x+","+p.y));
     var bytes=Encoding.UTF8.GetBytes((r.success?"1":"0")+"|"+output+"\\n");hash.TransformBlock(bytes,0,bytes.Length,null,0);
     count++;if(r.success)successCount++;
    }
    Visit(0);hash.TransformFinalBlock(new byte[0],0,0);
    string digest=BitConverter.ToString(hash.Hash).Replace("-","").ToLowerInvariant();
    if(count!=c.count||successCount!=c.successCount||successCount!=1||digest!=c.digest)throw new Exception("規則不一致："+l.id+" "+count+" 組");
   }
   total+=count;
  }
  Debug.Log("PUZZLE_PARITY_OK "+total+" settings / "+levels.Length+" levels (SHA-256 over every result)");
  PuzzleRoomChecks.Check();
 }
 [MenuItem("一起想想/輸出本地 WebGL")]
 public static void Build(){
  Check();var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
  var camera=new GameObject("Camera").AddComponent<Camera>();camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.96f,.96f,.92f);camera.orthographic=true;
  new GameObject("PuzzleParty").AddComponent<PuzzleParty>();
  Directory.CreateDirectory("Assets/PuzzleParty/Scenes");EditorSceneManager.SaveScene(scene,"Assets/PuzzleParty/Scenes/Playground.unity");
  PlayerSettings.companyName="AThought";PlayerSettings.productName="一起想想";PlayerSettings.bundleVersion="0.12.2";
  PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;PlayerSettings.WebGL.decompressionFallback=false;
  PlayerSettings.WebGL.dataCaching=false;PlayerSettings.WebGL.nameFilesAsHashes=false;
  PlayerSettings.WebGL.initialMemorySize=128;PlayerSettings.WebGL.maximumMemorySize=512;PlayerSettings.WebGL.template="PROJECT:PuzzleParty";
  PlayerSettings.SplashScreen.show=false;PlayerSettings.runInBackground=true;PlayerSettings.colorSpace=ColorSpace.Gamma;
  PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL,ManagedStrippingLevel.Low);
  PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL,Il2CppCompilerConfiguration.Release);
  var output=Path.GetFullPath("../Builds/UnityWeb");
  var result=BuildPipeline.BuildPlayer(new[]{"Assets/PuzzleParty/Scenes/Playground.unity"},output,BuildTarget.WebGL,BuildOptions.None);
  if(result.summary.result!=BuildResult.Succeeded)throw new Exception("Unity WebGL 建置失敗");
  Debug.Log("PUZZLE_WEBGL_BUILD_OK "+output);
 }
}
