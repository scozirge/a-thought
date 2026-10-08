using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace RivalsPrototype.Editor {
  public static class ArtReview {
    [MenuItem("RIVALS/Render game art and weapon icons")]
    public static void RenderGameArt() {
      FreeAssetSetup.Build();
      EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
      RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Flat;RenderSettings.ambientLight=new Color(.8f,.8f,.8f);
      var light=new GameObject("Review light").AddComponent<Light>();light.type=LightType.Directional;light.intensity=1.4f;light.transform.rotation=Quaternion.Euler(35,-35,0);
      var camera=new GameObject("Review camera").AddComponent<Camera>();camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.13f,.18f,.25f,0);camera.orthographic=true;
      var target=new RenderTexture(512,320,24,RenderTextureFormat.ARGB32);camera.targetTexture=target;
      var sheet=new Texture2D(2048,1280,TextureFormat.RGB24,false);Directory.CreateDirectory("Assets/Rivals/Resources/Art/Icons");
      for(int index=0;index<13;index++) {
        var holder=new GameObject("Review model");
        if(index<5)DuelWorld.MakeWeapon(holder.transform,index,false);
        else {var avatar=holder.AddComponent<DuelAvatar>();avatar.Build(index-5);DuelWorld.MakeWeapon(avatar.GunSocket,(index-5)%5,false,index-5).localScale=Vector3.one*.8f;}
        var renderers=holder.GetComponentsInChildren<Renderer>().Where(r=>!(r is LineRenderer)).ToArray();var bounds=renderers[0].bounds;foreach(var r in renderers.Skip(1))bounds.Encapsulate(r.bounds);
        camera.orthographicSize=index<5?Mathf.Max(bounds.size.y*.65f,bounds.size.z*.34f):1.12f;
        camera.transform.position=bounds.center+(index<5?new Vector3(2,.5f,-1.1f):new Vector3(1.2f,.3f,3.5f));camera.transform.LookAt(bounds.center);
        camera.Render();RenderTexture.active=target;
        var pixels=new Texture2D(512,320,TextureFormat.RGBA32,false);pixels.ReadPixels(new Rect(0,0,512,320),0,0);pixels.Apply();
        sheet.SetPixels((index%4)*512,(3-index/4)*320,512,320,pixels.GetPixels());
        if(index<5)File.WriteAllBytes($"Assets/Rivals/Resources/Art/Icons/weapon-{index}.png",pixels.EncodeToPNG());
        Object.DestroyImmediate(pixels);Object.DestroyImmediate(holder);
      }
      sheet.Apply();Directory.CreateDirectory("Logs");File.WriteAllBytes("Logs/game-art-review.png",sheet.EncodeToPNG());
      RenderTexture.active=null;camera.targetTexture=null;target.Release();AssetDatabase.Refresh();
      foreach(var path in Directory.GetFiles("Assets/Rivals/Resources/Art/Icons","*.png")) {
        var importer=(TextureImporter)AssetImporter.GetAtPath(path);importer.alphaIsTransparency=true;importer.mipmapEnabled=false;importer.textureCompression=TextureImporterCompression.Uncompressed;importer.SaveAndReimport();
      }
      FreeAssetSetup.Build();Debug.Log("GAME_ART_REVIEW_OK");
    }
    public static void BuildWindowsReview(){RenderGameArt();RivalsSetup.Build();}
    public static void RenderSources() {
      EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
      RenderSettings.ambientLight=Color.white;
      var light=new GameObject("Review light").AddComponent<Light>();light.type=LightType.Directional;light.intensity=1.5f;light.transform.rotation=Quaternion.Euler(35,-35,0);
      var camera=new GameObject("Review camera").AddComponent<Camera>();camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.75f,.8f,.87f);camera.orthographic=true;camera.orthographicSize=.48f;
      camera.transform.position=new Vector3(1.7f,.65f,-.95f);camera.transform.LookAt(Vector3.zero);
      string[] paths={"QuaterniusUltimateGuns/AssaultRifle_1.fbx","QuaterniusUltimateGuns/AssaultRifle_3.fbx","QuaterniusAnimatedGuns/Rifle.fbx","QuaterniusToonGuns/Pistol.fbx","QuaterniusToonGuns/Shotgun.fbx","QuaterniusToonGuns/Sniper.fbx","QuaterniusToonGuns/Sniper_2.fbx","QuaterniusToonGuns/Knife_1.fbx","QuaterniusToonGuns/Knife_2.fbx"};
      var sheet=new Texture2D(1536,960,TextureFormat.RGB24,false);
      var target=new RenderTexture(512,320,24);camera.targetTexture=target;
      for(int index=0;index<paths.Length;index++) {
        var model=Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/ThirdParty/"+paths[index]));
        foreach(var animator in model.GetComponentsInChildren<Animator>())Object.DestroyImmediate(animator);
        var renderers=model.GetComponentsInChildren<Renderer>();
        var bounds=renderers[0].bounds;foreach(var r in renderers.Skip(1))bounds.Encapsulate(r.bounds);
        Debug.Log($"ART_ORIENTATION {index}: rotation={model.transform.eulerAngles} bounds={bounds.size}");
        if(bounds.size.x>bounds.size.z)model.transform.rotation=Quaternion.Euler(0,90,0)*model.transform.rotation;
        bounds=renderers[0].bounds;foreach(var r in renderers.Skip(1))bounds.Encapsulate(r.bounds);
        model.transform.localScale*=1.1f/Mathf.Max(bounds.size.x,bounds.size.y,bounds.size.z);
        bounds=renderers[0].bounds;foreach(var r in renderers.Skip(1))bounds.Encapsulate(r.bounds);model.transform.position-=bounds.center;
        foreach(var renderer in renderers)renderer.sharedMaterials=renderer.sharedMaterials.Select(m=> {
          var material=new Material(Shader.Find("Universal Render Pipeline/Lit"));material.color=m&&m.HasProperty("_Color")?m.color:Color.gray;material.SetFloat("_Smoothness",.25f);
          Debug.Log($"ART_REVIEW {index}: {paths[index]} part={renderer.name} material={m?.name} color={material.color}");return material;
        }).ToArray();
        camera.Render();RenderTexture.active=target;
        var pixels=new Texture2D(512,320,TextureFormat.RGB24,false);pixels.ReadPixels(new Rect(0,0,512,320),0,0);pixels.Apply();
        sheet.SetPixels((index%3)*512,(2-index/3)*320,512,320,pixels.GetPixels());
        Object.DestroyImmediate(pixels);Object.DestroyImmediate(model);
      }
      sheet.Apply();Directory.CreateDirectory("Logs");File.WriteAllBytes("Logs/art-source-review.png",sheet.EncodeToPNG());
      RenderTexture.active=null;camera.targetTexture=null;target.Release();Debug.Log("ART_REVIEW_OK");
    }
  }
}
