using UnityEngine;

namespace RivalsPrototype {
  // A full arm sweep: raise the blade, cut across the view, then recover.
  // Visual time only; attack cadence and hit detection remain authoritative.
  public static class DuelCleaverSwing {
    public const float Duration=.54f;
    static readonly Quaternion Rest=Quaternion.Euler(-15,-32,12);
    static readonly Quaternion Raised=Quaternion.Euler(-60,-65,-35);
    static readonly Quaternion FollowThrough=Quaternion.Euler(38,55,-105);
    public static void Pose(float age,bool firstPerson,out Vector3 offset,out Quaternion rotation) {
      offset=Vector3.zero;rotation=Rest;
      if(age<0||age>=Duration)return;
      var raised=firstPerson?new Vector3(.08f,.14f,-.025f):new Vector3(.18f,.48f,-.16f);
      var across=firstPerson?new Vector3(-.46f,-.07f,.10f):new Vector3(-.48f,-.08f,.23f);
      if(age<.10f){float t=Mathf.SmoothStep(0,1,age/.10f);offset=Vector3.Lerp(Vector3.zero,raised,t);rotation=Quaternion.Slerp(Rest,Raised,t);}
      else if(age<.28f){float t=Mathf.SmoothStep(0,1,(age-.10f)/.18f);offset=Vector3.Lerp(raised,across,t);rotation=Quaternion.Slerp(Raised,FollowThrough,t);}
      else {float t=Mathf.SmoothStep(0,1,(age-.28f)/.26f);offset=Vector3.Lerp(across,Vector3.zero,t);rotation=Quaternion.Slerp(FollowThrough,Rest,t);}
    }
  }
}
