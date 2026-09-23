using UnityEngine;

namespace RivalsPrototype {
  // Presentation follows the replicated reload timer, including prediction rollback.
  // These props never participate in physics or change the player's aim.
  public sealed class DuelReloadView : MonoBehaviour {
    Transform root,hand,sleeve,magazine,cartridge,bolt,casing,support,supportSleeve;
    int kind;
    public void Build(int weapon,int seat) {
      kind=weapon;support=transform.Find("Supporting hand");supportSleeve=transform.Find("Left sleeve");
      root=new GameObject("Reload presentation").transform;root.SetParent(transform,false);
      hand=DuelWorld.Block(root,"Loading hand",Vector3.zero,new Vector3(.14f,.14f,.17f),DuelAvatar.Skin(seat),false).transform;
      sleeve=DuelWorld.Block(root,"Loading forearm",Vector3.zero,Vector3.one,new Color(.055f,.065f,.08f),false).transform;
      magazine=DuelWorld.Block(hand,"Spare magazine",new Vector3(.025f,.10f,.04f),new Vector3(.085f,kind==1?.19f:.26f,.12f),new Color(.22f,.27f,.34f),false).transform;
      DuelWorld.Block(magazine,"Magazine base",new Vector3(0,-.49f,0),new Vector3(1.18f,.13f,1.14f),new Color(.055f,.065f,.08f),false);
      cartridge=DuelWorld.Block(hand,"Loaded cartridge",new Vector3(.01f,.09f,.04f),new Vector3(.045f,.045f,kind==3?.13f:.16f),kind==3?new Color(.8f,.06f,.04f):new Color(.95f,.63f,.18f),false).transform;
      DuelWorld.Block(cartridge,"Cartridge brass",new Vector3(0,0,-.42f),new Vector3(1.1f,1.1f,.17f),new Color(.95f,.72f,.27f),false);
      bolt=DuelWorld.Block(root,"Moving charging handle",new Vector3(.08f,.035f,.02f),new Vector3(.10f,.035f,.045f),new Color(.18f,.21f,.26f),false).transform;
      casing=DuelWorld.Block(root,"Ejected casing",Vector3.zero,new Vector3(.035f,.035f,.11f),new Color(.95f,.72f,.27f),false).transform;
      foreach(var t in root.GetComponentsInChildren<Transform>())t.gameObject.layer=30;
      foreach(var renderer in root.GetComponentsInChildren<Renderer>())renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
      Pose(false,0);
    }
    static float Ease(float t)=>Mathf.SmoothStep(0,1,t);
    static Vector3 Between(Vector3 a,Vector3 b,float p,float start,float end)=>Vector3.Lerp(a,b,Ease(Mathf.InverseLerp(start,end,p)));
    public void Pose(bool active,float p) {
      root.gameObject.SetActive(active);
      if(support)support.gameObject.SetActive(!active);
      if(supportSleeve)supportSleeve.gameObject.SetActive(!active);
      if(!active)return;
      var well=kind==1?new Vector3(-.02f,-.15f,.005f):new Vector3(-.025f,-.16f,.10f);
      var pocket=new Vector3(-.34f,-.42f,.05f);
      var charging=new Vector3(.10f,.01f,.035f);
      Vector3 position;
      bool showMagazine=false,showCartridge=false;
      float pull=0;
      if(kind==3) {
        var port=new Vector3(-.025f,-.12f,.15f);
        if(p<.2f)position=Between(pocket,port,p,0,.2f);
        else if(p<.78f) {
          float cycle=Mathf.Repeat((p-.2f)/.58f*3,1);
          position=Between(pocket,port,cycle,0,.78f);showCartridge=cycle<.83f;
        }else {
          pull=Mathf.Sin(Mathf.InverseLerp(.78f,1,p)*Mathf.PI);
          position=new Vector3(-.01f,-.055f,.30f-pull*.15f);
        }
      }else if(kind==4) {
        if(p<.26f){pull=Mathf.Sin(p/.26f*Mathf.PI);position=charging-Vector3.forward*pull*.16f;}
        else if(p<.72f){position=Between(pocket,new Vector3(-.015f,.005f,.10f),p,.26f,.66f);showCartridge=p<.67f;}
        else {pull=1-Ease(Mathf.InverseLerp(.72f,.96f,p));position=charging-Vector3.forward*pull*.16f;}
      }else {
        showMagazine=p<.70f;
        if(p<.10f)position=Between(pocket,well,p,0,.10f);
        else if(p<.3f)position=Between(well,pocket,p,.10f,.3f);
        else if(p<.70f)position=Between(pocket,well,p,.38f,.70f);
        else {
          pull=Mathf.Sin(Mathf.InverseLerp(.76f,.94f,p)*Mathf.PI);
          position=Between(well,charging,p,.70f,.77f)-Vector3.forward*pull*.13f;
        }
      }
      if(p>.94f)position=Between(position,pocket,p,.94f,1);
      hand.localPosition=position;hand.localRotation=Quaternion.Euler(0,0,kind==3?-12:0);
      var elbow=new Vector3(-.43f,-.45f,-.24f);var wrist=position+new Vector3(-.035f,-.06f,-.025f);
      sleeve.localPosition=(elbow+wrist)*.5f;sleeve.localScale=new Vector3(.16f,.16f,Vector3.Distance(elbow,wrist));sleeve.localRotation=Quaternion.LookRotation(wrist-elbow);
      magazine.gameObject.SetActive(showMagazine);cartridge.gameObject.SetActive(showCartridge);
      bolt.gameObject.SetActive(kind!=3);bolt.localPosition=charging-Vector3.forward*pull*.16f;
      bool eject=kind==4&&p>.1f&&p<.26f;casing.gameObject.SetActive(eject);
      if(eject){float t=(p-.1f)/.16f;casing.localPosition=new Vector3(.12f+t*.5f,.06f+Mathf.Sin(t*Mathf.PI)*.12f,.13f);casing.localRotation=Quaternion.Euler(t*350,t*200,0);}
    }
  }
}
