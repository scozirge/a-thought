using System.IO;
using Fusion;
using Fusion.Editor;
using Fusion.Photon.Realtime;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace RivalsPrototype.Editor {
  public static class RivalsSetup {
    const string Root="Assets/Rivals";
    [MenuItem("RIVALS/Build prototype scene")]
    public static void Create() {
      Directory.CreateDirectory(Root+"/Resources");Directory.CreateDirectory(Root+"/Scenes");
      FreeAssetSetup.Build();
      FusionGlobalScriptableObjectUtils.EnsureAssetExists<PhotonAppSettings>();
      var settings=PhotonAppSettings.Global;
      settings.AppSettings.AppIdFusion="991c4b1c-93ea-4d8e-bcf3-a9c278361da8";
      settings.AppSettings.FixedRegion="asia";
      EditorUtility.SetDirty(settings);
      NetworkProjectConfigUtilities.SaveGlobalConfig();
      var config=NetworkProjectConfig.Global;
      config.PeerMode=NetworkProjectConfig.PeerModes.Single;
      config.LagCompensation.Enabled=true;
      config.LagCompensation.HitboxBufferLengthInMs=400;
      config.Simulation.TickRateSelection=new TickRate.Selection {Client=60,ClientSendInterval=1,ServerTickInterval=1,ServerSendInterval=1};
      NetworkProjectConfigUtilities.SaveGlobalConfig(config);
      var go=new GameObject("RivalsPlayer");go.AddComponent<NetworkObject>();
      go.layer=DuelPlayer.PlayerLayer;
      var cc=go.AddComponent<NetworkCharacterController>();cc.maxSpeed=5.5f;cc.jumpImpulse=7;
      var capsule=go.GetComponent<CharacterController>();capsule.height=1.85f;capsule.radius=.32f;capsule.center=new Vector3(0,.93f,0);
      go.AddComponent<DuelPlayer>();
      var hitRoot=go.AddComponent<HitboxRoot>();hitRoot.BroadRadius=1.1f;hitRoot.Offset=new Vector3(0,.93f,0);
      var hitObject=new GameObject("Lag compensated body");hitObject.transform.SetParent(go.transform,false);
      var hitbox=hitObject.AddComponent<Hitbox>();hitbox.Type=HitboxTypes.Capsule;
      // Fusion's CapsuleExtents is the full height, including both end caps.
      hitbox.CapsuleRadius=.32f;hitbox.CapsuleExtents=1.85f;hitbox.Offset=new Vector3(0,.93f,0);hitbox.Root=hitRoot;
      hitRoot.Hitboxes=new[]{hitbox};
      var visual=new GameObject("CharacterVisual");visual.transform.SetParent(go.transform,false);visual.AddComponent<DuelAvatar>();
      SavePrefab(go,"RivalsPlayer");
      go=new GameObject("RivalsMatch");go.AddComponent<NetworkObject>();go.AddComponent<DuelMatch>();SavePrefab(go,"RivalsMatch");
      AssetDatabase.SaveAssets();NetworkProjectConfigUtilities.RebuildPrefabTable();
      var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
      new GameObject("Arena").AddComponent<DuelWorld>();
      var session=new GameObject("RIVALS Session").AddComponent<DuelSession>();
      var cam=new GameObject("Lobby Camera").AddComponent<Camera>();cam.transform.position=new Vector3(34,36,-38);cam.transform.LookAt(Vector3.zero);
      cam.clearFlags=CameraClearFlags.SolidColor;cam.backgroundColor=new Color(.55f,.68f,.83f);session.LobbyCamera=cam;
      var light=new GameObject("Sun").AddComponent<Light>();light.type=LightType.Directional;light.intensity=1.35f;light.color=new Color(1,.97f,.93f);light.shadows=LightShadows.Soft;light.shadowStrength=.75f;light.transform.rotation=Quaternion.Euler(50,-35,0);
      EditorSceneManager.SaveScene(scene,Root+"/Scenes/Rivals.unity");
      EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(Root+"/Scenes/Rivals.unity",true)};
      PlayerSettings.productName="RIVALS Prototype";PlayerSettings.companyName="AThought";
      PlayerSettings.defaultScreenWidth=1280;PlayerSettings.defaultScreenHeight=720;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;
      PlayerSettings.runInBackground=true;
      PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);
      var graphics=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset")[0]);
      var shaders=graphics.FindProperty("m_AlwaysIncludedShaders");
      foreach(var shaderName in new[]{"Universal Render Pipeline/Lit","Universal Render Pipeline/Unlit"}) {
        var shader=Shader.Find(shaderName);bool exists=false;
        for(int n=0;n<shaders.arraySize;n++) if(shaders.GetArrayElementAtIndex(n).objectReferenceValue==shader)exists=true;
        if(shader&&!exists){int n=shaders.arraySize;shaders.InsertArrayElementAtIndex(n);shaders.GetArrayElementAtIndex(n).objectReferenceValue=shader;}
      }
      graphics.ApplyModifiedPropertiesWithoutUndo();
      AssetDatabase.SaveAssets();Debug.Log("RIVALS_SETUP_OK");
    }
    static void Part(Transform root,string name,Vector3 position,Vector3 scale){var part=GameObject.CreatePrimitive(PrimitiveType.Cube);part.name=name;part.transform.SetParent(root);part.transform.localPosition=position;part.transform.localScale=scale;Object.DestroyImmediate(part.GetComponent<Collider>());}
    static void SavePrefab(GameObject go,string name){var prefab=PrefabUtility.SaveAsPrefabAsset(go,Root+"/Resources/"+name+".prefab");new NetworkObjectBakerEditTime().Bake(prefab);EditorUtility.SetDirty(prefab);AssetDatabase.SetLabels(prefab,new[]{"FusionPrefab"});Object.DestroyImmediate(go);}
    [MenuItem("RIVALS/Build Windows demo")]
    public static void Build(){
      var args=System.Environment.GetCommandLineArgs();int outputIndex=System.Array.IndexOf(args,"-rivalsOutput");
      string output=outputIndex>=0&&outputIndex+1<args.Length?args[outputIndex+1]:"Builds/Windows";
      Create();var report=BuildPipeline.BuildPlayer(EditorBuildSettings.scenes,Path.Combine(output,"Rivals.exe"),BuildTarget.StandaloneWindows64,BuildOptions.Development);if(report.summary.result!=UnityEditor.Build.Reporting.BuildResult.Succeeded)throw new System.Exception("Build failed");File.Copy("ASSET_CREDITS.txt",Path.Combine(output,"ASSET_CREDITS.txt"),true);
      foreach(var file in Directory.GetFiles("Assets/ThirdParty","*.txt",SearchOption.AllDirectories)) {
        var target=Path.Combine(output,"ThirdPartyLicenses",file.Substring("Assets/ThirdParty/".Length));
        Directory.CreateDirectory(Path.GetDirectoryName(target));File.Copy(file,target,true);
      }
      Debug.Log("RIVALS_BUILD_OK");}
  }
}

