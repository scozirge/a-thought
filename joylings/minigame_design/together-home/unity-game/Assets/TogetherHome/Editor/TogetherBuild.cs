using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using CatDog;
public static class TogetherBuild {
 public static void Check(){Debug.Log(ParityChecks.Run("Assets"));}
 public static void Build(){
  Check();
  foreach(string path in new[]{"Assets/Resources/Art/cat.png","Assets/Resources/Art/dog.png","Assets/Resources/Art/key.png"}){
   var importer=(TextureImporter)AssetImporter.GetAtPath(path);importer.textureType=TextureImporterType.Default;importer.alphaIsTransparency=true;importer.mipmapEnabled=false;importer.textureCompression=TextureImporterCompression.Uncompressed;importer.SaveAndReimport();
  }
  var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
  var camera=new GameObject("Camera").AddComponent<Camera>();camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.96f,.96f,.92f);camera.orthographic=true;
  new GameObject("TogetherHome").AddComponent<TogetherHome>();Directory.CreateDirectory("Assets/TogetherHome/Scenes");EditorSceneManager.SaveScene(scene,"Assets/TogetherHome/Scenes/Game.unity");
  PlayerSettings.companyName="AThought";PlayerSettings.productName="貓狗一起回家";PlayerSettings.bundleVersion="1.0.0";
  PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Gzip;PlayerSettings.WebGL.decompressionFallback=true;PlayerSettings.WebGL.dataCaching=true;PlayerSettings.WebGL.nameFilesAsHashes=true;
  PlayerSettings.WebGL.initialMemorySize=128;PlayerSettings.WebGL.maximumMemorySize=512;PlayerSettings.WebGL.template="PROJECT:TogetherHome";
  PlayerSettings.SplashScreen.show=false;PlayerSettings.runInBackground=true;PlayerSettings.colorSpace=ColorSpace.Gamma;
  PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL,ManagedStrippingLevel.Low);PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL,Il2CppCompilerConfiguration.Release);
  string output=Path.GetFullPath("../Builds/UnityWeb");var report=BuildPipeline.BuildPlayer(new[]{"Assets/TogetherHome/Scenes/Game.unity"},output,BuildTarget.WebGL,BuildOptions.None);
  if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Unity WebGL build failed");Debug.Log("CATDOG_WEBGL_BUILD_OK "+output);
 }
}
