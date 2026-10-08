using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object=UnityEngine.Object;

namespace RivalsPrototype.Editor {
  public static class ArsenalChecks {
    const string Pending="RivalsArsenalPending";
    static double stableSince;
    public static void Run(){BattleRulesChecks.Validate();RenderIcons();SessionState.SetBool(Pending,true);Resume();}
    [InitializeOnLoadMethod] static void Resume(){if(SessionState.GetBool(Pending,false)){stableSince=EditorApplication.timeSinceStartup;EditorApplication.update-=WaitForImport;EditorApplication.update+=WaitForImport;}}
    static void WaitForImport(){
      if(EditorApplication.isCompiling||EditorApplication.isUpdating){stableSince=EditorApplication.timeSinceStartup;return;}
      if(EditorApplication.timeSinceStartup-stableSince<5)return;
      EditorApplication.update-=WaitForImport;SessionState.SetBool(Pending,false);
      EditorSceneManager.OpenScene("Assets/Rivals/Scenes/Rivals.unity");EditorApplication.isPlaying=true;
    }
    public static void RenderIcons() {
      EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
      var camera=new GameObject("Weapon review camera").AddComponent<Camera>();camera.orthographic=true;camera.orthographicSize=.46f;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=Color.clear;camera.nearClipPlane=.05f;camera.farClipPlane=20;
      var light=new GameObject("Key light").AddComponent<Light>();light.type=LightType.Directional;light.intensity=1.7f;light.transform.rotation=Quaternion.Euler(38,-45,0);
      RenderSettings.ambientLight=new Color(.6f,.65f,.7f);RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Flat;
      var target=new RenderTexture(640,400,24,RenderTextureFormat.ARGB32);camera.targetTexture=target;
      var texture=new Texture2D(640,400,TextureFormat.RGBA32,false);var sheet=new Texture2D(640,2000,TextureFormat.RGBA32,false);
      string directory="Assets/Rivals/Resources/ArsenalIcons";Directory.CreateDirectory(directory);Directory.CreateDirectory("Logs/Arsenal");int row=0;
      foreach(int kind in new[]{Weapons.Gatling,Weapons.Rocket,Weapons.Nuke,Weapons.Cleaver,Weapons.Poison}) {
        var weapon=DuelWorld.MakeWeapon(null,kind,false);
        if(weapon.GetComponentsInChildren<Collider>().Length!=0)throw new Exception("Weapon collider "+kind);
        if(kind!=Weapons.Cleaver&&kind!=Weapons.Poison&&!DuelWorld.WeaponMuzzle(weapon))throw new Exception("Missing muzzle "+kind);
        camera.transform.position=new Vector3(1.8f,.75f,-1.1f);camera.transform.LookAt(new Vector3(0,.045f,.10f));
        camera.Render();RenderTexture.active=target;texture.ReadPixels(new Rect(0,0,640,400),0,0);texture.Apply();
        File.WriteAllBytes(directory+"/weapon-"+kind+".png",texture.EncodeToPNG());sheet.ReadPixels(new Rect(0,0,640,400),0,(4-row++)*400);
        Object.DestroyImmediate(weapon.gameObject);
      }
      sheet.Apply();File.WriteAllBytes("Logs/Arsenal/weapon-review.png",sheet.EncodeToPNG());
      RenderTexture.active=null;camera.targetTexture=null;target.Release();Object.DestroyImmediate(target);Object.DestroyImmediate(texture);Object.DestroyImmediate(sheet);Object.DestroyImmediate(light.gameObject);Object.DestroyImmediate(camera.gameObject);
      AssetDatabase.Refresh();
      foreach(var path in Directory.GetFiles(directory,"*.png")){var importer=(TextureImporter)AssetImporter.GetAtPath(path);importer.alphaIsTransparency=true;importer.mipmapEnabled=false;importer.maxTextureSize=512;importer.textureCompression=TextureImporterCompression.Compressed;importer.SaveAndReimport();}
      Debug.Log("RIVALS_ARSENAL_MODELS_OK weapons=5");
    }
  }
}
