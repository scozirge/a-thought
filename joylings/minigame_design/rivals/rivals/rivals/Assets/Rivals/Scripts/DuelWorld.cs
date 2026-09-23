using UnityEngine;
using System.Collections.Generic;

namespace RivalsPrototype {
  public class DuelWorld : MonoBehaviour {
    public static Material TracerMaterial;
    static readonly Dictionary<Color,Material> materials=new Dictionary<Color,Material>();
    public static Material ColorMaterial(Color color) {
      if(materials.TryGetValue(color,out var cached)&&cached)return cached;
      var m = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
      m.color = color;m.SetFloat("_Smoothness",.18f);materials[color]=m;return m;
    }
    public static GameObject Block(Transform parent, string name, Vector3 pos, Vector3 scale, Color color, bool collider = true) {
      var g = GameObject.CreatePrimitive(PrimitiveType.Cube); g.name = name; g.transform.SetParent(parent, false);
      g.transform.localPosition = pos; g.transform.localScale = scale;
      g.GetComponent<Renderer>().sharedMaterial = ColorMaterial(color);
      if (!collider) RemoveCollider(g);
      return g;
    }
    public static void RemoveCollider(GameObject go) {var collider=go.GetComponent<Collider>();if(Application.isPlaying)Destroy(collider);else DestroyImmediate(collider);}
    public static Transform MakeWeapon(Transform parent, int kind, bool firstPerson=true,int seat=0) {
      var root = new GameObject("View weapon").transform; root.SetParent(parent, false);
      var dark = new Color(.055f,.065f,.08f);
      var prefab=DuelArt.Get?DuelArt.Get.Weapon(kind):null;
      if(prefab) {
        var model=Instantiate(prefab,root,false);model.name="Weapon model";
        model.transform.localPosition=new Vector3(0,0,.12f);
        WeaponDetails(root,kind);
        if(firstPerson) {
          root.localScale=Vector3.one*.72f;
          var grip=kind==1?new Vector3(.015f,-.065f,.015f):kind==2?new Vector3(.015f,0,-.075f):new Vector3(.015f,-.11f,-.09f);
          Block(root,"Trigger hand",grip,new Vector3(.13f,.16f,.16f),DuelAvatar.Skin(seat),false);
          Forearm(root,"Right sleeve",new Vector3(.21f,-.43f,-.32f),grip+new Vector3(0,-.065f,-.015f),dark);
          if(kind!=1&&kind!=2) {
            var support=new Vector3(-.015f,-.045f,.30f);
            Block(root,"Supporting hand",support,new Vector3(.14f,.13f,.18f),DuelAvatar.Skin(seat),false);
            Forearm(root,"Left sleeve",new Vector3(-.32f,-.39f,-.16f),support+new Vector3(-.03f,-.075f,-.025f),dark);
          }
          SetViewLayer(root);
        }
        return root;
      }
      Block(root,"Grip",new Vector3(0,-.09f,0),new Vector3(.09f,.2f,.12f),dark,false);
      if(kind == 2) {
        Block(root,"Blade",new Vector3(0,.04f,.18f),new Vector3(.025f,.09f,.4f),new Color(.72f,.85f,.92f),false);
        Block(root,"Guard",new Vector3(0,.02f,0),new Vector3(.2f,.04f,.04f),dark,false);
      } else {
        Block(root,"Receiver",Vector3.zero,new Vector3(.12f,.12f,kind == 0 ? .42f : .23f),dark,false);
        Block(root,"Barrel",new Vector3(0,.02f,kind == 0 ? .33f : .2f),new Vector3(.04f,.04f,.2f),Color.black,false);
        var muzzle=new GameObject("Muzzle").transform;muzzle.SetParent(root,false);
        muzzle.localPosition=new Vector3(0,.02f,kind==0?.43f:.3f);
        Block(root,"Sight",new Vector3(0,.08f,.08f),new Vector3(.025f,.04f,.04f),Color.black,false);
        if(kind == 0) Block(root,"Magazine",new Vector3(0,-.12f,.1f),new Vector3(.085f,.2f,.1f),new Color(.28f,.32f,.36f),false);
      }
      if(firstPerson){root.localScale=Vector3.one*.72f;SetViewLayer(root);}
      return root;
    }
    public static Transform WeaponMuzzle(Transform weapon) {
      return weapon.Find("Weapon model/Muzzle")??weapon.Find("Muzzle");
    }
    static void WeaponDetails(Transform root,int kind) {
      var black=new Color(.055f,.065f,.08f);var orange=new Color(.95f,.56f,.16f);
      if(kind==0) {
        Block(root,"Stock",new Vector3(0,.055f,-.32f),new Vector3(.09f,.115f,.24f),orange,false);
        Block(root,"Stock pad",new Vector3(0,.035f,-.445f),new Vector3(.105f,.17f,.035f),black,false);
        Block(root,"Optic rail",new Vector3(0,.13f,.09f),new Vector3(.055f,.025f,.55f),black,false);
        Ring(root,"Rear sight",new Vector3(0,.185f,-.13f),.036f,black);
        Ring(root,"Front sight",new Vector3(0,.185f,.41f),.027f,black);
      }
      if(kind==3)for(int shell=0;shell<4;shell++) {
        var cartridge=GameObject.CreatePrimitive(PrimitiveType.Cylinder);cartridge.name="Shell holder";cartridge.transform.SetParent(root,false);
        cartridge.transform.localPosition=new Vector3(.069f,.018f,-.07f+shell*.045f);cartridge.transform.localScale=new Vector3(.017f,.041f,.017f);
        cartridge.GetComponent<Renderer>().sharedMaterial=ColorMaterial(new Color(.82f,.12f,.10f));RemoveCollider(cartridge);
        Block(root,"Brass shell cap",cartridge.transform.localPosition+Vector3.up*.039f,new Vector3(.029f,.015f,.028f),new Color(.85f,.63f,.23f),false);
      }
    }
    static void Ring(Transform parent,string name,Vector3 center,float radius,Color color) {
      var line=new GameObject(name).AddComponent<LineRenderer>();line.transform.SetParent(parent,false);line.useWorldSpace=false;line.loop=true;
      line.sharedMaterial=ColorMaterial(color);line.startWidth=line.endWidth=.012f;line.positionCount=12;
      for(int i=0;i<12;i++){float a=i*Mathf.PI/6;line.SetPosition(i,center+new Vector3(Mathf.Cos(a),Mathf.Sin(a),0)*radius);}
    }
    static void Forearm(Transform parent,string name,Vector3 start,Vector3 end,Color color) {
      var arm=Block(parent,name,(start+end)*.5f,new Vector3(.175f,.175f,Vector3.Distance(start,end)),color,false);
      arm.transform.localRotation=Quaternion.LookRotation(end-start);
    }
    static void SetViewLayer(Transform root) {
      foreach(var part in root.GetComponentsInChildren<Transform>())part.gameObject.layer=30;
      foreach(var renderer in root.GetComponentsInChildren<Renderer>())renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
    }
    static Material gridMaterial;
    static Material GridMaterial() {
      if(gridMaterial)return gridMaterial;
      var texture=new Texture2D(128,128,TextureFormat.RGB24,false){wrapMode=TextureWrapMode.Repeat,filterMode=FilterMode.Bilinear,anisoLevel=4};
      for(int y=0;y<128;y++)for(int x=0;x<128;x++) {
        int dx=Mathf.Min(x,127-x),dy=Mathf.Min(y,127-y);
        var color=new Color(.9f,.91f,.93f);
        if(dx<1||dy<1)color=new Color(.70f,.73f,.78f);
        if((dx<3&&dy<10)||(dy<3&&dx<10))color=new Color(.58f,.62f,.68f);
        texture.SetPixel(x,y,color);
      }
      texture.Apply(false,true);gridMaterial=new Material(Shader.Find("Universal Render Pipeline/Lit"));gridMaterial.mainTexture=texture;gridMaterial.SetFloat("_Smoothness",.08f);return gridMaterial;
    }
    static GameObject GridBlock(Transform parent,string name,Vector3 position,Vector3 size) {
      var go=Block(parent,name,position,size,Color.white);go.GetComponent<Renderer>().sharedMaterial=GridMaterial();
      var mesh=go.GetComponent<MeshFilter>().mesh;var vertices=mesh.vertices;var normals=mesh.normals;var uv=new Vector2[vertices.Length];
      for(int i=0;i<vertices.Length;i++) {
        var point=Vector3.Scale(vertices[i],size)+position;
        uv[i]=Mathf.Abs(normals[i].y)>.5f?new Vector2(point.x,point.z)/2:Mathf.Abs(normals[i].x)>.5f?new Vector2(point.z,point.y)/2:new Vector2(point.x,point.y)/2;
      }
      mesh.uv=uv;return go;
    }
    void Awake() {
      TracerMaterial=new Material(Shader.Find("Universal Render Pipeline/Unlit"));TracerMaterial.color=new Color(1,.83f,.35f);
      RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Trilight;
      RenderSettings.ambientSkyColor=new Color(.77f,.83f,.94f);RenderSettings.ambientEquatorColor=new Color(.60f,.65f,.73f);RenderSettings.ambientGroundColor=new Color(.35f,.38f,.43f);
      RenderSettings.fog=true;RenderSettings.fogColor=new Color(.66f,.79f,.94f);RenderSettings.fogMode=FogMode.Linear;RenderSettings.fogStartDistance=90;RenderSettings.fogEndDistance=160;
      GridBlock(transform,"Grid arena floor",new Vector3(0,-.3f,0),new Vector3(80,.6f,80));
      var blue=new Color(.18f,.48f,.94f);var red=new Color(.94f,.28f,.24f);
      foreach(var z in new[]{-36f,36f})GridBlock(transform,"Grid perimeter",new Vector3(0,2.8f,z),new Vector3(73,5.6f,1));
      foreach(var x in new[]{-36f,36f})GridBlock(transform,"Grid perimeter",new Vector3(x,2.8f,0),new Vector3(1,5.6f,73));
      var covers=new[]{new Vector4(-5,-5,4,3),new Vector4(5,5,4,3),new Vector4(6,-7,3,4),new Vector4(-6,7,3,4)};
      for(int i=0;i<covers.Length;i++) {
        var c=covers[i];GridBlock(transform,"Grid cover",new Vector3(c.x,1.4f,c.y),new Vector3(c.z,2.8f,c.w));
      }
      // Staggered tall screens break every opposing spawn sightline while
      // retaining a winding middle route and both wide outer lanes.
      GridBlock(transform,"Central sight screen",new Vector3(0,2.2f,0),new Vector3(14,4.4f,1.2f));
      foreach(int sign in new[]{-1,1}) {
        GridBlock(transform,"Staggered sight screen",new Vector3(sign*12,2.2f,sign*5),new Vector3(12,4.4f,1.2f));
        Block(transform,"Screen top stripe",new Vector3(sign*12,4.25f,sign*5),new Vector3(12.02f,.12f,1.22f),new Color(.34f,.43f,.52f),false);
      }
      Block(transform,"Central screen top stripe",new Vector3(0,4.25f,0),new Vector3(14.02f,.12f,1.22f),new Color(.34f,.43f,.52f),false);
      foreach(int sign in new[]{-1,1}) {
        var team=sign<0?blue:red;
        foreach(int side in new[]{-1,1})GridBlock(transform,"Door pillar",new Vector3(side*3.3f,1.6f,sign*9),new Vector3(.9f,3.2f,1));
        GridBlock(transform,"Door lintel",new Vector3(0,3.35f,sign*9),new Vector3(7.5f,.5f,1));
        Block(transform,"Team doorway stripe",new Vector3(0,3.05f,sign*9),new Vector3(5.7f,.065f,1.015f),team,false);
        Block(transform,"Team spawn stripe",new Vector3(0,.008f,sign*31),new Vector3(42,.016f,.16f),team,false);
        GridBlock(transform,"Side platform",new Vector3(sign*14,1,0),new Vector3(4,2,7));
        for(int step=0;step<8;step++)GridBlock(transform,"Platform stairs",new Vector3(sign*14,(step+1)*.125f,-7.5f+step*.5f),new Vector3(4,(step+1)*.25f,.5f));
        GridBlock(transform,"Platform cover",new Vector3(sign*15,2.55f,2),new Vector3(1.25f,1.1f,1.25f));
        foreach(int side in new[]{-1,1}) {
          GridBlock(transform,"Outer lane cover",new Vector3(side*23,1.4f,sign*16),new Vector3(6,2.8f,3));
          GridBlock(transform,"Spawn approach cover",new Vector3(side*9,1.3f,sign*23),new Vector3(5,2.6f,3));
          GridBlock(transform,"Outer low cover",new Vector3(side*29,.6f,sign*5),new Vector3(3,1.2f,5));
          GridBlock(transform,"Low approach barricade",new Vector3(side*8,.475f,sign*15),new Vector3(4,.95f,1.2f));
          GridBlock(transform,"Tall lane pillar",new Vector3(side*24,1.8f,sign*9),new Vector3(2.4f,3.6f,2.4f));
          GridBlock(transform,"Raised flank deck",new Vector3(side*18,.75f,sign*20),new Vector3(5,1.5f,3));
          for(int step=0;step<6;step++)GridBlock(transform,"Flank deck stairs",new Vector3(side*18,(step+1)*.125f,sign*(15.75f+step*.5f)),new Vector3(3,(step+1)*.25f,.5f));
          GridBlock(transform,"Deck low barricade",new Vector3(side*18,2.025f,sign*21),new Vector3(3,1.05f,.6f));
          GridBlock(transform,"Corner approach screen",new Vector3(side*26,1.3f,sign*26),new Vector3(2,2.6f,3));
          Block(transform,"Outer lane marker",new Vector3(side*31,.012f,sign*22),new Vector3(.15f,.02f,13),team,false);
        }
      }
      Physics.SyncTransforms();
    }
  }
}
