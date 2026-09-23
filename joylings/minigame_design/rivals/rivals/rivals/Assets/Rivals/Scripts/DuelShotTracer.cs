using UnityEngine;

namespace RivalsPrototype {
  public sealed class DuelShotTracer : MonoBehaviour {
    Transform muzzle;
    Camera worldCamera, viewCamera;
    LineRenderer line;
    float expires;
    static readonly System.Collections.Generic.Stack<DuelShotTracer> pool=new System.Collections.Generic.Stack<DuelShotTracer>();
    public static void ShowWeapon(int weapon,Transform muzzle,Vector3 hit,Vector3 direction,Camera worldCamera=null,Camera viewCamera=null) {
      Show(muzzle,hit,worldCamera,viewCamera,weapon==3?.15f:.08f);
      if(weapon!=3)return;
      var rotation=Quaternion.LookRotation(direction.sqrMagnitude>.1f?direction:Vector3.forward);
      float distance=Mathf.Clamp(Vector3.Distance(muzzle.position,hit),1,30);
      float radius=Mathf.Tan(3.5f*Mathf.Deg2Rad)*distance;
      for(int pellet=0;pellet<8;pellet++) {
        float angle=pellet*Mathf.PI/4;
        var offset=rotation*new Vector3(Mathf.Cos(angle),Mathf.Sin(angle),0)*radius;
        Show(muzzle,hit+offset,worldCamera,viewCamera,.15f);
      }
    }

    public static void Show(Transform muzzle,Vector3 hit,Camera worldCamera=null,Camera viewCamera=null,float duration=.08f) {
      DuelShotTracer tracer=null;
      while(pool.Count>0&&!tracer)tracer=pool.Pop();
      if(!tracer) {
        tracer=new GameObject("Shot tracer").AddComponent<DuelShotTracer>();
        tracer.line=tracer.gameObject.AddComponent<LineRenderer>();
        tracer.line.sharedMaterial=DuelWorld.TracerMaterial;
        tracer.line.positionCount=2;tracer.line.endWidth=.006f;
      }
      tracer.muzzle=muzzle;tracer.worldCamera=worldCamera;tracer.viewCamera=viewCamera;
      tracer.expires=Time.unscaledTime+duration;tracer.gameObject.SetActive(true);
      tracer.line.SetPosition(1,hit);
      tracer.LateUpdate();
    }

    public static Vector3 ProjectMuzzle(Transform muzzle,Camera worldCamera,Camera viewCamera) {
      // The viewmodel uses a fixed FOV while the world zooms for ADS. Match the
      // rendered barrel pixel, not its unprojected position in the world camera.
      return worldCamera.ViewportToWorldPoint(viewCamera.WorldToViewportPoint(muzzle.position));
    }

    void LateUpdate() {
      if(!muzzle||Time.unscaledTime>=expires){gameObject.SetActive(false);muzzle=null;worldCamera=viewCamera=null;pool.Push(this);return;}
      bool local=worldCamera&&viewCamera;
      line.SetPosition(0,local?ProjectMuzzle(muzzle,worldCamera,viewCamera):muzzle.position);
      line.startWidth=local?.012f*Mathf.Tan(worldCamera.fieldOfView*Mathf.Deg2Rad*.5f)/Mathf.Tan(viewCamera.fieldOfView*Mathf.Deg2Rad*.5f):.025f;
    }
  }
}
