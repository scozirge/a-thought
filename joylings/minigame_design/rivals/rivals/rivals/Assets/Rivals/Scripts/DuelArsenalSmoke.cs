#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  // Test input and controlled setups exist only in the editor, never in releases.
  public sealed class DuelArsenalSmoke : MonoBehaviour {
    public static bool Running;
    static bool fire,reload;static int press,alt,life=-1;static Vector2 look,move;
    DuelSession session;DuelMatch match;DuelPlayer player,enemy;int checks;
    void Awake(){Running=true;}
    public static DuelInput Input(DuelSession s){if(s.Local&&life!=s.Local.SpawnSequence){life=s.Local.SpawnSequence;press=alt=0;}s.Look=look;var input=new DuelInput{Look=look,Move=move,Weapon=-1,FirePress=press,AltPress=alt};input.Buttons.Set(Action.Fire,fire);input.Buttons.Set(Action.Reload,reload);return input;}
    void Check(bool value,string label){if(!value)throw new Exception("ARSENAL_FAILED "+label);checks++;Debug.Log("ARSENAL_CHECK "+label);}
    static async Task Wait(Func<bool> condition,string label,float seconds=15){float deadline=Time.realtimeSinceStartup+seconds;while(!condition()){if(Time.realtimeSinceStartup>deadline)throw new Exception("ARSENAL_TIMEOUT "+label);await Task.Delay(20);}}
    void Place(DuelPlayer p,Vector3 position){p.GetComponent<NetworkCharacterController>().Teleport(position);p.GetComponent<NetworkCharacterController>().Velocity=Vector3.zero;}
    async Task Setup(int kind,float distance=6,float pitch=0) {
      fire=reload=false;move=look=Vector2.zero;match.ClearOrdnance();match.Blue=match.Red=0;
      foreach(var p in session.Players){p.IsBot=false;p.ResetForMatch();Place(p,new Vector3(-33,.1f,-26+p.Seat*6));}
      for(int slot=0;slot<DuelMatch.PickupCount;slot++){var pickup=match.Pickups[slot];pickup.Respawn=TickTimer.CreateFromSeconds(session.Runner,600);match.Pickups.Set(slot,pickup);}
      player.CollectWeapon(kind);Place(player,new Vector3(34,.1f,-8));Place(enemy,new Vector3(34,.1f,-8+distance));
      look=player.Look=session.Look=new Vector2(0,pitch);Physics.SyncTransforms();await Task.Delay(350);
    }
    async Task Once(bool secondary=false){int before=player.Shots;if(secondary)alt++;else press++;await Wait(()=>player.Shots>before,"weapon fire",3);await Task.Delay(40);}
    OrdnanceState Active(int stage)=>match.Ordnance.FirstOrDefault(o=>o.Stage==stage);
    void Capture(string name){var camera=player.ViewCamera;var target=new RenderTexture(1280,720,24);camera.targetTexture=target;camera.Render();var previous=RenderTexture.active;RenderTexture.active=target;var texture=new Texture2D(1280,720,TextureFormat.RGB24,false);texture.ReadPixels(new Rect(0,0,1280,720),0,0);texture.Apply();File.WriteAllBytes("Logs/Arsenal/"+name+".png",texture.EncodeToPNG());camera.targetTexture=null;RenderTexture.active=previous;target.Release();Destroy(target);Destroy(texture);}
    async void Start() {
      try {
        session=DuelSession.Instance;await Wait(()=>session.Local&&session.Match&&session.Match.Phase==2&&session.Players.Length==8,"ready",60);
        match=session.Match;player=session.Local;enemy=session.Players.First(p=>p.Team!=player.Team);Directory.CreateDirectory("Logs/Arsenal");
        foreach(var point in DuelPickups.SpawnPoints)Check(!Physics.CheckCapsule(point+Vector3.up*.45f,point+Vector3.up*1.45f,.35f,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore),"pickup accessible "+point);
        for(int slot=4;slot<14;slot+=2){var a=DuelPickups.SpawnPoints[slot];var b=DuelPickups.SpawnPoints[slot+1];Check(Mathf.Abs(a.x+b.x)<.01f&&Mathf.Abs(a.z+b.z)<.01f&&DuelPickups.WeaponFor(slot,1)==DuelPickups.WeaponFor(slot+1,1),"mirrored pickup "+slot);}
        await Setup(Weapons.Sniper,8,4);await Once();Check(enemy.Health==150,"sniper body damage remains 150");
        await Setup(Weapons.Sniper,8);await Once();Check(enemy.Health==0,"sniper headshot kills full health");
        await Setup(Weapons.Gatling,6,7);await Once();Check(enemy.Health==276,"gatling body damage doubled to 24");
        await Setup(Weapons.Gatling,40,-40);float baseSpread=player.SpreadAngle;int shots=player.Shots;fire=true;press++;await Task.Delay(1050);fire=false;
        Check(player.Shots-shots>=12&&player.Shots-shots<=18,"gatling fast sustained fire");Check(player.Ammo==100-(player.Shots-shots),"gatling 100-round magazine");Check(player.SpreadAngle>baseSpread+5,"crosshair follows increased shot spread");Capture("gatling");
        await Task.Delay(3200);Check(player.RifleHeat==0&&player.SpreadAngle<1,"spread recovers after burst");
        reload=true;await Wait(()=>player.ReloadTimer.IsRunning,"gatling reload begins");reload=false;Check(player.ReloadTimer.RemainingTime(session.Runner)>11.8f,"twelve-second reload");shots=player.Shots;fire=true;await Task.Delay(700);fire=false;Check(player.Shots==shots,"reload blocks firing");await Wait(()=>!player.ReloadTimer.IsRunning,"reload finishes",13);Check(player.Ammo==100,"reload replenishes magazine");

        await Setup(Weapons.Rocket,6,14);var others=session.Players.Where(p=>p.Team!=player.Team&&p!=enemy).ToArray();var friendly=session.Players.First(p=>p!=player&&p.Team==player.Team);var covered=session.Players.First(p=>p!=player&&p!=friendly&&p.Team==player.Team);Place(friendly,new Vector3(32.2f,.1f,-3.3f));Place(covered,new Vector3(37,.1f,-2));Place(others[0],new Vector3(34,.1f,1));Place(others[1],new Vector3(34,.1f,4.6f));Place(others[2],new Vector3(34,.1f,6));Physics.SyncTransforms();
        await Once();Check(enemy.Health==300&&Active(OrdnanceState.Flying).Sequence>0,"rocket travels before dealing damage");var flight=Active(OrdnanceState.Flying);await Task.Delay(120);var later=Active(OrdnanceState.Flying);Check(later.Sequence==flight.Sequence&&later.Velocity.y<flight.Velocity.y,"rocket has gravity");
        shots=player.Shots;press++;await Task.Delay(250);Check(player.Shots==shots,"rocket cannot fire before four seconds");
        await Wait(()=>enemy.Health==0,"direct rocket impact",3);Check(player.LastHitDamage>=100&&player.Ammo==1&&!player.ReloadTimer.IsRunning,"rocket never reloads");
        Check(others[0].Health==150,"expanded rocket inner radius includes victim beyond three meters");Check(others[1].Health==200,"expanded rocket outer radius includes victim beyond six meters");Check(others[2].Health==300,"rocket outside radius safe");Check(player.Health==200&&friendly.Health==150,$"rocket damages self and teammate self={player.Health} friend={friendly.Health}");Check(covered.Health==300,"wall blocks rocket splash");Check((player.Team==0?match.Blue:match.Red)==1&&(player.Team==0?match.Red:match.Blue)==0,"friendly rocket damage does not change score");Capture("rocket-explosion");
        await Wait(()=>player.FireTimer.ExpiredOrNotRunning(session.Runner),"rocket cooldown finishes",5);await Task.Delay(300);Check(player.Shots==shots,"rocket cooldown tap is discarded");
        look=new Vector2(0,-70);await Task.Delay(80);fire=true;await Once();shots=player.Shots;await Task.Delay(4400);Check(player.Shots==shots,"holding rocket does not auto-fire");fire=false;await Task.Delay(80);await Once();Check(player.Shots==shots+1,"fresh rocket tap fires once");
        Check(DuelMatch.RocketDamage(0,true)==300&&DuelMatch.RocketDamage(3.9f,false)==150&&DuelMatch.RocketDamage(3.91f,false)==100&&DuelMatch.RocketDamage(7.8f,false)==100&&DuelMatch.RocketDamage(7.81f,false)==0,"rocket exact damage boundaries");

        await Setup(Weapons.Cleaver,2);await Once();Check(enemy.Health==0&&player.Weapon==Weapons.Cleaver,"cleaver melee one hit kill without consuming");
        await Setup(Weapons.Cleaver,3);await Once();Check(enemy.Health==0,"cleaver reaches beyond the old two-and-a-half-meter limit");
        await Setup(Weapons.Cleaver,4.9f);await Once();Check(enemy.Health==0,"cleaver kills near the new five-meter limit");
        await Setup(Weapons.Cleaver,5.1f);await Once();Check(enemy.Health==300,"cleaver cannot melee beyond five meters");move=Vector2.up;await Task.Delay(400);Check(player.GetComponent<NetworkCharacterController>().maxSpeed>7,"cleaver increases movement speed");move=Vector2.zero;
        await Setup(Weapons.Cleaver,7);await Once(true);Check(player.Weapon==Weapons.Pistol&&player.Ammo==12,"short secondary press throws and returns pistol");Check(Active(OrdnanceState.Flying).Weapon==Weapons.Cleaver,"thrown cleaver has flight state");await Wait(()=>enemy.Health==0,"flying cleaver hit",3);Check(match.Eliminations.Any(e=>e.Weapon==Weapons.Cleaver&&e.Killer.ToString()==player.DisplayName),"flying cleaver credit retains original weapon");
        await Setup(Weapons.Cleaver,4.9f);var wall=GameObject.CreatePrimitive(PrimitiveType.Cube);wall.transform.position=new Vector3(34,1,-7);wall.transform.localScale=new Vector3(2,2,.15f);Physics.SyncTransforms();await Once();Check(enemy.Health==300,"wall blocks extended melee reach");Destroy(wall);await Task.Delay(50);

        await Setup(Weapons.Poison,25,15);await Once();Check(Active(OrdnanceState.Flying).Weapon==Weapons.Poison,"poison is a physical projectile");shots=player.Shots;press++;await Task.Delay(400);Check(player.Shots==shots,"poison three-second cooldown");
        await Wait(()=>Active(OrdnanceState.Toxic).Sequence>0,"poison ground area",3);var zone=Active(OrdnanceState.Toxic);Check(zone.Lifetime.RemainingTime(session.Runner)>4.6f,"poison area lasts five seconds");Check(Vector3.Distance(zone.Position,player.transform.position)>8,"poison throw reaches farther");
        Place(enemy,zone.Position+Vector3.right*.1f);Physics.SyncTransforms();await Wait(()=>enemy.Health<300,"poison first tick",2);Check(enemy.Health==270,"poison tick deals 30");
        Place(friendly,zone.Position+Vector3.right*1.1f);Place(player,zone.Position+Vector3.back*1.5f);Physics.SyncTransforms();await Wait(()=>friendly.Health<300&&player.Health<300,"poison harms all teams",2);Check(friendly.Health==270&&player.Health==270,"poison damages self and teammate");
        Check(match.IsInPoison(player)&&match.IsInPoison(friendly)&&Mathf.Abs(player.GetComponent<NetworkCharacterController>().maxSpeed-3.3f)<.02f,"poison slows all teams by forty percent");
        var edge=zone.Position+Vector3.forward*5.8f;Place(enemy,edge);Check(match.IsInPoison(enemy),"expanded poison includes 5.8 meters");Place(enemy,zone.Position+Vector3.forward*6.2f);Check(!match.IsInPoison(enemy),"poison excludes beyond six meters");Place(enemy,zone.Position+Vector3.forward*.1f);
        Place(player,new Vector3(34,.1f,-8));Place(friendly,new Vector3(-33,.1f,-8));
        var overlap=zone;overlap.Sequence=++match.OrdnanceSequence;match.Ordnance.Set(47,overlap);int health=enemy.Health;await Task.Delay(550);Check(enemy.Health>=health-60&&enemy.Health<=health-30,"overlapping poison does not multiply tick damage");Capture("poison-area");
        Place(enemy,new Vector3(34,.1f,15));Physics.SyncTransforms();health=enemy.Health;await Task.Delay(600);Check(enemy.Health==health,"leaving poison stops damage");Check(!match.IsInPoison(player)&&Mathf.Abs(player.GetComponent<NetworkCharacterController>().maxSpeed-5.5f)<.02f,"leaving poison restores speed");
        await Wait(()=>player.Shots>shots,"poison queued throw after cooldown",4);Check(!player.ReloadTimer.IsRunning&&player.Weapon==Weapons.Poison,"poison unlimited supply");
        int zoneSequence=zone.Sequence;await Wait(()=>!match.Ordnance.Any(o=>o.Sequence==zoneSequence),"poison expires after five seconds",6);Check(!match.Ordnance.Any(o=>o.Sequence==zoneSequence),"poison expires on schedule");
        match.ClearOrdnance();await Task.Delay(50);Check(match.Ordnance.All(o=>o.Stage==0),"new round clears active effects");

        await Setup(Weapons.Nuke,5,-70);int old=player.Shots;press++;await Task.Delay(400);Check(player.Weapon==Weapons.Nuke&&player.Shots==old,"invalid sky target does not consume nuke");
        look=new Vector2(0,25);await Task.Delay(100);await Once();var warning=Active(OrdnanceState.Warning);float warningDuration=(warning.Lifetime.RemainingTime(session.Runner)??0)+(float)session.Runner.SimulationTime-warning.StartedAt;Check(warning.Sequence>0&&Mathf.Abs(warningDuration-7)<.04f,$"nuclear strike warns for seven seconds duration={warningDuration}");Check(player.Weapon==Weapons.Pistol&&player.ShotWeapon==Weapons.Nuke,"nuke consumed with pistol restored");
        var extra=session.Players.First(p=>p!=enemy&&p.Team!=player.Team);
        Place(player,warning.Position+Vector3.back*3);Place(friendly,warning.Position+Vector3.right*2);Place(enemy,warning.Position+Vector3.forward*2);Place(extra,warning.Position+Vector3.forward*5);Physics.SyncTransforms();
        // This kill reaches 30 during the blast: all other victims must still die.
        if(player.Team==0)match.Blue=29;else match.Red=29;await Task.Delay(5500);Check(player.Health==300&&enemy.Health==300,"no early nuclear damage");Capture("nuclear-warning");
        await Wait(()=>match.Phase==4,"nuclear blast reaches kill target",3);Check(player.Health==0&&friendly.Health==0&&enemy.Health==0&&extra.Health==0,"nuke kills all teams even as winning kill ends match");
        Check((player.Team==0?match.Blue:match.Red)==30&&(player.Team==0?match.Red:match.Blue)==0,"friendly nuclear deaths do not award enemy points");Check(Active(OrdnanceState.NuclearBlast).Sequence>0,"nuclear explosion replicated");
        Check(match.Eliminations.Any(e=>e.Weapon==Weapons.Nuke&&e.Killer.ToString()==warning.Owner.Name.ToString()),"delayed nuclear kill keeps original author");
        Debug.Log("RIVALS_ARSENAL_SMOKE_OK checks="+checks);await session.Runner.Shutdown();UnityEditor.EditorApplication.Exit(0);
      }catch(Exception error){Debug.LogException(error);UnityEditor.EditorApplication.Exit(1);}
    }
  }
}
#endif
