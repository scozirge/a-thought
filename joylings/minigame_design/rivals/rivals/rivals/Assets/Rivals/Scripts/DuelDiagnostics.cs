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
      public int seat,team,health,weapon,owned,hits,pickups,ammo,shots,visualShots,spawnSequence;public bool bot,reloading,nameVisible,poisonSlowed;public string name;
      public float moveSpeed,respawnRemaining;public Vector3 spawnPoint;public Vector2 spawnLook;
      public float heat,spread,distance,reloadProgress,cooldown;public int shotWeapon;public string reloadStage;public Vector3 shotPoint,shotDirection;
      public Vector3 weaponPosition,weaponAngles;public float cleaverSwingAge;public Vector3 position;public float damage,fall,shotFeedbackMs,visualShotTime;
    }
    [Serializable] class PickupSnapshot {public int slot,weapon;public Vector3 position;public bool available;public float respawn;}
    [Serializable] class FeedSnapshot {public int sequence,killerTeam,victimTeam,weapon;public string killer,victim;public float remaining;}
    [Serializable] class OrdnanceSnapshot {public int sequence,stage,weapon,ownerSeat,ownerTeam;public string owner;public Vector3 position,velocity;public float remaining;}
    [Serializable] class CombatSnapshot {
      public int maxHealth,phase,game,blueKills,redKills,killsToWin,winner,localSeat,targetSeat,tickRate;public Vector2 look;public bool controls,aiming,server;
      public Vector3 cameraPosition,cameraAngles;public int localInputOwners;public bool settingsOpen,training;
      public float remaining,nameRange;public string[] winners;public FeedSnapshot[] killFeed;
      public float rttMs,frameMs,time;
      public float hudWidth,hudHeight;public Rect hudScore,hudHealth,hudAmmo,hudIdentity;
      public string identityName;public int identityTeam,identityFontSize;
      public PlayerSnapshot[] players;public PickupSnapshot[] pickups;public OrdnanceSnapshot[] ordnance;
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
        cameraPosition=Local.ViewCamera.transform.position,cameraAngles=Local.ViewCamera.transform.eulerAngles,localInputOwners=Players.Count(p=>p.HasInputAuthority),settingsOpen=showSettings,training=IsTraining,
        server=Runner.IsServer,tickRate=Runner.TickRate,rttMs=(float)Runner.GetPlayerRtt(Runner.LocalPlayer)*1000,frameMs=Time.smoothDeltaTime*1000,time=Time.realtimeSinceStartup,hudWidth=hudWidth,hudHeight=hudHeight,hudScore=scoreBounds,hudHealth=healthBounds,hudAmmo=ammoBounds,hudIdentity=identityBounds,identityName=identityName,identityTeam=identityTeam,identityFontSize=identityFontSize,
        players=Match.Players.Select(p=>new PlayerSnapshot{seat=p.Seat,team=p.Team,name=p.DisplayName,nameVisible=ShouldShowName(p),distance=Vector3.Distance(p.transform.position,Local.ViewCamera.transform.position),health=p.Health,weapon=p.Weapon,owned=p.OwnedWeapons,ammo=p.Ammo,hits=p.Hits,pickups=p.PickupsCollected,bot=p.IsBot,poisonSlowed=Match.IsInPoison(p),moveSpeed=p.GetComponent<Fusion.NetworkCharacterController>().maxSpeed,reloading=p.ReloadTimer.IsRunning,reloadProgress=p.ReloadProgress,reloadStage=p.ReloadTimer.IsRunning?Weapons.ReloadStage(p.Weapon,p.ReloadProgress):"",heat=p.RifleHeat,spread=p.SpreadAngle,cooldown=p.CooldownRemaining,shotWeapon=p.ShotWeapon,shotPoint=p.ShotPoint,shotDirection=p.ShotDirection,weaponPosition=p.VisibleWeapon?p.VisibleWeapon.position:Vector3.zero,weaponAngles=p.VisibleWeapon?p.VisibleWeapon.eulerAngles:Vector3.zero,cleaverSwingAge=p.CleaverSwingAge,position=p.transform.position,damage=p.DamagePulse,fall=p.DeathProgress,shots=p.Shots,visualShots=p.VisualShots,shotFeedbackMs=p.ShotFeedbackMs,visualShotTime=p.LastVisualShotTime,respawnRemaining=p.RespawnSecondsRemaining,spawnSequence=p.SpawnSequence,spawnPoint=p.SpawnPoint,spawnLook=p.SpawnLook}).ToArray(),
        ordnance=Enumerable.Range(0,DuelMatch.OrdnanceCapacity).Select(i=>Match.Ordnance[i]).Where(o=>o.Stage!=0).Select(o=>new OrdnanceSnapshot{sequence=o.Sequence,stage=o.Stage,weapon=o.Weapon,ownerSeat=o.Owner.Seat,ownerTeam=o.Owner.Team,owner=o.Owner.Name.ToString(),position=o.Position,velocity=o.Velocity,remaining=o.Lifetime.RemainingTime(Runner)??0}).ToArray(),
        pickups=Enumerable.Range(0,DuelMatch.PickupCount).Where(slot=>Match.Pickups[slot].Weapon>=0).Select(slot=>{var p=Match.Pickups[slot];return new PickupSnapshot{slot=slot,weapon=p.Weapon,position=p.Position,available=!p.Respawn.IsRunning,respawn=p.Respawn.RemainingTime(Runner)??0};}).ToArray()};
      RivalsReportState(JsonUtility.ToJson(snapshot));
#endif
    }
  }
}
