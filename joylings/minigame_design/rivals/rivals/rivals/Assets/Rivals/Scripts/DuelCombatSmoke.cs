#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  // Opt-in development-build integration test; excluded from release Web builds.
  public sealed class DuelCombatSmoke : MonoBehaviour {
    public static bool Running;
    public static int RequestedWeapon=-1;
    void Awake(){Running=true;}
    static void Check(bool condition,string message){if(!condition)throw new Exception("COMBAT_CHECK_FAILED "+message);}
    static async Task Wait(Func<bool> condition,string message,float seconds=15) {
      float deadline=Time.realtimeSinceStartup+seconds;
      while(!condition()){if(Time.realtimeSinceStartup>deadline)throw new Exception("COMBAT_TIMEOUT "+message);await Task.Delay(50);}
    }
    static void Move(DuelPlayer player,Vector3 position) {
      var cc=player.GetComponent<NetworkCharacterController>();cc.Teleport(position);cc.Velocity=Vector3.zero;
    }
    static void Capture(string name){ScreenCapture.CaptureScreenshot(System.IO.Path.GetFullPath("Logs/combat-"+name+".png"));}
    async void Start() {
      try {
        var session=DuelSession.Instance;
        await Wait(()=>session.Local&&session.Match&&session.Match.Phase==2,"match ready");
        var player=session.Local;var match=session.Match;
        foreach(var other in match.Players.Where(p=>p!=player))other.IsBot=false;
        Check(player.Weapon==1&&player.OwnedWeapons==2&&player.PistolAmmo==12,"pistol-only spawn");
        Check(!player.HasWeapon(2)&&!player.CollectWeapon(2),"knife rejected");
        RequestedWeapon=0;await Task.Delay(350);Check(player.Weapon==1,"unowned rifle rejected by network input");RequestedWeapon=-1;
        Capture("pistol-start");
        var floor=GameObject.Find("Grid arena floor");Check(floor&&floor.transform.localScale.x==80&&floor.transform.localScale.z==80,"map doubled");
        var look=Vector2.zero;
        for(int i=0;i<30;i++)look=DuelWebInput.Rotate(look,new Vector2(200,0),.12f);
        Check(Mathf.Abs(Mathf.DeltaAngle(0,look.x))<.001f,"two full turns");
        look=DuelWebInput.Rotate(look,new Vector2(-4500,0),.12f);Check(Mathf.Abs(look.x-180)<.001f,"reverse turn");
        Debug.Log("RIVALS_COMBAT_SPAWN_OK pistol=1 inventory=2 map=80x80 yaw=720,-540");
        int firstSlot=-1;Vector3 firstPosition=default;
        foreach(int kind in new[]{3,4,0}) {
          int slot=Enumerable.Range(0,DuelMatch.PickupCount).First(n=>match.Pickups[n].Weapon==kind&&!match.Pickups[n].Respawn.IsRunning);
          var pickup=match.Pickups[slot];if(firstSlot<0){firstSlot=slot;firstPosition=pickup.Position;}
          Move(player,pickup.Position);
          await Wait(()=>player.HasWeapon(kind),"pickup "+kind);
          Check(match.Pickups[slot].Respawn.IsRunning&&match.Pickups[slot].Respawn.RemainingTime(match.Runner)>17,"18 second pickup cooldown");
          Check(player.Weapon==kind&&player.Ammo==Weapons.Magazines[kind],"auto-equip and ammo");
          Check(!player.CollectWeapon(kind),"full duplicate does not consume pickup");
          Debug.Log($"RIVALS_COMBAT_PICKUP_OK weapon={kind} slot={slot} inventory={player.OwnedWeapons}");
          Capture("pickup-"+kind);await Task.Delay(120);
        }
        var enemy=match.Players.First(p=>p.Team!=player.Team);
        Move(player,new Vector3(0,.1f,-31));Move(enemy,new Vector3(0,.1f,-25));session.Look=Vector2.zero;
        RequestedWeapon=1;await Wait(()=>player.Weapon==1,"pistol switch");RequestedWeapon=-1;
        await Task.Delay(250);
        await Wait(()=>session.AimTarget==enemy,"target health tracking");
        var fire=typeof(DuelPlayer).GetMethod("Fire",BindingFlags.Instance|BindingFlags.NonPublic);
        fire.Invoke(player,null);await Task.Delay(50);
        Check(enemy.Health<100&&enemy.DamagePulse>0,$"shot damage and received pulse health={enemy.Health} pulse={enemy.DamagePulse} point={player.ShotPoint}");
        Check(enemy.GetComponentInChildren<DuelAvatar>().FlashAmount>0,"target flashes");
        Check(player.LastHitSeat==enemy.Seat&&player.LastHitDamage>0,"hit marker damage and target");
        Capture("hit-flash");Debug.Log($"RIVALS_COMBAT_HIT_OK targetHealth={enemy.Health} damage={player.LastHitDamage} flash={enemy.GetComponentInChildren<DuelAvatar>().FlashAmount}");
        while(enemy.Health>0){await Task.Delay(320);fire.Invoke(player,null);}
        await Task.Delay(760);Check(enemy.GetComponentInChildren<DuelAvatar>().FallProgress>=.99f,"enemy fully falls");
        Check(player.LastHitKilled,"kill feedback");Capture("enemy-down");
        player.TakeDamage(25,player.transform.position+Vector3.left*5);await Task.Delay(50);
        Check(player.Health==75&&player.DamagePulse>0,"local damage feedback");Capture("received-hit");
        await Task.Delay(300);player.TakeDamage(100,enemy.transform.position);await Task.Delay(760);
        Check(player.DeathProgress>=.99f&&player.ViewCamera.transform.position.y-player.transform.position.y<.4f,"death camera drops");
        Capture("local-down");Debug.Log("RIVALS_COMBAT_DAMAGE_DEATH_OK enemyFall=1 localHealth=0 cameraHeight=0.32");
        await Wait(()=>!match.Pickups[firstSlot].Respawn.IsRunning,"pickup respawn",24);
        Check((match.Pickups[firstSlot].Position-firstPosition).sqrMagnitude>4,"respawn relocates pickup");
        Debug.Log("RIVALS_COMBAT_RESPAWN_OK relocated=true");
        match.Phase=0;await Wait(()=>player.Health==100&&match.Phase==1,"next round");await Task.Delay(150);
        Check(player.Weapon==1&&player.OwnedWeapons==2&&player.DeathProgress==0,"round clears inventory and death state");
        Check(match.Players.All(p=>p.Health==100&&p.OwnedWeapons==2),"all players reset");
        Debug.Log("RIVALS_COMBAT_SMOKE_OK pickup,ammo,ownership,damage,flash,hitbar,death,respawn,round-reset,360-look,map");
        Application.Quit(0);
      }catch(Exception error){Debug.LogException(error);Application.Quit(2);}
    }
  }
}
#endif
