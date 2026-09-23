using System.Linq;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public class DuelMatch : NetworkBehaviour {
    // 0 waiting, 1 countdown, 2 live, 3 round result, 4 match result.
    [Networked] public int Phase { get; set; }
    [Networked] public int Blue { get; set; }
    [Networked] public int Red { get; set; }
    [Networked] public int Round { get; set; }
    [Networked] public int Winner { get; set; }
    [Networked] public TickTimer Timer { get; set; }
    public DuelPlayer[] Players => FindObjectsByType<DuelPlayer>(FindObjectsSortMode.None).Where(p => p.Object && p.Object.IsValid && p.Runner == Runner).OrderBy(p => p.Seat).ToArray();
    public override void Spawned() { DuelSession.Instance.Match = this; }
    public override void FixedUpdateNetwork() {
      if (!HasStateAuthority) return;
      var players = Players;
      var blueTeam=players.Where(p=>p.Team==0).ToArray();
      var redTeam=players.Where(p=>p.Team==1).ToArray();
      if (blueTeam.Length==0 || redTeam.Length==0) {
        Phase = 0; Blue = 0; Red = 0; Round = 0; Timer = TickTimer.None;
        return;
      }
      if (Phase == 0) { BeginRound(players); return; }
      if (Phase == 1 && Timer.Expired(Runner)) { Phase = 2; Timer = TickTimer.CreateFromSeconds(Runner, 60); }
      if (Phase == 2) {
        int blueHealth=blueTeam.Sum(p=>p.Health),redHealth=redTeam.Sum(p=>p.Health);
        if (blueHealth<=0 || redHealth<=0 || Timer.Expired(Runner)) {
          // Compare average health at timeout, so an uneven team does not win just by having more players.
          int difference=blueHealth*redTeam.Length-redHealth*blueTeam.Length;
          Winner = difference==0 ? -1 : difference>0 ? 0 : 1;
          if (Winner == 0) Blue++;
          if (Winner == 1) Red++;
          Phase = Blue >= 5 || Red >= 5 ? 4 : 3;
          Timer = TickTimer.CreateFromSeconds(Runner, 3);
          Debug.Log($"RIVALS_ROUND_RESULT {Blue}:{Red}");
        }
      }
      if (Phase == 3 && Timer.Expired(Runner)) BeginRound(players);
    }
    void BeginRound(DuelPlayer[] players) {
      Round++;
      foreach (var p in players) p.ResetRound();
      Phase = 1; Timer = TickTimer.CreateFromSeconds(Runner, 3);
    }
    [Rpc(RpcSources.All, RpcTargets.StateAuthority)]
    public void RPC_Rematch() {
      if (Phase != 4) return;
      Blue = 0; Red = 0; Round = 0; Phase = 0;
    }
  }
}
