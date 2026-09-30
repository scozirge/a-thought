using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace RivalsPrototype {
  // Original stylised geometry, shared by first-person, pickups and projectiles.
  // Static pieces are combined by material to keep mobile draw calls bounded.
  public static class DuelWeaponModels {
    static readonly Color Metal=new Color(.16f,.23f,.29f),Steel=new Color(.55f,.69f,.76f),Dark=new Color(.035f,.055f,.075f);
    static readonly Color Brass=new Color(.91f,.57f,.16f),Orange=new Color(.94f,.31f,.09f),Green=new Color(.40f,.96f,.12f);
    public static bool Custom(int kind)=>kind==Weapons.Cleaver||kind>=Weapons.Gatling;
    public static Transform Build(Transform parent,int kind,bool firstPerson,int seat) {
      var root=new GameObject(Weapons.Names[kind]+" model").transform;root.SetParent(parent,false);
      var rig=new GameObject("Weapon rig").transform;rig.SetParent(root,false);
      switch(kind) {
        case Weapons.Gatling:Gatling(rig);break;
        case Weapons.Rocket:Launcher(rig);break;
        case Weapons.Nuke:Designator(rig);break;
        case Weapons.Cleaver:Cleaver(rig);break;
        case Weapons.Poison:Flask(rig);break;
      }
      if(firstPerson) {
        root.localScale=Vector3.one*.72f;
        var grip=new Vector3(.015f,-.15f,-.08f);
        Box(root,"Trigger hand",grip,new Vector3(.13f,.15f,.15f),DuelAvatar.Skin(seat));
        Rod(root,"Right sleeve",new Vector3(.23f,-.43f,-.36f),grip,new Vector2(.16f,.16f),Dark);
        if(kind==Weapons.Gatling||kind==Weapons.Rocket) {
          var support=new Vector3(-.02f,-.13f,.24f);
          Box(root,"Supporting hand",support,new Vector3(.14f,.14f,.17f),DuelAvatar.Skin(seat));
          Rod(root,"Left sleeve",new Vector3(-.32f,-.43f,-.17f),support,new Vector2(.16f,.16f),Dark);
        }
        foreach(var part in root.GetComponentsInChildren<Transform>())part.gameObject.layer=30;
        foreach(var renderer in root.GetComponentsInChildren<Renderer>())renderer.shadowCastingMode=ShadowCastingMode.Off;
      }
      var motion=root.gameObject.AddComponent<DuelWeaponMotion>();motion.Configure(kind,rig);
      Combine(rig,root.gameObject.AddComponent<DuelGeneratedMeshes>());
      return root;
    }

    static void Gatling(Transform root) {
      Box(root,"Motor housing",new Vector3(0,0,-.20f),new Vector3(.30f,.29f,.34f),Metal);
      Box(root,"Copper heat sink",new Vector3(0,.15f,-.20f),new Vector3(.24f,.025f,.23f),Brass);
      for(int i=0;i<5;i++)Box(root,"Cooling fin",new Vector3(0,.02f,-.35f+i*.055f),new Vector3(.32f,.32f,.018f),Dark);
      Cylinder(root,"Barrel collar",new Vector3(0,0,.015f),.18f,.11f,Steel,true);
      var rotor=new GameObject("Rotors").transform;rotor.SetParent(root,false);
      for(int i=0;i<6;i++) {
        float angle=i*Mathf.PI/3;var offset=new Vector3(Mathf.Cos(angle),Mathf.Sin(angle),0)*.105f;
        Cylinder(rotor,"Spinning barrel",offset+Vector3.forward*.30f,.036f,.58f,Metal,true);
        Cylinder(rotor,"Copper muzzle",offset+Vector3.forward*.60f,.038f,.045f,Brass,true);
        Cylinder(rotor,"Bore",offset+Vector3.forward*.626f,.022f,.007f,Dark,true);
      }
      Cylinder(rotor,"Front brace",new Vector3(0,0,.49f),.165f,.055f,Dark,true);
      Cylinder(root,"Ammo drum",new Vector3(.24f,-.12f,-.18f),.17f,.26f,Metal);
      Cylinder(root,"Drum lid",new Vector3(.24f,.014f,-.18f),.175f,.022f,Brass);
      for(int i=0;i<6;i++)Cylinder(root,"Ammunition belt",new Vector3(.15f+i*.027f,-.04f,.015f),.018f,.12f,Brass,true);
      Box(root,"Grip",new Vector3(0,-.21f,-.25f),new Vector3(.10f,.23f,.12f),Dark);
      Box(root,"Carry handle",new Vector3(0,.235f,-.07f),new Vector3(.11f,.045f,.23f),Dark);
      Box(root,"Handle support",new Vector3(0,.20f,-.18f),new Vector3(.08f,.10f,.04f),Brass);
      Muzzle(root,new Vector3(0,0,.635f));
    }
    static void Launcher(Transform root) {
      Cylinder(root,"Launcher tube",new Vector3(0,.03f,.10f),.16f,.78f,new Color(.23f,.32f,.23f),true);
      Cylinder(root,"Rear blast guard",new Vector3(0,.03f,-.32f),.21f,.13f,Dark,true);
      Cylinder(root,"Front copper rim",new Vector3(0,.03f,.50f),.18f,.07f,Orange,true);
      Cylinder(root,"Open launcher mouth",new Vector3(0,.03f,.541f),.135f,.012f,Dark,true);
      for(int i=0;i<3;i++)Cylinder(root,"Reinforcement band",new Vector3(0,.03f,-.12f+i*.22f),.17f,.035f,Steel,true);
      Box(root,"Launcher grip",new Vector3(0,-.20f,-.12f),new Vector3(.10f,.25f,.13f),Dark);
      Box(root,"Support rail",new Vector3(0,-.15f,.24f),new Vector3(.12f,.07f,.31f),Metal);
      Box(root,"Range finder",new Vector3(-.14f,.18f,.14f),new Vector3(.10f,.12f,.26f),Dark);
      Box(root,"Range glass",new Vector3(-.14f,.18f,.278f),new Vector3(.077f,.078f,.009f),new Color(.22f,.92f,1));
      for(int i=0;i<2;i++)Ring(root,"Infinite charge",new Vector3(.163f,.025f,.05f+i*.07f),.044f,Brass,Vector3.right);
      Muzzle(root,new Vector3(0,.03f,.55f));
    }
    static void Designator(Transform root) {
      Box(root,"Designator body",new Vector3(0,0,.06f),new Vector3(.24f,.17f,.38f),Metal);
      Box(root,"Rubber grip",new Vector3(0,-.14f,-.06f),new Vector3(.10f,.21f,.12f),Dark);
      Box(root,"Hazard side panel",new Vector3(.125f,0,.09f),new Vector3(.015f,.11f,.24f),Brass);
      for(int i=0;i<3;i++){var stripe=Box(root,"Hazard stripe",new Vector3(.134f,0,.01f+i*.085f),new Vector3(.008f,.13f,.023f),Dark);stripe.localRotation=Quaternion.Euler(28,0,0);}
      Box(root,"Screen bezel",new Vector3(0,.105f,-.01f),new Vector3(.19f,.04f,.22f),Dark);
      Box(root,"Radar display",new Vector3(0,.128f,-.01f),new Vector3(.15f,.009f,.18f),new Color(.07f,.34f,.29f));
      Box(root,"Screen cross X",new Vector3(0,.134f,-.01f),new Vector3(.11f,.005f,.008f),Green);
      Box(root,"Screen cross Y",new Vector3(0,.134f,-.01f),new Vector3(.008f,.005f,.14f),Green);
      Cylinder(root,"Laser lens barrel",new Vector3(0,0,.28f),.06f,.13f,Dark,true);
      Cylinder(root,"Infrared lens",new Vector3(0,0,.351f),.041f,.008f,new Color(1,.07f,.06f),true);
      Cylinder(root,"Antenna",new Vector3(-.115f,.23f,-.12f),.012f,.37f,Dark);
      Sphere(root,"Antenna cap",new Vector3(-.115f,.42f,-.12f),Vector3.one*.035f,Brass);
      Muzzle(root,new Vector3(0,0,.36f));
    }
    static void Cleaver(Transform root) {
      Box(root,"Walnut handle",new Vector3(0,-.10f,-.07f),new Vector3(.075f,.28f,.10f),new Color(.24f,.095f,.045f));
      Box(root,"Steel tang",new Vector3(0,-.10f,-.07f),new Vector3(.015f,.31f,.105f),Steel);
      for(int i=0;i<3;i++)Sphere(root,"Brass rivet",new Vector3(.041f,-.19f+i*.085f,-.07f),new Vector3(.014f,.027f,.027f),Brass);
      Box(root,"Chef blade",new Vector3(0,.15f,.095f),new Vector3(.031f,.29f,.40f),Steel);
      Box(root,"Polished cutting bevel",new Vector3(0,.007f,.095f),new Vector3(.014f,.045f,.405f),new Color(.88f,.96f,1));
      Box(root,"Spine",new Vector3(0,.295f,.095f),new Vector3(.043f,.022f,.41f),Metal);
      Cylinder(root,"Blade hole",new Vector3(.017f,.235f,.22f),.032f,.004f,Dark,false,Vector3.right);
      Ring(root,"Blade hole rim",new Vector3(.020f,.235f,.22f),.037f,new Color(.82f,.89f,.92f),Vector3.right);
      Box(root,"Teal grip wrap",new Vector3(0,-.23f,-.07f),new Vector3(.083f,.035f,.11f),new Color(.05f,.61f,.63f));
    }
    static void Flask(Transform root) {
      var glass=Sphere(root,"Faceted glass",new Vector3(0,.025f,.05f),new Vector3(.28f,.32f,.28f),new Color(.09f,.38f,.24f));
      glass.GetComponent<Renderer>().sharedMaterial=DuelOrdnanceView.EffectMaterial(new Color(.38f,.90f,.64f,.30f));
      Sphere(root,"Glowing poison",new Vector3(0,-.025f,.05f),new Vector3(.235f,.205f,.235f),Green);
      Cylinder(root,"Glass neck",new Vector3(0,.20f,.05f),.065f,.14f,new Color(.10f,.44f,.30f));
      Cylinder(root,"Copper seal",new Vector3(0,.265f,.05f),.08f,.065f,Brass);
      Cylinder(root,"Black stopper",new Vector3(0,.305f,.05f),.05f,.03f,Dark);
      Cylinder(root,"Bottle foot",new Vector3(0,-.15f,.05f),.10f,.025f,Metal);
      Box(root,"Toxic label",new Vector3(0,.015f,-.091f),new Vector3(.135f,.13f,.013f),Dark);
      for(int side=-1;side<=1;side+=2)Sphere(root,"Warning eyes",new Vector3(side*.028f,.035f,-.104f),new Vector3(.024f,.027f,.01f),Green);
      Box(root,"Warning jaw",new Vector3(0,-.008f,-.105f),new Vector3(.050f,.016f,.009f),Green);
      for(int i=0;i<3;i++)Sphere(root,"Bubbles",new Vector3(Mathf.Sin(i*2)*.06f,.045f+i*.027f,.04f),Vector3.one*(.025f+i*.006f),new Color(.76f,1,.40f));
    }

    public static Transform Projectile(Transform parent,int kind) {
      var root=new GameObject("Flying "+Weapons.Names[kind]).transform;root.SetParent(parent,false);
      if(kind==Weapons.Poison)Flask(root);
      else if(kind==Weapons.Cleaver)Cleaver(root);
      else {
        Cylinder(root,"Rocket casing",Vector3.zero,.09f,.55f,Metal,true);
        Sphere(root,"Copper warhead",new Vector3(0,0,.29f),new Vector3(.18f,.18f,.25f),Orange);
        Cylinder(root,"Payload stripe",new Vector3(0,0,.12f),.095f,.075f,Brass,true);
        for(int i=0;i<4;i++){var fin=Box(root,"Rocket fin",new Vector3(0,0,-.21f),new Vector3(.025f,.33f,.17f),Steel);fin.localRotation=Quaternion.Euler(0,0,i*45);}
        Sphere(root,"Rocket exhaust",new Vector3(0,0,-.35f),new Vector3(.10f,.10f,.22f),new Color(1,.72f,.15f));
      }
      Combine(root,root.gameObject.AddComponent<DuelGeneratedMeshes>());return root;
    }

    public static Transform NuclearPayload(Transform parent) {
      var root=new GameObject("Falling nuclear payload").transform;root.SetParent(parent,false);
      Cylinder(root,"Payload body",Vector3.zero,.48f,2.8f,new Color(.31f,.35f,.20f));
      Sphere(root,"Payload nose",Vector3.down*1.25f,new Vector3(.96f,1.1f,.96f),Brass);
      Cylinder(root,"Warning band",Vector3.down*.45f,.49f,.40f,Brass);
      for(int i=0;i<4;i++){var fin=Box(root,"Tail fin",Vector3.up*1.2f,new Vector3(.08f,1.1f,1.85f),Metal);fin.localRotation=Quaternion.Euler(0,i*45,0);}
      Combine(root,root.gameObject.AddComponent<DuelGeneratedMeshes>());return root;
    }

    public static Transform Box(Transform parent,string name,Vector3 position,Vector3 scale,Color color)=>DuelWorld.Block(parent,name,position,scale,color,false).transform;
    public static Transform Sphere(Transform parent,string name,Vector3 position,Vector3 scale,Color color)=>Primitive(parent,name,PrimitiveType.Sphere,position,scale,color);
    public static Transform Cylinder(Transform parent,string name,Vector3 position,float radius,float length,Color color,bool forward=false,Vector3? axis=null) {
      var t=Primitive(parent,name,PrimitiveType.Cylinder,position,new Vector3(radius*2,length*.5f,radius*2),color);
      t.localRotation=Quaternion.FromToRotation(Vector3.up,axis??(forward?Vector3.forward:Vector3.up));return t;
    }
    static Transform Primitive(Transform parent,string name,PrimitiveType kind,Vector3 position,Vector3 scale,Color color) {
      var go=GameObject.CreatePrimitive(kind);go.name=name;go.transform.SetParent(parent,false);go.transform.localPosition=position;go.transform.localScale=scale;
      go.GetComponent<Renderer>().sharedMaterial=DuelWorld.ColorMaterial(color);DuelWorld.RemoveCollider(go);return go.transform;
    }
    static void Rod(Transform parent,string name,Vector3 start,Vector3 end,Vector2 size,Color color){var t=Box(parent,name,(start+end)*.5f,new Vector3(size.x,size.y,Vector3.Distance(start,end)),color);t.localRotation=Quaternion.LookRotation(end-start);}
    static void Muzzle(Transform parent,Vector3 position){var t=new GameObject("Muzzle").transform;t.SetParent(parent,false);t.localPosition=position;}
    static void Ring(Transform parent,string name,Vector3 center,float radius,Color color,Vector3 normal) {
      var line=new GameObject(name).AddComponent<LineRenderer>();line.transform.SetParent(parent,false);line.useWorldSpace=false;line.loop=true;line.positionCount=24;
      line.sharedMaterial=DuelWorld.ColorMaterial(color);line.startWidth=line.endWidth=.009f;
      var rotation=Quaternion.FromToRotation(Vector3.forward,normal);
      for(int i=0;i<24;i++){float a=i*Mathf.PI/12;line.SetPosition(i,center+rotation*new Vector3(Mathf.Cos(a),Mathf.Sin(a),0)*radius);}
    }
    static void Combine(Transform root,DuelGeneratedMeshes lifetime) {
      var rotor=root.Find("Rotors");if(rotor)Combine(rotor,lifetime);
      var groups=new Dictionary<Material,List<CombineInstance>>();var originals=new List<MeshFilter>();
      foreach(var filter in root.GetComponentsInChildren<MeshFilter>()) {
        if(rotor&&filter.transform.IsChildOf(rotor))continue;
        var renderer=filter.GetComponent<MeshRenderer>();if(!renderer||!filter.sharedMesh)continue;
        if(!groups.TryGetValue(renderer.sharedMaterial,out var list)){list=new List<CombineInstance>();groups.Add(renderer.sharedMaterial,list);}
        list.Add(new CombineInstance{mesh=filter.sharedMesh,transform=root.worldToLocalMatrix*filter.transform.localToWorldMatrix});originals.Add(filter);
      }
      foreach(var group in groups) {
        var go=new GameObject("Combined detail");go.transform.SetParent(root,false);go.layer=root.gameObject.layer;
        var mesh=new Mesh{name="Original weapon geometry"};mesh.indexFormat=IndexFormat.UInt32;mesh.CombineMeshes(group.Value.ToArray());lifetime.Meshes.Add(mesh);
        go.AddComponent<MeshFilter>().sharedMesh=mesh;var renderer=go.AddComponent<MeshRenderer>();renderer.sharedMaterial=group.Key;
        if(go.layer==30)renderer.shadowCastingMode=ShadowCastingMode.Off;
      }
      foreach(var filter in originals){Remove(filter.GetComponent<MeshRenderer>());Remove(filter);}
    }
    static void Remove(Object item){if(Application.isPlaying)Object.Destroy(item);else Object.DestroyImmediate(item);}
  }
  public sealed class DuelGeneratedMeshes : MonoBehaviour {
    public readonly List<Mesh> Meshes=new List<Mesh>();
    void OnDestroy(){foreach(var mesh in Meshes)if(mesh){if(Application.isPlaying)Destroy(mesh);else DestroyImmediate(mesh);}}
  }
  public sealed class DuelWeaponMotion : MonoBehaviour {
    Transform rotor,sleeve;float spin,until;
    public void Configure(int kind,Transform rig){if(kind==Weapons.Gatling)rotor=rig.Find("Rotors");if(kind==Weapons.Cleaver)sleeve=transform.Find("Right sleeve");}
    public void Pulse(){until=Time.time+.14f;}
    void LateUpdate(){
      if(sleeve){
        // The forearm stays connected to the lower-right shoulder as the wrist chops.
        var shoulder=transform.InverseTransformPoint(transform.parent.TransformPoint(new Vector3(.46f,-.52f,.16f)));
        var grip=new Vector3(.015f,-.15f,-.08f);
        sleeve.localPosition=(shoulder+grip)*.5f;sleeve.localRotation=Quaternion.LookRotation(grip-shoulder);
        sleeve.localScale=new Vector3(.16f,.16f,Vector3.Distance(shoulder,grip));
      }
      if(!rotor)return;spin=Mathf.MoveTowards(spin,Time.time<until?1500:0,Time.deltaTime*4200);rotor.Rotate(0,0,spin*Time.deltaTime,Space.Self);
    }
  }
}
