using System.IO;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object=UnityEngine.Object;

namespace RivalsPrototype.Editor {
  // Render the actual viewmodel at key moments before making a Web build.
  public static class CleaverReview {
    public static void RenderFrames() {
      EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
      var camera=new GameObject("Cleaver review").AddComponent<Camera>();camera.fieldOfView=65;camera.nearClipPlane=.01f;camera.farClipPlane=3;camera.cullingMask=1<<30;
      camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.25f,.34f,.40f);
      var light=new GameObject("Key light").AddComponent<Light>();light.type=LightType.Directional;light.intensity=1.7f;light.transform.rotation=Quaternion.Euler(38,-45,0);
      RenderSettings.ambientLight=new Color(.6f,.65f,.7f);RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Flat;
      var target=new RenderTexture(844,390,24);camera.targetTexture=target;
      var pixels=new Texture2D(844,390,TextureFormat.RGB24,false);
      var weapon=DuelWorld.MakeWeapon(camera.transform,Weapons.Cleaver,true);
      Directory.CreateDirectory("Logs/Chop/Preview");int frame=0;
      foreach(float age in new[]{-1f,.12f,.20f,.30f,.43f,.56f}) {
        DuelCleaverSwing.Pose(age,true,out var offset,out var rotation);
        weapon.localPosition=new Vector3(.24f,-.20f,.59f)+offset;weapon.localRotation=rotation;
        weapon.SendMessage("LateUpdate",SendMessageOptions.DontRequireReceiver);
        camera.Render();RenderTexture.active=target;pixels.ReadPixels(new Rect(0,0,844,390),0,0);pixels.Apply();
        File.WriteAllBytes("Logs/Chop/Preview/chop-"+(frame++)+".png",pixels.EncodeToPNG());
      }
      RenderTexture.active=null;camera.targetTexture=null;target.Release();
      Object.DestroyImmediate(weapon.gameObject);Object.DestroyImmediate(pixels);Object.DestroyImmediate(target);Object.DestroyImmediate(camera.gameObject);Object.DestroyImmediate(light.gameObject);
      Debug.Log("RIVALS_CLEAVER_REVIEW_OK frames=6");
    }
  }
}
