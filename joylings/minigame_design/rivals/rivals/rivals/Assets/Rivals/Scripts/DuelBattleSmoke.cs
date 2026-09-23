#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  // Editor-only integration of the same gameplay code compiled into Web.
  // No debug controls, commands, or test setters are shipped in the Web player.
  public sealed class DuelBattleSmoke : MonoBehaviour {
    public static bool Running;
    static bool fire;
    static int press;
    static Vector2 controlledLook;
    DuelSession session;
    DuelPlayer player,enemy;
    void Awake(){Running=true;}
    public static DuelInput Input(DuelSession s){s.Look=controlledLook;var input=new DuelInput{Look=controlledLook,Weapon=-1,FirePress=press};input.Buttons.Set(Action.Fire,fire);return input;}
    static void Check(bool value,string message){if(!value)throw new Exception("BATTLE_SMOKE_FAILED "+message);Debug.Log("BATTLE_CHECK "+message);}
    static async Task Wait(Func<bool> condition,string label,float seconds=15){float deadline=Time.realtimeSinceStartup+seconds;while(!condition()){if(Time.realtimeSinceStartup>deadline)throw new Exception("BATTLE_TIMEOUT "+label);await Task.Delay(20);}}
    void Place(DuelPlayer p,Vector3 position){p.GetComponent<NetworkCharacterController>().Teleport(position);p.GetComponent<NetworkCharacterController>().Velocity=Vector3.zero;}
    async Task SetupTarget(float distance,int weapon) {
      fire=false;player.ResetRound();enemy.ResetRound();player.CollectWeapon(weapon);
      Place(player,new Vector3(34,.1f,-33));Place(enemy,new Vector3(34,.1f,-33+distance));
      controlledLook=player.Look=session.Look=Vector2.zero;enemy.Look=new Vector2(180,0);await Task.Delay(350);
    }
    async Task FireOnce(){int shots=player.Shots;press++;fire=true;await Wait(()=>player.Shots>shots,"shot");fire=false;await Task.Delay(40);}
    void Capture(Camera camera,string name) {
      var target=new RenderTexture(1280,720,24);var previous=RenderTexture.active;camera.targetTexture=target;camera.Render();RenderTexture.active=target;
      var pixels=new Texture2D(1280,720,TextureFormat.RGB24,false);pixels.ReadPixels(new Rect(0,0,1280,720),0,0);pixels.Apply();Directory.CreateDirectory("Logs");File.WriteAllBytes("Logs/"+name,pixels.EncodeToPNG());camera.targetTexture=null;RenderTexture.active=previous;target.Release();Destroy(target);Destroy(pixels);
    }
    async void Start() {
      try {
        session=DuelSession.Instance;await Wait(()=>session.Local&&session.Match&&session.Match.Phase==2&&session.Players.Length==8,"eight players",45);
        player=session.Local;enemy=session.Players.First(p=>p.Team!=player.Team);
        Physics.SyncTransforms();
        for(int blue=0;blue<8;blue+=2)for(int red=1;red<8;red+=2)
          foreach(float offset in new[]{-.35f,0,.35f})foreach(float height in new[]{1.05f,1.55f,1.85f}) {
            var from=DuelPlayer.SpawnPosition(blue)+Vector3.up*1.55f;
            var to=DuelPlayer.SpawnPosition(red)+new Vector3(offset,height,0);
            Check(Physics.Linecast(from,to,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore),"opposing spawn sightline blocked");
          }
        var middleRoute=new[]{new Vector3(0,0,-29),new Vector3(0,0,-2),new Vector3(8.5f,0,-2),new Vector3(8.5f,0,2),new Vector3(0,0,2),new Vector3(0,0,29)};
        foreach(int side in new[]{-1,1})for(int segment=1;segment<middleRoute.Length;segment++) {
          var from=middleRoute[segment-1]*side;var to=middleRoute[segment]*side;int steps=Mathf.CeilToInt(Vector3.Distance(from,to)*2);
          for(int step=0;step<=steps;step++) {
            var foot=Vector3.Lerp(from,to,(float)step/steps);
            Check(!Physics.CheckCapsule(foot+Vector3.up*.45f,foot+Vector3.up*1.45f,.35f,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore),"winding middle route fits player");
          }
        }
        foreach(int side in new[]{-1,1})for(int z=-33;z<=33;z++) {
          var foot=new Vector3(side*33,0,z);
          Check(!Physics.CheckCapsule(foot+Vector3.up*.45f,foot+Vector3.up*1.45f,.35f,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore),"outer lane stays open");
        }
        Debug.Log("RIVALS_SPAWN_SCREENS_OK sightlines=144 middleRoutes=2 outerLanes=2");
        foreach(var p in session.Players){p.IsBot=false;Place(p,new Vector3(-33,.1f,-28+p.Seat*6));}
        session.Match.Timer=TickTimer.CreateFromSeconds(session.Runner,240);
        Check(session.Players.All(p=>p.Health==DuelPlayer.MaxHealth),"everyone starts with 300 health");
        await SetupTarget(18,Weapons.Pistol);enemy.CollectWeapon(4);enemy.IsBot=true;
        int botShots=enemy.Shots;await Task.Delay(650);
        Check(enemy.Shots==botShots,"bot waits before first shot");
        enemy.IsBot=false;enemy.ResetRound();enemy.CollectWeapon(4);Place(enemy,new Vector3(34,.1f,-15));enemy.Look=Vector2.zero;enemy.IsBot=true;await Task.Delay(200);
        Check(Mathf.Abs(Mathf.DeltaAngle(0,enemy.Look.x))<30,"bot turns gradually instead of snapping");
        float observationEnd=Time.realtimeSinceStartup+6,largestAimError=0;int observedShots=enemy.Shots;
        while(Time.realtimeSinceStartup<observationEnd){
          if(enemy.Shots!=observedShots){observedShots=enemy.Shots;var body=player.transform.position+Vector3.up*1.05f-(enemy.transform.position+Vector3.up*1.55f);largestAimError=Mathf.Max(largestAimError,Vector3.Angle(enemy.ShotDirection,body));}
          await Task.Delay(20);
        }
        Check(enemy.Shots>botShots&&enemy.Shots-botShots<=3,"bot sniper fires sparingly");
        Check(largestAimError>.1f,"bot sniper has visible aiming error");
        Debug.Log($"RIVALS_BOT_TUNING_OK shots={enemy.Shots-botShots} largestAimError={largestAimError}");enemy.IsBot=false;player.ResetRound();enemy.ResetRound();
        Physics.SyncTransforms();
        foreach(int side in new[]{-1,1})foreach(int sign in new[]{-1,1}) {
          Check(Physics.Raycast(new Vector3(side*24,8,sign*9),Vector3.down,out var tall,10,DuelPlayer.WorldMask)&&Mathf.Abs(tall.point.y-3.6f)<.02f,"new tall cover collider");
          Check(Physics.Raycast(new Vector3(side*8,8,sign*15),Vector3.down,out var low,10,DuelPlayer.WorldMask)&&Mathf.Abs(low.point.y-.95f)<.02f,"new low cover collider");
          Check(Physics.Raycast(new Vector3(side*18,8,sign*20),Vector3.down,out var deck,10,DuelPlayer.WorldMask)&&Mathf.Abs(deck.point.y-1.5f)<.02f,"raised flank deck collider");
        }
        foreach(var corner in DuelPickups.SpawnPoints)Check(!Physics.CheckCapsule(corner+Vector3.up*.45f,corner+Vector3.up*1.45f,.35f,DuelPlayer.WorldMask),"corner pickup accessible");
        await SetupTarget(4,3);await FireOnce();Check(enemy.Health==0&&player.LastHitDamage==DuelPlayer.MaxHealth,"shotgun near one-shot");
        Check(FindObjectsByType<DuelShotTracer>(FindObjectsSortMode.None).Count(t=>t.gameObject.activeInHierarchy)>=9,"visible shotgun fan");
        await Task.Delay(300);Check(enemy.Health==0,"dead player waits for round");
        await SetupTarget(23,3);await FireOnce();Check(enemy.Health>0&&enemy.Health<DuelPlayer.MaxHealth,"shotgun distance falloff");
        await SetupTarget(6,4);await FireOnce();Check(enemy.Health==150&&player.Ammo==0&&player.ReloadTimer.IsRunning,"sniper first shot and mandatory reload");
        int before=player.Shots;fire=true;press++;await Task.Delay(300);fire=false;Check(player.Shots==before,"sniper cannot shoot while reloading");
        await Wait(()=>!player.ReloadTimer.IsRunning,"sniper reload",4);Check(player.Ammo==1,"sniper single round magazine");
        await FireOnce();Check(enemy.Health==0,"sniper second shot kills at close range");
        await SetupTarget(65,4);await FireOnce();Check(enemy.Health==150&&Vector3.Angle(player.ShotDirection,Vector3.forward)<.001f,"sniper long-range exact aim and 150 damage");
        await Wait(()=>!player.ReloadTimer.IsRunning,"long-range sniper reload",4);await FireOnce();Check(enemy.Health==0,"sniper second shot kills at long range");
        await SetupTarget(60,0);controlledLook=session.Look=new Vector2(0,-65);await Task.Delay(100);
        before=player.Shots;fire=true;press++;await Wait(()=>player.Shots>=before+3,"three rifle shots");fire=false;Check(Weapons.RifleSpread(player.RifleHeat,false)==0,"first three rifle shots accurate");
        fire=true;await Wait(()=>player.Shots>=before+10,"rifle spray");fire=false;Check(player.RifleHeat>=9&&Weapons.RifleSpread(player.RifleHeat,false)>4,"rifle spray widens");
        await Task.Delay(900);Check(player.RifleHeat==0,"tap-fire recovers accuracy");
        player.ResetRound();enemy.ResetRound();Place(enemy,new Vector3(-33,.1f,0));Place(player,DuelPickups.SpawnPoints[2]);
        await Wait(()=>player.Weapon==0,"corner rifle pickup");Check(player.OwnedWeapons==(1<<0),"only current gun owned");
        player.RifleAmmo=1;int pickups=player.PickupsCollected;Check(!player.CollectWeapon(0)&&player.PickupsCollected==pickups,"same gun cannot be collected for ammo");
        var timer=session.Match.Pickups[2].Respawn.RemainingTime(session.Runner)??0;Check(timer>4.5f&&timer<=5,"five-second respawn");
        await Wait(()=>!session.Match.Pickups[2].Respawn.IsRunning,"weapon respawns",7);await Task.Delay(150);Check(player.PickupsCollected==pickups,"standing on same respawned gun leaves it for others");
        Place(player,new Vector3(34,.1f,-30));Check(player.CollectWeapon(4)&&player.OwnedWeapons==(1<<4)&&!player.HasWeapon(0),"pickup replaces old weapon");
        foreach(var p in session.Players)p.Health=p.Team==0?DuelPlayer.MaxHealth:0;
        session.Match.Blue=3;session.Match.Red=1;session.Match.Phase=2;await Wait(()=>session.Match.Phase==3,"small round result");
        Check(session.Match.Blue==4&&session.Players.Where(p=>p.Team==1).All(p=>p.Health==0),"round result keeps defeated players down");
        await Wait(()=>session.Match.Phase==1,"automatic next round",5);Check(session.Players.All(p=>p.Health==DuelPlayer.MaxHealth&&p.Weapon==1),"new round revives with pistol");
        await Wait(()=>session.Match.Phase==2,"team countdown",6);
        var oldTeams=session.Players.ToDictionary(p=>p.DisplayName,p=>p.Team);
        foreach(var p in session.Players)p.Health=p.Team==0?DuelPlayer.MaxHealth:0;
        await Wait(()=>session.Match.Phase==4,"fifth win podium");Check(session.Match.Blue==5&&session.Match.Winner==0,"first five wins match");
        Check(session.Match.Winners.All(w=>!string.IsNullOrEmpty(w.Name.ToString())),"winner names snapshot");
        await Task.Delay(500);var podium=session.Match.GetComponent<DuelPodium>();Check(podium.Camera&&podium.Winners.All(p=>p!=null),"four winners on stage");Capture(podium.Camera,"battle-podium-editor.png");
        await Task.Delay(2000);Check(session.Match.Phase==4,"podium does not skip ten seconds");
        foreach(var p in session.Players)if(p!=player)p.IsBot=true;
        await Wait(()=>session.Match.Game==2&&session.Match.Phase==1,"automatic next big game",12);
        Check(session.Match.Blue==0&&session.Match.Red==0&&session.Match.Round==1,"fresh big-game scores");
        Check(session.Players.Select(p=>p.Seat).Distinct().Count()==8&&session.Players.Count(p=>p.Team==0)==4&&session.Players.Count(p=>p.Team==1)==4,"reshuffle unique balanced seats");
        Check(session.Players.All(p=>p.Health==DuelPlayer.MaxHealth&&p.OwnedWeapons==(1<<1)),"reshuffle revives and resets guns");
        Debug.Log("RIVALS_BATTLE_SMOKE_OK");await session.Runner.Shutdown();UnityEditor.EditorApplication.Exit(0);
      }catch(Exception e){Debug.LogException(e);UnityEditor.EditorApplication.Exit(1);}
    }
  }
}
#endif
