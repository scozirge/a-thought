using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object=UnityEngine.Object;

namespace RivalsPrototype.Editor {
  public static class GunPresentationChecks {
    [MenuItem("RIVALS/Validate gun presentation")]
    public static void Validate() {
      FreeAssetSetup.Build();
      EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
      var world=new GameObject("World camera").AddComponent<Camera>();world.enabled=false;
      var view=new GameObject("Weapon camera").AddComponent<Camera>();view.enabled=false;
      view.transform.SetParent(world.transform,false);view.fieldOfView=65;
      world.transform.SetPositionAndRotation(new Vector3(3,1.55f,-13),Quaternion.Euler(-17,137,0));
      int checks=0;
      foreach(int kind in new[]{0,1,3,4}) {
        var weapon=DuelWorld.MakeWeapon(view.transform,kind);
        var muzzle=DuelWorld.WeaponMuzzle(weapon);
        if(!muzzle)throw new Exception($"Missing muzzle for weapon {kind}");
        float tip=kind==0?.49f:kind==1?.19f:kind==3?.475f:.525f;
        if(Mathf.Abs(muzzle.localPosition.z-tip)>.002f)throw new Exception($"Muzzle is not on barrel tip: {kind}");
        foreach(float aspect in new[]{16f/9,4f/3,21f/9})foreach(float fov in new[]{80f,65f,52f,24f})foreach(float kick in new[]{0f,.19f}) {
          world.aspect=view.aspect=aspect;world.fieldOfView=fov;
          weapon.localPosition=new Vector3(fov>=65?.24f:0,-.2f,.59f-kick*.5f);
          weapon.localRotation=Quaternion.Euler(-kick*22,0,0);
          Vector3 barrel=view.WorldToViewportPoint(muzzle.position);
          Vector3 tracer=world.WorldToViewportPoint(DuelShotTracer.ProjectMuzzle(muzzle,world,view));
          if(Vector2.Distance(barrel,tracer)>.0001f||tracer.z<=0)throw new Exception($"Tracer misses barrel: weapon={kind} FOV={fov} aspect={aspect}");
          checks++;
        }
        Debug.Log($"RIVALS_MUZZLE weapon={kind} local={muzzle.localPosition:F4}");
        Object.DestroyImmediate(weapon.gameObject);
        var remote=DuelWorld.MakeWeapon(null,kind,false);remote.localScale=Vector3.one*.8f;
        if(!DuelWorld.WeaponMuzzle(remote))throw new Exception($"Missing remote muzzle: {kind}");
        Object.DestroyImmediate(remote.gameObject);
      }
      var knife=DuelWorld.MakeWeapon(null,2);
      if(DuelWorld.WeaponMuzzle(knife))throw new Exception("Knife must not have a bullet muzzle");
      Object.DestroyImmediate(knife.gameObject);
      Object.DestroyImmediate(world.gameObject);
      RenderMuzzles();
      Debug.Log($"RIVALS_GUN_PRESENTATION_OK projections={checks} firearms=4 knife=1");
    }

    static void RenderMuzzles() {
      var camera=new GameObject("Review camera").AddComponent<Camera>();
      camera.orthographic=true;camera.orthographicSize=.36f;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.32f,.42f,.52f);
      var light=new GameObject("Review light").AddComponent<Light>();light.type=LightType.Directional;light.intensity=2;light.transform.rotation=Quaternion.Euler(45,-30,0);
      var target=new RenderTexture(800,400,24);camera.targetTexture=target;
      var sheet=new Texture2D(800,1600,TextureFormat.RGB24,false);
      int row=0;
      foreach(int kind in new[]{0,1,3,4}) {
        var weapon=DuelWorld.MakeWeapon(null,kind,false);
        var muzzle=DuelWorld.WeaponMuzzle(weapon);
        var marker=GameObject.CreatePrimitive(PrimitiveType.Sphere);marker.transform.position=muzzle.position;marker.transform.localScale=Vector3.one*.025f;
        var material=new Material(Shader.Find("Universal Render Pipeline/Unlit"));material.color=Color.magenta;marker.GetComponent<Renderer>().sharedMaterial=material;
        camera.transform.position=new Vector3(2,.18f,.12f);camera.transform.LookAt(new Vector3(0,0,.12f));
        camera.Render();RenderTexture.active=target;
        sheet.ReadPixels(new Rect(0,0,800,400),0,(3-row)*400);
        Object.DestroyImmediate(marker);Object.DestroyImmediate(material);Object.DestroyImmediate(weapon.gameObject);row++;
      }
      sheet.Apply();Directory.CreateDirectory("Logs");File.WriteAllBytes("Logs/gun-muzzle-review.png",sheet.EncodeToPNG());
      RenderTexture.active=null;camera.targetTexture=null;target.Release();
      Object.DestroyImmediate(target);Object.DestroyImmediate(sheet);Object.DestroyImmediate(light.gameObject);Object.DestroyImmediate(camera.gameObject);
    }
  }
}
