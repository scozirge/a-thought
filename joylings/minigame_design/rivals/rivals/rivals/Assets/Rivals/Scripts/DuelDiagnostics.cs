using System;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;

namespace RivalsPrototype {
  public partial class DuelSession {
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern int RivalsDiagnosticsEnabled();
    [DllImport("__Internal")] static extern void RivalsReportState(string json);
    [DllImport("__Internal")] static extern void RivalsReportShot(int count);
    [DllImport("__Internal")] static extern void RivalsClearDiagnostics();
    float nextDiagnostics;
    [Serializable] class PlayerSnapshot {
      public int seat,team,health,weapon,owned,hits,pickups,ammo,shots,visualShots,spawnSequence;public bool bot,reloading,nameVisible;public string name;
      public float respawnRemaining;public Vector3 spawnPoint;public Vector2 spawnLook;
      public float heat,spread,distance,reloadProgress;public string reloadStage;public Vector3 shotPoint,shotDirection;
      public Vector3 position;public float damage,fall,shotFeedbackMs,visualShotTime;
    }
    [Serializable] class PickupSnapshot {public int slot,weapon;public Vector3 position;public bool available;public float respawn;}
    [Serializable] class FeedSnapshot {public int sequence,killerTeam,victimTeam,weapon;public string killer,victim;public float remaining;}
    [Serializable] class CombatSnapshot {
      public int maxHealth,phase,game,blueKills,redKills,killsToWin,winner,localSeat,targetSeat,tickRate;public Vector2 look;public bool controls,aiming,server;
      public Vector3 cameraPosition,cameraAngles;public int localInputOwners;public bool settingsOpen;
      public float remaining,nameRange;public string[] winners;public FeedSnapshot[] killFeed;
      public float rttMs,frameMs,time;
      public PlayerSnapshot[] players;public PickupSnapshot[] pickups;
    }
#endif
    void ClearDiagnostics() {
#if UNITY_WEBGL && !UNITY_EDITOR
      nextDiagnostics=0;RivalsClearDiagnostics();
#endif
    }
    public void ReportLocalShot(int count) {
#if UNITY_WEBGL && !UNITY_EDITOR
      RivalsReportShot(count);
#endif
    }
    // Optional read-only inspection for browser QA. No gameplay setters or RPCs.
    void ReportDiagnostics() {
#if UNITY_WEBGL && !UNITY_EDITOR
      if(RivalsDiagnosticsEnabled()==0||Time.unscaledTime<nextDiagnostics||!Local||!Local.Object||!Local.Object.IsValid||!Match||!Match.Object||!Match.Object.IsValid)return;
      nextDiagnostics=Time.unscaledTime+.1f;
      var snapshot=new CombatSnapshot {maxHealth=DuelPlayer.MaxHealth,phase=Match.Phase,game=Match.Game,blueKills=Match.Blue,redKills=Match.Red,killsToWin=DuelMatch.KillsToWin,winner=Match.Winner,remaining=Match.Timer.RemainingTime(Runner)??0,
        nameRange=NameRange,killFeed=Enumerable.Range(0,DuelMatch.FeedCapacity).Select(i=>Match.Eliminations[i]).Where(e=>e.Sequence>0&&e.Game==Match.Game&&!e.Lifetime.ExpiredOrNotRunning(Runner)).OrderByDescending(e=>e.Sequence).Take(4).Select(e=>new FeedSnapshot{sequence=e.Sequence,killer=e.Killer.ToString(),victim=e.Victim.ToString(),killerTeam=e.KillerTeam,victimTeam=e.VictimTeam,weapon=e.Weapon,remaining=e.Lifetime.RemainingTime(Runner)??0}).ToArray(),
        winners=Enumerable.Range(0,4).Select(i=>Match.Winners[i].Name.ToString()).ToArray(),localSeat=Local.Seat,targetSeat=AimTarget&&AimTarget.IsReady?AimTarget.Seat:-1,look=Look,controls=ControlsActive,aiming=IsAiming,
        cameraPosition=Local.ViewCamera.transform.position,cameraAngles=Local.ViewCamera.transform.eulerAngles,localInputOwners=Players.Count(p=>p.HasInputAuthority),settingsOpen=showSettings,
        server=Runner.IsServer,tickRate=Runner.TickRate,rttMs=(float)Runner.GetPlayerRtt(Runner.LocalPlayer)*1000,frameMs=Time.smoothDeltaTime*1000,time=Time.realtimeSinceStartup,
        players=Match.Players.Select(p=>new PlayerSnapshot{seat=p.Seat,team=p.Team,name=p.DisplayName,nameVisible=ShouldShowName(p),distance=Vector3.Distance(p.transform.position,Local.ViewCamera.transform.position),health=p.Health,weapon=p.Weapon,owned=p.OwnedWeapons,ammo=p.Ammo,hits=p.Hits,pickups=p.PickupsCollected,bot=p.IsBot,reloading=p.ReloadTimer.IsRunning,reloadProgress=p.ReloadProgress,reloadStage=p.ReloadTimer.IsRunning?Weapons.ReloadStage(p.Weapon,p.ReloadProgress):"",heat=p.RifleHeat,spread=p.SpreadAngle,shotPoint=p.ShotPoint,shotDirection=p.ShotDirection,position=p.transform.position,damage=p.DamagePulse,fall=p.DeathProgress,shots=p.Shots,visualShots=p.VisualShots,shotFeedbackMs=p.ShotFeedbackMs,visualShotTime=p.LastVisualShotTime,respawnRemaining=p.RespawnSecondsRemaining,spawnSequence=p.SpawnSequence,spawnPoint=p.SpawnPoint,spawnLook=p.SpawnLook}).ToArray(),
        pickups=Enumerable.Range(0,DuelMatch.PickupCount).Select(slot=>{var p=Match.Pickups[slot];return new PickupSnapshot{slot=slot,weapon=p.Weapon,position=p.Position,available=!p.Respawn.IsRunning,respawn=p.Respawn.RemainingTime(Runner)??0};}).ToArray()};
      RivalsReportState(JsonUtility.ToJson(snapshot));
#endif
    }
  }
}
