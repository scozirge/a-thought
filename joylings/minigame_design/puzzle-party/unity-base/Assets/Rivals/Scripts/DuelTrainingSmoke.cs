#if UNITY_EDITOR
using System;
using System.Linq;
using System.Threading.Tasks;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public sealed class DuelTrainingSmoke : MonoBehaviour {
    int checks;
    void Check(bool value,string label){if(!value)throw new Exception("TRAINING_FAILED "+label);checks++;Debug.Log("TRAINING_CHECK "+label);}
    static async Task Wait(Func<bool> condition,string label,float seconds=12){float deadline=Time.realtimeSinceStartup+seconds;while(!condition()){if(Time.realtimeSinceStartup>deadline)throw new Exception("TRAINING_TIMEOUT "+label);await Task.Delay(20);}}
    async void Start() {
      try {
        var session=DuelSession.Instance;await Wait(()=>session.Local&&session.Match&&session.Match.Phase==2&&session.Players.Length==8,"ready",45);
        var match=session.Match;var player=session.Local;var targets=session.Players.Where(p=>p.IsBot).ToArray();
        Check(session.IsTraining&&session.Runner.GameMode==GameMode.Single,"private single-player mode");
        Check(targets.Length==7&&targets.All(p=>p.Team!=player.Team),"seven hittable fixed targets");
        Check(!FindFirstObjectByType<DuelWorld>(FindObjectsInactive.Include).gameObject.activeSelf,"combat arena hidden");
        Check(match.Pickups.Count(p=>p.Weapon>=0)==4&&match.Pickups.All(p=>p.Weapon<0||DuelPickups.IsGroundWeapon(p.Weapon)),"four ordinary stations; badge weapons only in practice menu");
        foreach(var p in session.Players)Check(Vector3.Distance(p.SpawnPoint,DuelTrainingWorld.Positions[p.Seat])<.02f,"authored spawn "+p.Seat);
        var positions=targets.Select(p=>p.transform.position).ToArray();await Task.Delay(1600);
        Check(targets.Select((p,i)=>Vector3.Distance(p.transform.position,positions[i])<.005f&&p.Shots==0).All(v=>v),"targets neither move nor attack");
        foreach(int kind in Weapons.Slots){Check(session.SelectTrainingWeapon(kind),"select weapon "+kind);await Wait(()=>player.Weapon==kind&&player.Ammo==Weapons.Magazines[kind],"equipped "+kind);}
        Check(!session.SelectTrainingWeapon(-1)&&!session.SelectTrainingWeapon(99),"reject invalid weapons");
        session.SelectTrainingWeapon(Weapons.Gatling);await Wait(()=>player.Weapon==Weapons.Gatling,"gatling");player.GatlingAmmo=3;
        player.ReloadTimer=TickTimer.CreateFromSeconds(session.Runner,6);session.SelectTrainingWeapon(Weapons.Gatling);
        await Wait(()=>player.Ammo==100&&!player.ReloadTimer.IsRunning,"same weapon refill");Check(player.RifleHeat==0,"refill clears recoil");
        session.SelectTrainingWeapon(Weapons.Rifle);await Wait(()=>player.Weapon==Weapons.Rifle,"respawn loadout");
        var target=targets[0];int life=target.SpawnSequence,ownLife=player.SpawnSequence;
        target.TakeDamage(300,player.transform.position,player);player.TakeOrdnanceDamage(300,player.transform.position,AttackCredit.For(player,Weapons.Rocket),true);
        Check(target.Health==0&&player.Health==0,"target and player can die");Check(target.RespawnSecondsRemaining>2.8f&&player.RespawnSecondsRemaining>2.8f,"three-second respawn timer");
        await Task.Delay(2200);Check(player.Health==0&&target.Health==0,"no early respawn");
        await Wait(()=>target.Health==300&&player.Health==300,"automatic respawn",3);
        Check(target.SpawnSequence==life+1&&player.SpawnSequence==ownLife+1,"both lives reset once");
        Check(Vector3.Distance(target.transform.position,DuelTrainingWorld.Positions[target.Seat])<.05f,"target returns to its fixed station");
        Check(player.Weapon==Weapons.Rifle&&player.Ammo==30&&Vector3.Distance(player.transform.position,DuelTrainingWorld.Positions[0])<.08f,"player returns to firing line with selected loadout");
        match.Blue=29;target.TakeDamage(300,player.transform.position,player);target.ResetForMatch();target.TakeDamage(300,player.transform.position,player);
        await Task.Delay(120);Check(match.Blue==31&&match.Phase==2&&!match.Timer.IsRunning,"training continues past thirty kills");
        session.WebControlCommand("leave");await Wait(()=>!session.Runner&&!session.IsTraining,"return to lobby");
        Check(FindFirstObjectByType<DuelWorld>(FindObjectsInactive.Include).gameObject.activeSelf,"combat arena restored");Check(!session.SelectTrainingWeapon(Weapons.Nuke),"armory unavailable outside training");
        session.LobbyCommand("{\"action\":\"training\",\"name\":\"再次練習\"}");await Wait(()=>session.IsTraining&&session.Local&&session.Match&&session.Match.Phase==2,"re-enter",40);
        Check(session.Players.Length==8&&session.Local.DisplayName=="再次練習","re-entry has clean roster and name");
        Check(session.Match.Blue==0&&session.Local.Health==300&&session.Local.Weapon==Weapons.Pistol,"re-entry resets practice stats");
        Debug.Log("RIVALS_TRAINING_SMOKE_OK checks="+checks);await session.Runner.Shutdown();UnityEditor.EditorApplication.Exit(0);
      }catch(Exception error){Debug.LogException(error);UnityEditor.EditorApplication.Exit(1);}
    }
  }
}
#endif
