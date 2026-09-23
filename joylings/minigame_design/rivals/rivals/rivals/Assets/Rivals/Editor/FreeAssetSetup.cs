using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using Object = UnityEngine.Object;

namespace RivalsPrototype.Editor {
  public static class FreeAssetSetup {
    const string Source="Assets/ThirdParty/";
    const string Output="Assets/Rivals/Resources/Art/";
    static T Load<T>(string path) where T:Object {
      var asset=AssetDatabase.LoadAssetAtPath<T>(Source+path);
      if(!asset)throw new Exception("Missing free asset: "+path);
      return asset;
    }
    public static void Build() {
      Directory.CreateDirectory(Output);AssetDatabase.Refresh();
      var path="Assets/Rivals/Resources/DuelArt.asset";
      var art=AssetDatabase.LoadAssetAtPath<DuelArt>(path);
      if(!art){art=ScriptableObject.CreateInstance<DuelArt>();AssetDatabase.CreateAsset(art,path);}
      art.Rifle=Model("QuaterniusUltimateGuns/AssaultRifle_1.fbx","Rifle",.98f,false,null);
      art.Pistol=Model("QuaterniusUltimateGuns/Pistol_1.fbx","Pistol",.38f,false,null);
      art.Shotgun=Model("QuaterniusUltimateGuns/Shotgun_1.fbx","Shotgun",.95f,false,null);
      art.Sniper=Model("QuaterniusUltimateGuns/SniperRifle_1.fbx","Sniper",1.05f,false,null);
      art.Knife=Model("QuaterniusToonGuns/Knife_1.fbx","Knife",.52f,false,null);
      art.Character=Model("Kenney-blocky-characters/Models/FBX format/character-b.fbx","Character",1.85f,true,
        Load<Texture2D>("Kenney-blocky-characters/Models/FBX format/Textures/texture-b.png"));
      var crateTexture=Load<Texture2D>("Kenney-blaster-kit/Models/FBX format/Textures/colormap.png");
      art.Crate=Model("Kenney-blaster-kit/Models/FBX format/crate-medium.fbx","Crate",1.2f,true,crateTexture);
      art.Target=Model("Kenney-blaster-kit/Models/FBX format/target-large.fbx","Target",1.3f,true,crateTexture);
      art.Floor=Load<Texture2D>("Kenney-prototype-textures/PNG/Light/texture_01.png");
      art.Crosshair=Load<Texture2D>("Kenney-crosshair-pack/PNG/Light/crosshair-005.png");
      art.WeaponIcons=Enumerable.Range(0,5).Select(i=>AssetDatabase.LoadAssetAtPath<Texture2D>(Output+$"Icons/weapon-{i}.png")).ToArray();
      art.RifleShot=Load<AudioClip>("TabascoGunshots/Processed/sks.wav");
      art.PistolShot=Load<AudioClip>("TabascoGunshots/Processed/cz.wav");
      art.ShotgunShot=Load<AudioClip>("TabascoGunshots/Processed/shotty.wav");
      art.SniperShot=Load<AudioClip>("TabascoGunshots/Processed/mosin.wav");
      art.Reload=Load<AudioClip>("SpringySpringoReload/assaultriflereload1_0.wav");
      art.Hit=Load<AudioClip>("Kenney-impact-sounds/Audio/impactMetal_light_000.ogg");
      art.Footsteps=Enumerable.Range(0,5).Select(i=>Load<AudioClip>($"Kenney-impact-sounds/Audio/footstep_concrete_{i:000}.ogg")).ToArray();
      EditorUtility.SetDirty(art);AssetDatabase.SaveAssets();
      Debug.Log("RIVALS_FREE_ASSETS_READY");
    }
    static GameObject Model(string path,string name,float size,bool grounded,Texture2D texture) {
      if(name=="Character") {
        var importer=(ModelImporter)AssetImporter.GetAtPath(Source+path);
        if(importer.animationType!=ModelImporterAnimationType.Legacy){importer.animationType=ModelImporterAnimationType.Legacy;importer.SaveAndReimport();}
      }
      var source=Load<GameObject>(path);
      var root=new GameObject(name);
      var model=(GameObject)PrefabUtility.InstantiatePrefab(source);
      model.transform.SetParent(root.transform,false);
      var bounds=new Bounds();bool first=true;
      foreach(var renderer in model.GetComponentsInChildren<Renderer>()) {
        if(first){bounds=renderer.bounds;first=false;}else bounds.Encapsulate(renderer.bounds);
      }
      Debug.Log($"RIVALS_MODEL {name} bounds={bounds.size} center={bounds.center}");
      // Imported weapons use their longest horizontal axis as the barrel axis.
      if(!grounded && bounds.size.x>bounds.size.z)model.transform.localRotation=Quaternion.Euler(0,90,0)*model.transform.localRotation;
      if(name=="Knife")model.transform.localRotation=Quaternion.Euler(90,0,0)*model.transform.localRotation;
      if(name=="Target")model.transform.localRotation=Quaternion.Euler(0,90,0);
      bounds=BoundsOf(model);
      float scale=size/Mathf.Max(.001f,grounded?bounds.size.y:Mathf.Max(bounds.size.x,bounds.size.z));
      model.transform.localScale*=scale;bounds=BoundsOf(model);
      model.transform.localPosition-=grounded?new Vector3(bounds.center.x,bounds.min.y,bounds.center.z):bounds.center;
      if(name=="Rifle"||name=="Pistol"||name=="Shotgun"||name=="Sniper") {
        // Bake a socket at the centre of the barrel's front face. Mesh vertices
        // are read only in the editor, so player builds need no readable meshes.
        var vertices=model.GetComponentsInChildren<MeshFilter>()
          .SelectMany(filter=>filter.sharedMesh.vertices.Select(vertex=>root.transform.InverseTransformPoint(filter.transform.TransformPoint(vertex)))).ToArray();
        float front=vertices.Max(vertex=>vertex.z);
        var face=vertices.Where(vertex=>vertex.z>=front-.0001f).ToArray();
        var muzzle=new GameObject("Muzzle").transform;muzzle.SetParent(root.transform,false);
        muzzle.localPosition=new Vector3((face.Min(v=>v.x)+face.Max(v=>v.x))*.5f,(face.Min(v=>v.y)+face.Max(v=>v.y))*.5f,front);
      }
      foreach(var renderer in model.GetComponentsInChildren<Renderer>()) {
        var materials=renderer.sharedMaterials;
        for(int i=0;i<materials.Length;i++) {
          var original=materials[i];
          var materialPath=Output+name+"-"+renderer.name.Replace("/","-")+"-"+i+".mat";
          var material=AssetDatabase.LoadAssetAtPath<Material>(materialPath);
          if(!material){material=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(material,materialPath);}
          material.color=texture?Color.white:original&&original.HasProperty("_Color")?original.color:Color.gray;
          if(!grounded)material.color=WeaponColor(name,original?original.name:"",material.color);
          material.mainTexture=texture?texture:original?original.mainTexture:null;
          material.SetFloat("_Smoothness",.22f);
          EditorUtility.SetDirty(material);materials[i]=material;
        }
        renderer.sharedMaterials=materials;
      }
      // Keep the authored mesh and rig; presentation drives bones without root motion.
      foreach(var animator in model.GetComponentsInChildren<Animator>())Object.DestroyImmediate(animator);
      foreach(var collider in model.GetComponentsInChildren<Collider>())Object.DestroyImmediate(collider);
      if(name=="Character") {
        var animation=model.GetComponent<Animation>()??model.AddComponent<Animation>();
        foreach(var clip in AssetDatabase.LoadAllAssetsAtPath(Source+path).OfType<AnimationClip>().Where(c=>c.legacy&&!c.name.StartsWith("__preview__"))) {
          animation.AddClip(clip,clip.name);
          if(!animation.clip||clip.name.ToLowerInvariant().Contains("idle"))animation.clip=clip;
        }
        animation.wrapMode=WrapMode.Loop;animation.playAutomatically=true;
      }
      var clips=AssetDatabase.LoadAllAssetsAtPath(Source+path).OfType<AnimationClip>().Where(c=>!c.name.StartsWith("__preview__")).Select(c=>c.name);
      Debug.Log($"RIVALS_MODEL_CLIPS {name}: {string.Join(",",clips)}");
      var prefab=PrefabUtility.SaveAsPrefabAsset(root,Output+name+".prefab");
      Object.DestroyImmediate(root);return prefab;
    }
    static Color WeaponColor(string weapon,string material,Color fallback) {
      string part=material.ToLowerInvariant();var ink=new Color(.055f,.065f,.08f);var metal=new Color(.17f,.19f,.22f);
      if(weapon=="Rifle")return part=="darkmetal"||part.Contains("wood")?new Color(.95f,.56f,.16f):part=="black"?ink:metal;
      if(weapon=="Pistol")return part=="black"?ink:metal;
      if(weapon=="Shotgun")return part.Contains("wood")?new Color(.11f,.13f,.16f):part=="black"?ink:metal;
      if(weapon=="Sniper")return part=="black"||part=="darkmetal"?ink:new Color(.23f,.42f,.08f);
      if(weapon=="Knife")return part.Contains("wood")?ink:part.Contains("light")?new Color(.83f,.86f,.9f):new Color(.55f,.6f,.66f);
      return fallback;
    }
    static Bounds BoundsOf(GameObject go){var rs=go.GetComponentsInChildren<Renderer>();var b=rs[0].bounds;foreach(var r in rs.Skip(1))b.Encapsulate(r.bounds);return b;}
  }
}
