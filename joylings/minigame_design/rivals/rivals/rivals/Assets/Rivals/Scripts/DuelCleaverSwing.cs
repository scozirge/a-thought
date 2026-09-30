using UnityEngine;

namespace RivalsPrototype {
  // Raise above the right shoulder, chop diagonally down-left, recover below the view.
  // Visual time only; attack cadence and hit detection remain authoritative.
  public static class DuelCleaverSwing {
    public const float Duration=.56f;
    static readonly Quaternion Rest=Quaternion.Euler(-15,-32,12);
    static readonly Quaternion Raised=Quaternion.Euler(-35,-40,-30);
    static readonly Quaternion FollowThrough=Quaternion.Euler(30,-65,-48);
    public static void Pose(float age,bool firstPerson,out Vector3 offset,out Quaternion rotation) {
      offset=Vector3.zero;rotation=Rest;
      if(age<0||age>=Duration)return;
      var raised=firstPerson?new Vector3(.10f,.32f,0):new Vector3(.16f,.62f,-.10f);
      var downLeft=firstPerson?new Vector3(-.49f,-.10f,.12f):new Vector3(-.60f,-.34f,.28f);
      if(age<.12f){float t=Mathf.SmoothStep(0,1,age/.12f);offset=Vector3.Lerp(Vector3.zero,raised,t);rotation=Quaternion.Slerp(Rest,Raised,t);}
      else if(age<.28f){float t=Mathf.SmoothStep(0,1,(age-.12f)/.16f);offset=Vector3.Lerp(raised,downLeft,t);rotation=Quaternion.Slerp(Raised,FollowThrough,t);}
      else if(age<.34f){offset=downLeft;rotation=FollowThrough;}
      else {
        float t=Mathf.SmoothStep(0,1,(age-.34f)/(Duration-.34f));
        var low=firstPerson?new Vector3(-.08f,-.28f,-.03f):new Vector3(-.20f,-.42f,-.10f);
        offset=(1-t)*(1-t)*downLeft+2*(1-t)*t*low;
        rotation=Quaternion.Slerp(FollowThrough,Rest,t);
      }
    }
  }
}
