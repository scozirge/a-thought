using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public struct WeaponPickupState : INetworkStruct {
    public Vector3 Position;
    public int Weapon;
    public TickTimer Respawn;
  }

  // The host owns the replicated pickup array; these are presentation only.
  public sealed class DuelPickups : MonoBehaviour {
    public static readonly Vector3[] SpawnPoints={new Vector3(-30,.1f,-30),new Vector3(30,.1f,30),new Vector3(30,.1f,-30),new Vector3(-30,.1f,30)};
    public static int WeaponFor(int slot,int game)=>slot>=2?0:((slot+game)%2==1?3:4);
    DuelMatch match;
    readonly Transform[] roots=new Transform[DuelMatch.PickupCount];
    readonly Transform[] models=new Transform[DuelMatch.PickupCount];
    readonly int[] kinds={-1,-1,-1,-1};
    void Awake(){match=GetComponent<DuelMatch>();}
    void LateUpdate() {
      if(!match||!match.Object||!match.Object.IsValid||match.Game==0)return;
      for(int slot=0;slot<roots.Length;slot++) {
        var pickup=match.Pickups[slot];
        if(!roots[slot]) {
          var root=new GameObject("Weapon pickup "+slot).transform;root.SetParent(transform,false);roots[slot]=root;
          var color=Weapons.Color(pickup.Weapon);
          DuelWorld.Block(root,"Pickup plinth",Vector3.zero,new Vector3(1.35f,.12f,1.35f),new Color(.06f,.09f,.14f),false);
          var ring=new GameObject("Pickup glow").AddComponent<LineRenderer>();ring.transform.SetParent(root,false);ring.useWorldSpace=false;ring.loop=true;ring.positionCount=32;
          ring.sharedMaterial=DuelWorld.TracerMaterial;ring.startColor=ring.endColor=color;ring.startWidth=ring.endWidth=.045f;
          for(int i=0;i<32;i++){float a=i*Mathf.PI/16;ring.SetPosition(i,new Vector3(Mathf.Cos(a)*.8f,.12f,Mathf.Sin(a)*.8f));}
          // Per-kind unlit colour stays legible in shadow and at a distance.
          var glow=new Material(Shader.Find("Universal Render Pipeline/Unlit"));glow.color=color;ring.sharedMaterial=glow;
        }
        if(kinds[slot]!=pickup.Weapon) {
          kinds[slot]=pickup.Weapon;if(models[slot])Destroy(models[slot].gameObject);
          models[slot]=DuelWorld.MakeWeapon(roots[slot],pickup.Weapon,false);models[slot].localScale=Vector3.one*1.15f;
          var ring=roots[slot].GetComponentInChildren<LineRenderer>();var color=Weapons.Color(pickup.Weapon);
          ring.sharedMaterial.color=color;ring.startColor=ring.endColor=color;
        }
        roots[slot].gameObject.SetActive(match.Phase!=4);
        models[slot].gameObject.SetActive(!pickup.Respawn.IsRunning);
        roots[slot].position=pickup.Position;
        models[slot].localPosition=new Vector3(0,1+Mathf.Sin(Time.time*2+slot)*.12f,0);
        models[slot].localRotation=Quaternion.Euler(0,Time.time*35+slot*40,12);
      }
    }
    void OnDestroy(){foreach(var root in roots)if(root){var line=root.GetComponentInChildren<LineRenderer>(true);if(line)Destroy(line.sharedMaterial);Destroy(root.gameObject);}}
  }
}
