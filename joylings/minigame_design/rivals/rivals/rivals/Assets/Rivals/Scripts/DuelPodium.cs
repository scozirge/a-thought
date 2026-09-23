using UnityEngine;

namespace RivalsPrototype {
  // Local presentation of a host-snapshotted winning team, including members
  // who were eliminated or disconnected after the deciding round.
  public sealed class DuelPodium : MonoBehaviour {
    DuelMatch match;
    Transform stage;
    public Camera Camera { get; private set; }
    public readonly Transform[] Winners=new Transform[4];
    readonly DuelAvatar[] avatars=new DuelAvatar[4];
    readonly Transform[] confetti=new Transform[48];
    int displayedGame=-1;
    void Awake(){match=GetComponent<DuelMatch>();}
    void LateUpdate() {
      if(!match||!match.Object||!match.Object.IsValid)return;
      bool visible=match.Phase==4;
      if(visible&&displayedGame!=match.Game){Build();displayedGame=match.Game;}
      if(stage)stage.gameObject.SetActive(visible);
      if(!visible)return;
      for(int i=0;i<4;i++)if(avatars[i])avatars[i].Celebrate(Time.time+i*.7f);
      for(int i=0;i<confetti.Length;i++){
        float phase=Time.time*.9f+i*.317f;
        confetti[i].localPosition=new Vector3(Mathf.Sin(i*17.1f)*5+Mathf.Sin(phase)*.3f,6-Mathf.Repeat(phase,6),.9f+Mathf.Cos(i*7.3f)*2);
        confetti[i].localRotation=Quaternion.Euler(phase*90,i*53,phase*135);
      }
    }
    void Build() {
      if(stage)Destroy(stage.gameObject);
      stage=new GameObject("Victory stage").transform;stage.position=new Vector3(0,0,110);
      var color=match.Winner==0?new Color(.15f,.45f,1):new Color(1,.22f,.25f);
      DuelWorld.Block(stage,"Podium",new Vector3(0,-.15f,0),new Vector3(13,.5f,6),new Color(.065f,.085f,.14f),false);
      DuelWorld.Block(stage,"Team ribbon",new Vector3(0,.12f,-2.1f),new Vector3(12,.05f,.25f),color,false);
      DuelWorld.Block(stage,"Backdrop",new Vector3(0,3,3.2f),new Vector3(17,7,.3f),new Color(.025f,.04f,.085f),false);
      for(int i=0;i<4;i++){
        var root=new GameObject("Winner "+i).transform;root.SetParent(stage,false);root.localPosition=new Vector3((i-1.5f)*2.2f,.12f,0);root.localRotation=Quaternion.Euler(0,180,0);
        avatars[i]=root.gameObject.AddComponent<DuelAvatar>();avatars[i].Build(match.Winners[i].Seat);Winners[i]=root;
        DuelWorld.Block(stage,"Winner light "+i,new Vector3((i-1.5f)*2.2f,.105f,0),new Vector3(1.8f,.025f,1.8f),color,false);
      }
      var colors=new[]{color,new Color(1,.82f,.25f),Color.white,new Color(.72f,.45f,1)};
      for(int i=0;i<confetti.Length;i++)confetti[i]=DuelWorld.Block(stage,"Confetti",Vector3.zero,new Vector3(.055f,.12f,.02f),colors[i%colors.Length],false).transform;
      foreach(var part in stage.GetComponentsInChildren<Transform>())part.gameObject.layer=28;
      Camera=new GameObject("Victory camera").AddComponent<Camera>();Camera.transform.SetParent(stage,false);Camera.transform.localPosition=new Vector3(0,3,-9);
      Camera.transform.LookAt(stage.position+Vector3.up*1.25f);Camera.fieldOfView=45;Camera.cullingMask=1<<28;Camera.clearFlags=CameraClearFlags.SolidColor;Camera.backgroundColor=new Color(.025f,.04f,.085f);Camera.depth=5;
    }
    void OnDestroy(){if(stage)Destroy(stage.gameObject);}
  }
}
