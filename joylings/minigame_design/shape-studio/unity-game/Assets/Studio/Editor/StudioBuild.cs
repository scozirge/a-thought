using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using ShapeStudio;

public static class StudioBuild {
    public static void Build(){
        StudioChecks.Run();
        var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        var camera=new GameObject("Camera").AddComponent<Camera>();
        camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(1f,.996f,.977f);
        new GameObject("Studio").AddComponent<Studio>();
        Directory.CreateDirectory("Assets/Studio/Scenes");
        const string path="Assets/Studio/Scenes/Classroom.unity";
        EditorSceneManager.SaveScene(scene,path);
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(path,true)};
        PlayerSettings.companyName="AThought";PlayerSettings.productName="小小工程師";PlayerSettings.bundleVersion="1.0.0";
        PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Gzip;PlayerSettings.WebGL.decompressionFallback=true;
        PlayerSettings.WebGL.dataCaching=true;PlayerSettings.WebGL.nameFilesAsHashes=true;
        PlayerSettings.WebGL.initialMemorySize=64;PlayerSettings.WebGL.maximumMemorySize=256;
        PlayerSettings.WebGL.template="PROJECT:Studio";PlayerSettings.SplashScreen.show=false;
        PlayerSettings.runInBackground=true;PlayerSettings.colorSpace=ColorSpace.Gamma;
        PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL,ManagedStrippingLevel.Low);
        PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL,Il2CppCompilerConfiguration.Release);
        var report=BuildPipeline.BuildPlayer(new[]{path},Path.GetFullPath("../Builds/UnityWeb"),BuildTarget.WebGL,BuildOptions.None);
        if(report.summary.result!=BuildResult.Succeeded)throw new Exception("WebGL build failed: "+report.summary.result);
    }
}
