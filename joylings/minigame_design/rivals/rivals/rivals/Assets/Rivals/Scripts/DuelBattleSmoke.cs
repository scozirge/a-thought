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
    static int inputLife=-1;
    static Vector2 controlledLook;
    static Vector2 controlledMove;
    public static int? InputSpawnSequence;
    DuelSession session;
    DuelPlayer player,enemy;
    void Awake(){Running=true;}
    public static DuelInput Input(DuelSession s){if(s.Local&&inputLife!=s.Local.SpawnSequence){inputLife=s.Local.SpawnSequence;press=0;}s.Look=controlledLook;var input=new DuelInput{Look=controlledLook,Move=controlledMove,Weapon=-1,FirePress=press};input.Buttons.Set(Action.Fire,fire);return input;}
    static void Check(bool value,string message){if(!value)throw new Exception("BATTLE_SMOKE_FAILED "+message);Debug.Log("BATTLE_CHECK "+message);}
    static async Task Wait(Func<bool> condition,string label,float seconds=15){float deadline=Time.realtimeSinceStartup+seconds;while(!condition()){if(Time.realtimeSinceStartup>deadline)throw new Exception("BATTLE_TIMEOUT "+label);await Task.Delay(20);}}
    void Place(DuelPlayer p,Vector3 position){p.GetComponent<NetworkCharacterController>().Teleport(position);p.GetComponent<NetworkCharacterController>().Velocity=Vector3.zero;}
    async Task SetupTarget(float distance,int weapon) {
      fire=false;player.ResetForMatch();enemy.ResetForMatch();player.CollectWeapon(weapon);
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
        enemy.IsBot=false;enemy.ResetForMatch();enemy.CollectWeapon(4);Place(enemy,new Vector3(34,.1f,-15));enemy.Look=Vector2.zero;enemy.IsBot=true;await Task.Delay(200);
        Check(Mathf.Abs(Mathf.DeltaAngle(0,enemy.Look.x))<30,"bot turns gradually instead of snapping");
        float observationEnd=Time.realtimeSinceStartup+6,largestAimError=0;int observedShots=enemy.Shots;
        while(Time.realtimeSinceStartup<observationEnd){
          if(enemy.Shots!=observedShots){observedShots=enemy.Shots;var body=player.transform.position+Vector3.up*1.05f-(enemy.transform.position+Vector3.up*1.55f);largestAimError=Mathf.Max(largestAimError,Vector3.Angle(enemy.ShotDirection,body));}
          await Task.Delay(20);
        }
        Check(enemy.Shots>botShots&&enemy.Shots-botShots<=3,"bot sniper fires sparingly");
        Check(largestAimError>.1f,"bot sniper has visible aiming error");
        Debug.Log($"RIVALS_BOT_TUNING_OK shots={enemy.Shots-botShots} largestAimError={largestAimError}");enemy.IsBot=false;player.ResetForMatch();enemy.ResetForMatch();
        Physics.SyncTransforms();
        foreach(int side in new[]{-1,1})foreach(int sign in new[]{-1,1}) {
          Check(Physics.Raycast(new Vector3(side*24,8,sign*9),Vector3.down,out var tall,10,DuelPlayer.WorldMask)&&Mathf.Abs(tall.point.y-3.6f)<.02f,"new tall cover collider");
          Check(Physics.Raycast(new Vector3(side*8,8,sign*15),Vector3.down,out var low,10,DuelPlayer.WorldMask)&&Mathf.Abs(low.point.y-.95f)<.02f,"new low cover collider");
          Check(Physics.Raycast(new Vector3(side*18,8,sign*20),Vector3.down,out var deck,10,DuelPlayer.WorldMask)&&Mathf.Abs(deck.point.y-1.5f)<.02f,"raised flank deck collider");
        }
        foreach(var corner in DuelPickups.SpawnPoints)Check(!Physics.CheckCapsule(corner+Vector3.up*.45f,corner+Vector3.up*1.45f,.35f,DuelPlayer.WorldMask),"corner pickup accessible");
        await SetupTarget(4,3);await FireOnce();Check(enemy.Health==0&&player.LastHitDamage==DuelPlayer.MaxHealth,"shotgun near one-shot");
        Check(FindObjectsByType<DuelShotTracer>(FindObjectsSortMode.None).Count(t=>t.gameObject.activeInHierarchy)>=9,"visible shotgun fan");
        await Task.Delay(300);Check(enemy.Health==0&&enemy.RespawnTimer.IsRunning,"dead player waits for respawn countdown");
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
        player.ResetForMatch();enemy.ResetForMatch();Place(enemy,new Vector3(-33,.1f,0));Place(player,DuelPickups.SpawnPoints[2]);
        await Wait(()=>player.Weapon==0,"corner rifle pickup");Check(player.OwnedWeapons==(1<<0),"only current gun owned");
        player.RifleAmmo=1;int pickups=player.PickupsCollected;Check(!player.CollectWeapon(0)&&player.PickupsCollected==pickups,"same gun cannot be collected for ammo");
        var timer=session.Match.Pickups[2].Respawn.RemainingTime(session.Runner)??0;Check(timer>4.5f&&timer<=5,"five-second respawn");
        await Wait(()=>!session.Match.Pickups[2].Respawn.IsRunning,"weapon respawns",7);await Task.Delay(150);Check(player.PickupsCollected==pickups,"standing on same respawned gun leaves it for others");
        Place(player,new Vector3(34,.1f,-30));Check(player.CollectWeapon(4)&&player.OwnedWeapons==(1<<4)&&!player.HasWeapon(0),"pickup replaces old weapon");
        var match=session.Match;
        foreach(var p in session.Players)p.ResetForMatch();
        match.Blue=4;match.Red=0;
        int feed=match.EliminationSequence;
        enemy.TakeDamage(DuelPlayer.MaxHealth,player.transform.position,player);
        Check(match.Blue==5&&match.Phase==2,"five kills does not end the game");
        match.RecordElimination(player,enemy);enemy.TakeDamage(300,player.transform.position,player);
        Check(match.Blue==5&&match.EliminationSequence==feed+1,"one score and one feed event per death");
        var friendly=session.Players.First(p=>p!=player&&p.Team==player.Team);
        Check(friendly.TakeDamage(300,player.transform.position,player)==0&&friendly.Health==DuelPlayer.MaxHealth,"friendly fire cannot score or kill");
        var snapshot=new DuelSession.SeatSnapshot(enemy);
        var deadline=enemy.RespawnTimer;
        enemy.ResetForMatch();snapshot.Apply(enemy);enemy.IsBot=true;
        Check(enemy.Health==0&&enemy.RespawnTimer.Equals(deadline)&&enemy.EliminationRecorded,"bot replacement preserves death timer and score guard");
        int oldLife=enemy.SpawnSequence;var deathPosition=enemy.transform.position;
        await Task.Delay(2400);Check(enemy.Health==0&&enemy.SpawnSequence==oldLife,"no early respawn before three seconds");
        await Wait(()=>enemy.Health>0,"bot respawn",2);enemy.IsBot=false;
        Check(enemy.SpawnSequence==oldLife+1&&enemy.Health==300&&enemy.Weapon==Weapons.Pistol,"bot respawns with full health and pistol");
        Check(Vector3.Distance(enemy.SpawnPoint,deathPosition)>=5&&DuelRespawn.IsClear(enemy.SpawnPoint),"bot respawn uses a different clear position");
        var distinct=new System.Collections.Generic.HashSet<Vector3>();
        for(int attempt=0;attempt<64;attempt++) {
          Check(DuelRespawn.TryFindPosition(enemy,session.Players,out var spot)&&DuelRespawn.IsClear(spot),"random respawn fits the world");
          Check(session.Players.Where(p=>p!=enemy&&p.Health>0).All(p=>(p.transform.position-spot).sqrMagnitude>=4),"respawn avoids living characters");
          distinct.Add(spot);
        }
        Check(distinct.Count>48,"respawn choices vary across the map");
        int oldShots=player.Shots,oldPlayerLife=player.SpawnSequence;
        var playerDeathPosition=player.transform.position;
        player.TakeDamage(300,enemy.transform.position,enemy);fire=true;press++;
        float countdown=player.RespawnTimer.RemainingTime(session.Runner)??0;
        Debug.Log($"RIVALS_RESPAWN_TIMER seconds={countdown:R} ticks={player.RespawnTimer.RemainingTicks(session.Runner)}");
        Check(player.RespawnTimer.RemainingTicks(session.Runner)==Mathf.RoundToInt(3*session.Runner.TickRate)&&player.RespawnSecondsRemaining==3,"player countdown starts at three seconds");
        await Task.Delay(2600);Check(player.Health==0&&player.Shots==oldShots,"dead player cannot fire or revive early");fire=false;
        await Wait(()=>player.Health>0,"human respawn",2);
        controlledLook=player.SpawnLook;
        Check(player.SpawnSequence==oldPlayerLife+1&&player.Health==300&&player.Weapon==Weapons.Pistol&&player.Ammo==12,"human respawns with full health and fresh pistol");
        Check(Vector3.Distance(player.SpawnPoint,playerDeathPosition)>=5&&DuelRespawn.IsClear(player.SpawnPoint),"human random spawn is clear and different");
        InputSpawnSequence=oldPlayerLife;controlledMove=Vector2.up;fire=true;press++;
        var beforeStaleInput=player.transform.position;
        await Task.Delay(250);fire=false;press=0;controlledMove=Vector2.zero;InputSpawnSequence=null;
        Check(player.Shots==oldShots&&Vector3.Distance(beforeStaleInput,player.transform.position)<.1f,"previous-life packets cannot move or fire");
        await Task.Delay(150);
        Check(player.Shots==oldShots,"stale input does not leak into the new life");
        Check(player.DeathProgress==0&&player.DamagePulse==0&&Mathf.Abs(Mathf.DeltaAngle(player.ViewCamera.transform.eulerAngles.y,player.SpawnLook.x))<.1f,"respawn resets death pose and local view");
        press++;await Wait(()=>player.Shots==oldShots+1,"first short press after respawn",2);
        Check(player.Ammo==11,"first new-life click is not swallowed when held button packet is missing");
        match.Timer=TickTimer.CreateFromSeconds(session.Runner,.05f);await Task.Delay(150);
        Check(match.Phase==2,"combat has no time-limit round transition");
        foreach(var p in session.Players.Where(p=>p.Team==1)){p.ResetForMatch();p.TakeDamage(300,player.transform.position,player);}
        int wipeScore=match.Blue;await Task.Delay(300);
        Check(match.Phase==2&&match.Blue==wipeScore&&session.Players.Where(p=>p.Team==1).All(p=>p.Health==0),"team wipe does not end the game");
        await Wait(()=>session.Players.Where(p=>p.Team==1).All(p=>p.Health==300),"team respawns",4);
        match.Blue=29;match.Red=28;
        player.ResetForMatch();friendly.ResetForMatch();
        player.TakeDamage(300,enemy.transform.position,enemy);
        Check(match.Red==29&&match.Phase==2,"29 kills still plays");
        friendly.TakeDamage(300,enemy.transform.position,enemy);
        Check(match.Red==30&&match.Blue==29&&match.Phase==4&&match.Winner==1,"red thirtieth kill wins immediately");
        feed=match.EliminationSequence;int frozenLife=player.SpawnSequence;
        enemy.TakeDamage(300,player.transform.position,player);match.RecordElimination(player,friendly);
        Check(match.Blue==29&&match.Red==30&&match.EliminationSequence==feed,"no score or damage after victory");
        Check(match.Winners.All(w=>!string.IsNullOrEmpty(w.Name.ToString())),"winner names snapshot");
        await Task.Delay(500);var podium=match.GetComponent<DuelPodium>();Check(podium.Camera&&podium.Winners.All(p=>p!=null),"four winners on stage");Capture(podium.Camera,"kill-race-podium-editor.png");
        await Task.Delay(3000);Check(match.Phase==4&&player.Health==0&&player.SpawnSequence==frozenLife,"no respawn during the victory display");
        foreach(var p in session.Players)if(p!=player)p.IsBot=true;
        await Wait(()=>match.Game==2&&match.Phase==1,"automatic next game",9);
        foreach(var p in session.Players)if(p!=player)p.IsBot=false;
        Check(match.Blue==0&&match.Red==0,"new game clears both kill scores");
        Check(session.Players.Select(p=>p.Seat).Distinct().Count()==8&&session.Players.Count(p=>p.Team==0)==4&&session.Players.Count(p=>p.Team==1)==4,"reshuffle unique balanced seats");
        Check(session.Players.All(p=>p.Health==300&&p.OwnedWeapons==(1<<Weapons.Pistol)&&!p.RespawnTimer.IsRunning),"new game revives everyone and clears death timers");
        await Wait(()=>match.Phase==2,"new game countdown",6);
        var blueWinner=session.Players.First(p=>p.Team==0);var redTarget=session.Players.First(p=>p.Team==1);
        match.Blue=29;match.Red=29;redTarget.TakeDamage(300,blueWinner.transform.position,blueWinner);
        Check(match.Blue==30&&match.Red==29&&match.Winner==0&&match.Phase==4,"blue thirtieth kill wins immediately");
        Debug.Log("RIVALS_KILL_RACE_OK target=30 respawn=3 randomSamples=64");
        Debug.Log("RIVALS_BATTLE_SMOKE_OK");await session.Runner.Shutdown();UnityEditor.EditorApplication.Exit(0);
      }catch(Exception e){Debug.LogException(e);UnityEditor.EditorApplication.Exit(1);}
    }
  }
}
#endif
