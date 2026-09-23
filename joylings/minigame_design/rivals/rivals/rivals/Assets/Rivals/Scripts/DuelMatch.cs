using System.Linq;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public struct WinnerDisplay : INetworkStruct {
    public int Seat;
    public NetworkString<_16> Name;
  }
  public struct EliminationDisplay : INetworkStruct {
    public int Sequence,KillerTeam,VictimTeam,Weapon,Round;
    public NetworkString<_16> Killer,Victim;
    public TickTimer Lifetime;
  }
  public class DuelMatch : NetworkBehaviour {
    // 0 preparing, 1 team introduction, 2 live, 3 round result, 4 podium.
    public const int RoundsToWin=5,PickupCount=4;
    public const float PickupRespawnSeconds=5,PodiumSeconds=10;
    [Networked] public int Phase { get; set; }
    [Networked] public int Blue { get; set; }
    [Networked] public int Red { get; set; }
    [Networked] public int Round { get; set; }
    [Networked] public int Game { get; set; }
    [Networked] public int Winner { get; set; }
    [Networked] public TickTimer Timer { get; set; }
    [Networked,Capacity(PickupCount)] public NetworkArray<WeaponPickupState> Pickups=>default;
    [Networked,Capacity(4)] public NetworkArray<WinnerDisplay> Winners=>default;
    public const int FeedCapacity=6;
    [Networked] public int EliminationSequence { get; set; }
    [Networked,Capacity(FeedCapacity)] public NetworkArray<EliminationDisplay> Eliminations=>default;
    public void RecordElimination(DuelPlayer killer,DuelPlayer victim) {
      if(!HasStateAuthority||Phase!=2)return;
      int sequence=++EliminationSequence;
      Eliminations.Set((sequence-1)%FeedCapacity,new EliminationDisplay{Sequence=sequence,KillerTeam=killer.Team,VictimTeam=victim.Team,
        Killer=killer.Nickname,Victim=victim.Nickname,Weapon=killer.Weapon,Round=Round,Lifetime=TickTimer.CreateFromSeconds(Runner,6)});
    }
    public DuelPlayer[] Players=>DuelSession.Instance.Players;
    public override void Spawned(){DuelSession.Instance.Match=this;gameObject.AddComponent<DuelPickups>();gameObject.AddComponent<DuelPodium>();}
    public override void FixedUpdateNetwork() {
      if(!HasStateAuthority)return;
      var players=Players;
      int blueCount=0,redCount=0,blueHealth=0,redHealth=0;
      foreach(var p in players)if(p.Team==0){blueCount++;blueHealth+=p.Health;}else{redCount++;redHealth+=p.Health;}
      if(blueCount==0||redCount==0)return;
      if(Phase==0){if(Game==0)Game=1;BeginRound(players);return;}
      if(Phase==1&&Timer.Expired(Runner)){Phase=2;Timer=TickTimer.CreateFromSeconds(Runner,60);}
      if(Phase==2){
        UpdatePickups(players);
        if(blueHealth<=0||redHealth<=0||Timer.Expired(Runner)) {
          int difference=blueHealth*redCount-redHealth*blueCount;
          Winner=difference==0?-1:difference>0?0:1;
          if(Winner==0)Blue++;if(Winner==1)Red++;
          if(Blue>=RoundsToWin||Red>=RoundsToWin){
            Phase=4;int index=0;
            foreach(var p in players.Where(p=>p.Team==Winner).OrderBy(p=>p.Seat))
              if(index<4)Winners.Set(index++,new WinnerDisplay{Seat=p.Seat,Name=p.Nickname});
            Timer=TickTimer.CreateFromSeconds(Runner,PodiumSeconds);
          }else{Phase=3;Timer=TickTimer.CreateFromSeconds(Runner,3);}
          Debug.Log($"RIVALS_ROUND_RESULT game={Game} round={Round} score={Blue}:{Red} phase={Phase}");
        }
      }
      if(Phase==3&&Timer.Expired(Runner))BeginRound(players);
      if(Phase==4&&Timer.Expired(Runner)){
        DuelSession.Instance.ShuffleTeams();Blue=Red=Round=0;Game++;BeginRound(Players);
        Debug.Log($"RIVALS_NEW_GAME game={Game}");
      }
    }
    void BeginRound(DuelPlayer[] players) {
      Round++;Winner=-1;
      foreach(var player in players)player.ResetRound();
      for(int slot=0;slot<PickupCount;slot++)SpawnPickup(slot);
      Phase=1;Timer=TickTimer.CreateFromSeconds(Runner,4);
    }
    void SpawnPickup(int slot) {
      Pickups.Set(slot,new WeaponPickupState{Position=DuelPickups.SpawnPoints[slot],Weapon=DuelPickups.WeaponFor(slot,Round),Respawn=TickTimer.None});
    }
    void UpdatePickups(DuelPlayer[] players) {
      for(int slot=0;slot<PickupCount;slot++){
        var pickup=Pickups[slot];
        if(pickup.Respawn.IsRunning){if(pickup.Respawn.Expired(Runner))SpawnPickup(slot);continue;}
        foreach(var player in players){
          if(player.Health<=0||player.Weapon==pickup.Weapon||(player.transform.position-pickup.Position).sqrMagnitude>2.4f*2.4f)continue;
          var delta=pickup.Position-player.transform.position;
          if(Physics.Raycast(player.transform.position+Vector3.up,delta.normalized,delta.magnitude,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore))continue;
          if(!player.CollectWeapon(pickup.Weapon))continue;
          pickup.Respawn=TickTimer.CreateFromSeconds(Runner,PickupRespawnSeconds);Pickups.Set(slot,pickup);break;
        }
      }
    }
    // Retained for old development harnesses. The game cannot skip the podium.
    [Rpc(RpcSources.All,RpcTargets.StateAuthority)] public void RPC_Rematch(){}
  }
}
