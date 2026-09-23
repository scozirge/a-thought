using UnityEngine;

namespace RivalsPrototype {
  // Original block-avatar geometry. Appearance is deterministic across all peers.
  public class DuelAvatar : MonoBehaviour {
    public Transform GunSocket { get; private set; }
    Transform body,head,leftLeg,rightLeg,leftUpper,leftLower,rightUpper,rightLower;
    Color skin,shirt;
    Renderer[] flashRenderers;
    Color[] baseColors;
    MaterialPropertyBlock flashBlock;
    float flash,fall;
    int fallSide;
    public float FallProgress=>fall;
    public float FlashAmount=>flash;
    public void Rebuild(int seat){if(body)Destroy(body.gameObject);body=null;fall=flash=0;Build(seat);}
    public void Celebrate(float phase) {
      Pose(0,-8,1,true);
      body.localPosition=Vector3.up*(Mathf.Abs(Mathf.Sin(phase*2))*.16f);
      body.localRotation=Quaternion.Euler(0,Mathf.Sin(phase)*9,Mathf.Sin(phase*2)*5);
      Segment(leftUpper,new Vector3(-.46f,1.32f,0),new Vector3(-.7f,1.7f,0),.25f);
      Segment(leftLower,new Vector3(-.7f,1.7f,0),new Vector3(-.85f,2.05f+Mathf.Sin(phase*4)*.12f,0),.235f);
      Segment(rightUpper,new Vector3(.46f,1.32f,0),new Vector3(.7f,1.7f,0),.25f);
      Segment(rightLower,new Vector3(.7f,1.7f,0),new Vector3(.85f,2.05f-Mathf.Sin(phase*4)*.12f,0),.235f);
    }
    static readonly Color Ink=new Color(.065f,.075f,.095f);
    public static Color Skin(int seat) {
      Color[] colors={new Color(.93f,.94f,.95f),new Color(.98f,.80f,.59f),new Color(1f,.80f,.25f),new Color(.74f,.48f,.29f),new Color(.96f,.86f,.75f),new Color(.42f,.26f,.18f),new Color(.83f,.89f,.95f),new Color(.96f,.74f,.51f)};
      return colors[Mathf.Abs(seat)%colors.Length];
    }
    public void Build(int seat) {
      if(body)return;
      skin=Skin(seat);shirt=seat%2==0?new Color(.17f,.43f,.84f):new Color(.9f,.25f,.22f);
      body=new GameObject("Block avatar").transform;body.SetParent(transform,false);
      Box(body,"Torso",new Vector3(0,1.06f,0),new Vector3(.72f,.66f,.36f),seat%3==0?new Color(.91f,.93f,.96f):Ink);
      Box(body,"Team shirt",new Vector3(0,1.12f,.19f),new Vector3(.64f,.43f,.025f),shirt);
      Box(body,"Team back",new Vector3(0,1.12f,-.19f),new Vector3(.64f,.43f,.025f),shirt);
      Box(body,"Jacket seam",new Vector3(0,1.11f,.209f),new Vector3(.025f,.43f,.015f),Ink);
      Box(body,"Chest stripe",new Vector3(.21f,1.22f,.215f),new Vector3(.12f,.035f,.02f),Color.white);
      Box(body,"Belt",new Vector3(0,.76f,0),new Vector3(.73f,.1f,.37f),Ink);
      Box(body,"Buckle",new Vector3(0,.76f,.2f),new Vector3(.105f,.07f,.035f),new Color(.65f,.7f,.74f));
      head=new GameObject("Head pivot").transform;head.SetParent(body,false);head.localPosition=new Vector3(0,1.43f,0);
      Cylinder(head,"Head",new Vector3(0,.24f,0),new Vector3(.55f,.255f,.55f),skin);
      foreach(int side in new[]{-1,1}) {
        var eye=Cylinder(head,"Eye",new Vector3(side*.105f,.285f,.253f),new Vector3(.025f,.008f,.032f),Ink);eye.localRotation=Quaternion.Euler(90,0,0);
      }
      for(int i=0;i<7;i++) {
        float angle=Mathf.Lerp(-62,62,i/6f)*Mathf.Deg2Rad;
        var smile=Box(head,"Smile",new Vector3(Mathf.Sin(angle)*.09f,.19f-Mathf.Cos(angle)*.048f,.264f),new Vector3(.035f,.017f,.011f),Ink);
        smile.localRotation=Quaternion.Euler(0,0,angle*Mathf.Rad2Deg*.5f);
      }
      Color hair=seat%3==1?new Color(.29f,.13f,.055f):Ink;
      if(seat%4==0||seat%4==3) {
        Cylinder(head,"Cap",new Vector3(0,.47f,0),new Vector3(.57f,.07f,.57f),seat%4==0?Ink:shirt);
        Box(head,"Cap brim",new Vector3(0,.415f,.25f),new Vector3(.46f,.055f,.3f),Ink);
      } else {
        Box(head,"Hair",new Vector3(0,.465f,-.045f),new Vector3(.53f,.17f,.47f),hair);
        for(int i=0;i<4;i++) {
          var lockPart=Box(head,"Hair fringe",new Vector3(-.19f+i*.125f,.38f,.20f),new Vector3(.14f,.19f,.12f),hair);
          lockPart.localRotation=Quaternion.Euler(0,0,-18+i*6);
        }
      }
      leftLeg=Leg(-1);rightLeg=Leg(1);
      leftUpper=Box(body,"Left upper arm",Vector3.zero,Vector3.one,shirt);
      leftLower=Box(body,"Left hand",Vector3.zero,Vector3.one,skin);
      rightUpper=Box(body,"Right upper arm",Vector3.zero,Vector3.one,shirt);
      rightLower=Box(body,"Right hand",Vector3.zero,Vector3.one,skin);
      GunSocket=new GameObject("Held weapon").transform;GunSocket.SetParent(body,false);
      flashRenderers=body.GetComponentsInChildren<Renderer>();baseColors=new Color[flashRenderers.Length];
      for(int i=0;i<baseColors.Length;i++)baseColors[i]=flashRenderers[i].sharedMaterial.color;
      flashBlock=new MaterialPropertyBlock();fallSide=seat%2==0?1:-1;
      Pose(0,0,0,true);
    }
    Transform Leg(int side) {
      var leg=new GameObject("Leg").transform;leg.SetParent(body,false);leg.localPosition=new Vector3(side*.185f,.73f,0);
      Box(leg,"Trouser leg",new Vector3(0,-.31f,0),new Vector3(.33f,.60f,.34f),new Color(.17f,.19f,.25f));
      Box(leg,"Shoe",new Vector3(0,-.63f,.055f),new Vector3(.35f,.18f,.46f),Ink);
      Box(leg,"Sole",new Vector3(0,-.71f,.055f),new Vector3(.355f,.035f,.465f),new Color(.81f,.84f,.87f));return leg;
    }
    public void Pose(float speed,float pitch,int weapon,bool alive) {
      if(!body)return;
      bool updateFlash=flash>0;
      flash=Mathf.MoveTowards(flash,0,Time.deltaTime/ .22f);
      if(updateFlash&&flashRenderers!=null)for(int i=0;i<flashRenderers.Length;i++) {
        if(flash==0){flashRenderers[i].SetPropertyBlock(null);continue;}
        var tint=flash>.8f?Color.white:new Color(1,.12f,.06f);
        flashBlock.SetColor("_BaseColor",Color.Lerp(baseColors[i],tint,flash));flashRenderers[i].SetPropertyBlock(flashBlock);
      }
      if(!alive) {
        fall=Mathf.MoveTowards(fall,1,Time.deltaTime/ .65f);float eased=Mathf.SmoothStep(0,1,fall);
        body.localRotation=Quaternion.Euler(-88*eased,0,fallSide*8*eased);
        body.localPosition=new Vector3(0,.27f*eased,-.18f*eased);
        head.localRotation=Quaternion.Euler(12*eased,0,fallSide*14*eased);
        leftLeg.localRotation=Quaternion.Euler(-18*eased,0,8*eased);rightLeg.localRotation=Quaternion.Euler(12*eased,0,-8*eased);
        Segment(leftUpper,new Vector3(-.46f,1.32f,0),new Vector3(-.62f,.96f,0),.25f);
        Segment(leftLower,new Vector3(-.62f,.96f,0),new Vector3(-.74f,.68f,.1f),.235f);
        Segment(rightUpper,new Vector3(.46f,1.32f,0),new Vector3(.63f,.97f,0),.25f);
        Segment(rightLower,new Vector3(.63f,.97f,0),new Vector3(.78f,.67f,.12f),.235f);
        GunSocket.localPosition=new Vector3(.79f,.68f,.12f);GunSocket.localRotation=Quaternion.Euler(20,45,35);
        return;
      }
      fall=0;
      float walk=Mathf.Sin(Time.time*10)*Mathf.Clamp01(speed/5)*27;
      leftLeg.localRotation=Quaternion.Euler(walk,0,0);rightLeg.localRotation=Quaternion.Euler(-walk,0,0);
      body.localRotation=Quaternion.identity;
      body.localPosition=new Vector3(0,Mathf.Abs(Mathf.Sin(Time.time*10))*.025f*Mathf.Clamp01(speed/5),0);
      head.localRotation=Quaternion.Euler(Mathf.Clamp(pitch,-35,35),0,0);
      var rotation=Quaternion.Euler(Mathf.Clamp(pitch,-65,65),0,0);var pivot=new Vector3(0,1.28f,0);
      Vector3 Aim(Vector3 point)=>pivot+rotation*(point-pivot);
      var rightShoulder=new Vector3(.46f,1.32f,0);var leftShoulder=new Vector3(-.46f,1.32f,0);
      var rightElbow=Aim(new Vector3(.52f,1.05f,.17f));var leftElbow=Aim(new Vector3(-.46f,1.03f,.29f));
      var rightHand=Aim(new Vector3(.285f,1.12f,.38f));var leftHand=Aim(new Vector3(weapon==1?-.23f:.235f,1.115f,weapon==1?.43f:.65f));
      Segment(rightUpper,rightShoulder,rightElbow,.25f);Segment(rightLower,rightElbow,rightHand,.235f);
      Segment(leftUpper,leftShoulder,leftElbow,.25f);Segment(leftLower,leftElbow,leftHand,.235f);
      GunSocket.localPosition=Aim(new Vector3(.27f,1.19f,.42f));GunSocket.localRotation=rotation;
    }
    public void FlashDamage(){flash=1;}
    static void Segment(Transform part,Vector3 start,Vector3 end,float width) {
      part.localPosition=(start+end)*.5f;part.localRotation=Quaternion.LookRotation(end-start);part.localScale=new Vector3(width,width,Vector3.Distance(start,end)+.075f);
    }
    static Transform Box(Transform root,string name,Vector3 position,Vector3 size,Color color)=>DuelWorld.Block(root,name,position,size,color,false).transform;
    static Transform Cylinder(Transform root,string name,Vector3 position,Vector3 scale,Color color) {
      var go=GameObject.CreatePrimitive(PrimitiveType.Cylinder);go.name=name;go.transform.SetParent(root,false);go.transform.localPosition=position;go.transform.localScale=scale;
      go.GetComponent<Renderer>().sharedMaterial=DuelWorld.ColorMaterial(color);DuelWorld.RemoveCollider(go);return go.transform;
    }
  }
}
