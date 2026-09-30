using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public struct AttackCredit : INetworkStruct {
    public int Team,Seat,Weapon;
    public NetworkId ObjectId;
    public NetworkString<_16> Name;
    public static AttackCredit For(DuelPlayer player,int weapon)=>new AttackCredit {
      Team=player.Team,Seat=player.Seat,Weapon=weapon,ObjectId=player.Object.Id,Name=player.Nickname
    };
  }

  public struct OrdnanceState : INetworkStruct {
    public const int Flying=1,Blast=2,Toxic=3,Warning=4,NuclearBlast=5;
    public int Sequence,Stage,Weapon;
    public AttackCredit Owner;
    public Vector3 Position,Velocity;
    public TickTimer Lifetime;
    public float StartedAt;
  }

  // Only the host simulates collision, blast damage and poison ticks. Clients
  // render the replicated state, including effects already active when joining.
  public partial class DuelMatch {
    public const int OrdnanceCapacity=48;
    [Networked,Capacity(OrdnanceCapacity)] public NetworkArray<OrdnanceState> Ordnance=>default;
    [Networked] public int OrdnanceSequence { get; set; }
    readonly RaycastHit[] projectileHits=new RaycastHit[64];
    int damageBatchDepth,pendingWinner=-1;

    public static Vector3 LaunchVelocity(int weapon,Vector3 direction)=>weapon==Weapons.Poison
      ?direction*8+Vector3.up*4:weapon==Weapons.Cleaver?direction*24:direction*13+Vector3.up*5;
    public static float ProjectileGravity(int weapon)=>weapon==Weapons.Poison?14:weapon==Weapons.Cleaver?10:7.5f;
    public static int RocketDamage(float distance,bool direct)=>direct?300:distance<=Weapons.RocketInnerRadius?150:distance<=Weapons.RocketRadius?100:0;

    public static bool TryNukeTarget(Vector3 origin,Vector3 direction,out Vector3 point) {
      point=default;
      if(!Physics.Raycast(origin,direction,out var hit,90,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore))return false;
      var above=hit.point+hit.normal*.3f+Vector3.up*.4f;
      if(!Physics.Raycast(above,Vector3.down,out var ground,20,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore)||ground.normal.y<.5f)return false;
      point=ground.point+Vector3.up*.04f;
      return Mathf.Abs(point.x)<35&&Mathf.Abs(point.z)<35;
    }

    public bool Launch(DuelPlayer player,int weapon,Vector3 origin,Vector3 direction,out Vector3 destination) {
      destination=origin;
      if(Phase!=2)return false;
      if(weapon==Weapons.Nuke&&!TryNukeTarget(origin,direction,out destination))return false;
      if(!HasStateAuthority)return true;
      int slot=-1;
      for(int i=0;i<OrdnanceCapacity;i++)if(Ordnance[i].Stage==0){slot=i;break;}
      if(slot<0)return false;
      var state=new OrdnanceState {Sequence=++OrdnanceSequence,Weapon=weapon,Owner=AttackCredit.For(player,weapon),
        Stage=weapon==Weapons.Nuke?OrdnanceState.Warning:OrdnanceState.Flying,
        Position=weapon==Weapons.Nuke?destination:origin+direction*.15f,
        Velocity=LaunchVelocity(weapon,direction),StartedAt=(float)Runner.SimulationTime,
        Lifetime=TickTimer.CreateFromSeconds(Runner,weapon==Weapons.Nuke?Weapons.NukeDelay:6)};
      Ordnance.Set(slot,state);
      return true;
    }

    public void ClearOrdnance(){if(HasStateAuthority)for(int i=0;i<OrdnanceCapacity;i++)Ordnance.Set(i,default);}

    void UpdateOrdnance() {
      for(int slot=0;slot<OrdnanceCapacity&&Phase==2;slot++) {
        var state=Ordnance[slot];if(state.Stage==0)continue;
        if(state.Stage==OrdnanceState.Flying) {
          float dt=Runner.DeltaTime;
          var gravity=Vector3.down*ProjectileGravity(state.Weapon);
          var next=state.Position+state.Velocity*dt+gravity*(dt*dt*.5f);
          var delta=next-state.Position;float length=delta.magnitude,nearest=length+1;
          DuelPlayer victim=null;Vector3 impact=next,normal=Vector3.up;
          int hits=Physics.SphereCastNonAlloc(state.Position,state.Weapon==Weapons.Cleaver?.10f:.18f,delta.normalized,projectileHits,length,~0,QueryTriggerInteraction.Ignore);
          for(int n=0;n<hits;n++) {
            var hit=projectileHits[n];var target=hit.collider.GetComponentInParent<DuelPlayer>();
            if(target&&(!target.IsReady||target.Health<=0||target.Object.Id==state.Owner.ObjectId||(state.Weapon==Weapons.Cleaver&&target.Team==state.Owner.Team)))continue;
            if(hit.distance>=nearest)continue;
            nearest=hit.distance;victim=target;impact=hit.point;normal=hit.normal;
          }
          if(nearest<=length)Impact(ref state,impact,normal,victim);
          else if(state.Lifetime.Expired(Runner)||next.y<-5||Mathf.Abs(next.x)>45||Mathf.Abs(next.z)>45)state=default;
          else {state.Position=next;state.Velocity+=gravity*dt;}
        }else if(state.Stage==OrdnanceState.Warning&&state.Lifetime.Expired(Runner)) {
          NuclearBlast(state);
          state.Stage=OrdnanceState.NuclearBlast;state.StartedAt=(float)Runner.SimulationTime;
          state.Lifetime=TickTimer.CreateFromSeconds(Runner,3);
        }else if(state.Stage==OrdnanceState.Toxic) {
          if(state.Lifetime.Expired(Runner))state=default;
          else foreach(var target in Players) {
            if(target.Health<=0||!target.PoisonDamageTimer.ExpiredOrNotRunning(Runner))continue;
            var feet=target.transform.position;
            if(Mathf.Abs(feet.y-state.Position.y)>1.1f||new Vector2(feet.x-state.Position.x,feet.z-state.Position.z).sqrMagnitude>Weapons.PoisonRadius*Weapons.PoisonRadius)continue;
            if(!BlastVisible(state.Position+Vector3.up*.35f,target))continue;
            target.PoisonDamageTimer=TickTimer.CreateFromSeconds(Runner,Weapons.PoisonInterval);
            ApplyOrdnanceDamage(state.Owner,target,Weapons.Damage[Weapons.Poison],state.Position,true);
          }
        }else if(state.Lifetime.Expired(Runner))state=default;
        Ordnance.Set(slot,state);
      }
    }

    void Impact(ref OrdnanceState state,Vector3 point,Vector3 normal,DuelPlayer direct) {
      state.Position=point+normal*.12f;state.Velocity=Vector3.zero;state.StartedAt=(float)Runner.SimulationTime;
      if(state.Weapon==Weapons.Poison) {
        var above=point+normal*.3f+Vector3.up*.5f;
        if(Physics.Raycast(above,Vector3.down,out var ground,30,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore))state.Position=ground.point+Vector3.up*.04f;
        state.Stage=OrdnanceState.Toxic;state.Lifetime=TickTimer.CreateFromSeconds(Runner,Weapons.PoisonDuration);
      }else {
        if(state.Weapon==Weapons.Rocket) {
          damageBatchDepth++;
          foreach(var target in Players) {
            if(target.Health<=0)continue;
            float distance=Vector3.Distance(state.Position,target.transform.position+Vector3.up*.9f);
            int damage=RocketDamage(distance,target==direct);
            if(damage>0&&(target==direct||BlastVisible(state.Position,target)))ApplyOrdnanceDamage(state.Owner,target,damage,state.Position,true);
          }
          FinishDamageBatch();
        }else if(direct)ApplyOrdnanceDamage(state.Owner,direct,300,state.Position,false);
        state.Stage=OrdnanceState.Blast;state.Lifetime=TickTimer.CreateFromSeconds(Runner,state.Weapon==Weapons.Rocket?1.2f:.35f);
      }
    }

    static bool BlastVisible(Vector3 origin,DuelPlayer target)=>!Physics.Linecast(origin,target.transform.position+Vector3.up*.8f,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore);

    void NuclearBlast(OrdnanceState state) {
      damageBatchDepth++;
      foreach(var target in Players) {
        var offset=target.transform.position-state.Position;
        if(offset.sqrMagnitude<=Weapons.NukeRadius*Weapons.NukeRadius)
          ApplyOrdnanceDamage(state.Owner,target,DuelPlayer.MaxHealth,state.Position,true);
      }
      FinishDamageBatch();
    }
    void FinishDamageBatch(){damageBatchDepth--;if(damageBatchDepth==0&&pendingWinner>=0){int winner=pendingWinner;pendingWinner=-1;FinishGame(winner);}}

    void ApplyOrdnanceDamage(AttackCredit owner,DuelPlayer target,int amount,Vector3 origin,bool friendlyFire) {
      int damage=target.TakeOrdnanceDamage(amount,origin,owner,friendlyFire);
      if(damage<=0)return;
      foreach(var player in Players)if(player.Object.Id==owner.ObjectId&&target.Team!=owner.Team) {
        player.Hits++;player.LastHitSeat=target.Seat;player.LastHitDamage=damage;player.LastHitKilled=target.Health<=0;break;
      }
    }
  }
}
