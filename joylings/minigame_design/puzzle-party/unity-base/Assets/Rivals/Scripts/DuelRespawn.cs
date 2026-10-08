using UnityEngine;

namespace RivalsPrototype {
  // Only the host chooses a position; Fusion replicates the teleport and timer.
  public static class DuelRespawn {
    public const float DelaySeconds=3,EnemyClearance=8;
    public static bool IsClear(Vector3 feet) {
      return Mathf.Abs(feet.x)<=33&&Mathf.Abs(feet.z)<=33&&
        !Physics.CheckCapsule(feet+Vector3.up*.4f,feet+Vector3.up*1.48f,.36f,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore);
    }
    public static bool TryFindPosition(DuelPlayer player,DuelPlayer[] players,out Vector3 position) {
      position=default;bool found=false;float bestDistance=-1;
      // Prefer random open ground, including the low platforms. The fixed
      // perimeter candidates are a checked fallback, never an unchecked spawn.
      int start=Random.Range(0,DuelSession.MaxPlayers);
      for(int attempt=0;attempt<40;attempt++) {
        var sample=attempt<32?new Vector3(Random.Range(-32f,32f),0,Random.Range(-32f,32f)):DuelPlayer.SpawnPosition((start+attempt-32)%DuelSession.MaxPlayers);
        if(!Physics.Raycast(new Vector3(sample.x,10,sample.z),Vector3.down,out var ground,12,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore)||ground.normal.y<.95f||ground.point.y>1.6f)continue;
        var candidate=ground.point+Vector3.up*.08f;
        if(!IsClear(candidate)||(candidate-player.transform.position).sqrMagnitude<25)continue;
        bool onPickup=false;
        foreach(var pickup in DuelPickups.SpawnPoints)if((candidate-pickup).sqrMagnitude<9){onPickup=true;break;}
        if(onPickup)continue;
        bool occupied=false;float nearestEnemy=float.PositiveInfinity;
        foreach(var other in players) {
          if(other==player||other.Health<=0)continue;
          float distance=(other.transform.position-candidate).sqrMagnitude;
          if(distance<4){occupied=true;break;}
          if(other.Team!=player.Team)nearestEnemy=Mathf.Min(nearestEnemy,distance);
        }
        if(occupied)continue;
        if(!found||nearestEnemy>bestDistance){position=candidate;bestDistance=nearestEnemy;found=true;}
        if(nearestEnemy>=EnemyClearance*EnemyClearance)return true;
      }
      return found;
    }
  }
}
