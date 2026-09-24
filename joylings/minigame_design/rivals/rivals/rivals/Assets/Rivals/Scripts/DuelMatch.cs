using System.Linq;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public struct WinnerDisplay : INetworkStruct {
    public int Seat;
    public NetworkString<_16> Name;
  }
  public struct EliminationDisplay : INetworkStruct {
    public int Sequence,KillerTeam,VictimTeam,Weapon,Game;
    public NetworkString<_16> Killer,Victim;
    public TickTimer Lifetime;
  }
  public class DuelMatch : NetworkBehaviour {
    // 0 preparing, 1 team introduction, 2 continuous combat, 4 podium.
    public const int KillsToWin=30,PickupCount=4;
    public const float PickupRespawnSeconds=5,PodiumSeconds=10;
    [Networked] public int Phase { get; set; }
    [Networked] public int Blue { get; set; }
    [Networked] public int Red { get; set; }
    [Networked] public int Game { get; set; }
    [Networked] public int Winner { get; set; }
    [Networked] public TickTimer Timer { get; set; }
    [Networked,Capacity(PickupCount)] public NetworkArray<WeaponPickupState> Pickups=>default;
    [Networked,Capacity(4)] public NetworkArray<WinnerDisplay> Winners=>default;
    public const int FeedCapacity=6;
    [Networked] public int EliminationSequence { get; set; }
    [Networked,Capacity(FeedCapacity)] public NetworkArray<EliminationDisplay> Eliminations=>default;
    public void RecordElimination(DuelPlayer killer,DuelPlayer victim) {
      if(!HasStateAuthority||Phase!=2||!killer||!victim||killer==victim||killer.Team==victim.Team||victim.Health>0||victim.EliminationRecorded)return;
      victim.EliminationRecorded=true;
      int sequence=++EliminationSequence;
      Eliminations.Set((sequence-1)%FeedCapacity,new EliminationDisplay{Sequence=sequence,KillerTeam=killer.Team,VictimTeam=victim.Team,
        Killer=killer.Nickname,Victim=victim.Nickname,Weapon=killer.Weapon,Game=Game,Lifetime=TickTimer.CreateFromSeconds(Runner,6)});
      if(killer.Team==0)Blue++;else Red++;
      if(Blue>=KillsToWin||Red>=KillsToWin)FinishGame(killer.Team);
    }
    public DuelPlayer[] Players=>DuelSession.Instance.Players;
    public override void Spawned(){DuelSession.Instance.Match=this;gameObject.AddComponent<DuelPickups>();gameObject.AddComponent<DuelPodium>();}
    public override void FixedUpdateNetwork() {
      if(!HasStateAuthority)return;
      var players=Players;
      if(players.Length==0)return;
      if(Phase==0){Game=1;BeginGame(players);return;}
      if(Phase==1&&Timer.Expired(Runner)){Phase=2;Timer=TickTimer.None;}
      if(Phase==2){
        foreach(var player in players)
          if(player.Health<=0&&player.RespawnTimer.Expired(Runner)&&DuelRespawn.TryFindPosition(player,players,out var position))
            player.RespawnAt(position);
        UpdatePickups(players);
      }
      if(Phase==4&&Timer.Expired(Runner)){
        DuelSession.Instance.ShuffleTeams();Game++;BeginGame(Players);
        Debug.Log($"RIVALS_NEW_GAME game={Game}");
      }
    }
    void FinishGame(int team) {
      Winner=team;Phase=4;int index=0;
      foreach(var player in Players.Where(p=>p.Team==team).OrderBy(p=>p.Seat))
        if(index<4)Winners.Set(index++,new WinnerDisplay{Seat=player.Seat,Name=player.Nickname});
      Timer=TickTimer.CreateFromSeconds(Runner,PodiumSeconds);
      Debug.Log($"RIVALS_GAME_RESULT game={Game} kills={Blue}:{Red} winner={Winner}");
    }
    void BeginGame(DuelPlayer[] players) {
      Blue=Red=0;Winner=-1;
      foreach(var player in players)player.ResetForMatch();
      for(int slot=0;slot<PickupCount;slot++)SpawnPickup(slot);
      Phase=1;Timer=TickTimer.CreateFromSeconds(Runner,4);
    }
    void SpawnPickup(int slot) {
      Pickups.Set(slot,new WeaponPickupState{Position=DuelPickups.SpawnPoints[slot],Weapon=DuelPickups.WeaponFor(slot,Game),Respawn=TickTimer.None});
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
