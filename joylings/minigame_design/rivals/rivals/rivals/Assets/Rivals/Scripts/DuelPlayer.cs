using System.Collections.Generic;
using Fusion;
using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace RivalsPrototype {
  [RequireComponent(typeof(NetworkCharacterController))]
  public class DuelPlayer : NetworkBehaviour {
    public const int MaxHealth=300;
    public const int PlayerLayer=29;
    public const int WorldMask=~(1<<PlayerLayer);
    static readonly float[] SteeringAngles={0,45,-45,90,-90,135,-135,180};
    readonly RaycastHit[] shotHits=new RaycastHit[64];
    readonly List<LagCompensatedHit> compensatedHits=new List<LagCompensatedHit>(32);
    PropertyReader<Vector2> lookReader;
    DuelInput botInput;
    int nextBotDecision;
    int botTargetSeat=-1;
    float botSeenSince=-1;
    HitboxRoot hitboxRoot;
    public int VisualShots { get; private set; }
    public float LastVisualShotTime { get; private set; }
    public float LastInputShotTime { get; private set; }
    public float ShotFeedbackMs { get; private set; }
    public void RecordFireInput() {
      LastInputShotTime=Time.realtimeSinceStartup;
    }
    [Networked] public int Seat { get; set; }
    [Networked] public NetworkString<_16> Nickname { get; set; }
    public string DisplayName=>Nickname.ToString();
    public int Team => Seat % 2;
    public static Vector3 SpawnPosition(int seat) {
      float[] lanes={0,-7,7,14};
      return new Vector3(lanes[Mathf.Clamp(seat/2,0,3)],.1f,seat%2==0?-29:29);
    }
    [Networked] public NetworkBool IsBot { get; set; }
    [Networked] public int Health { get; set; }
    [Networked] public TickTimer RespawnTimer { get; set; }
    [Networked] public int SpawnSequence { get; set; }
    [Networked] public Vector3 SpawnPoint { get; set; }
    [Networked] public Vector2 SpawnLook { get; set; }
    [Networked] public NetworkBool EliminationRecorded { get; set; }
    public float RespawnSecondsRemaining=>Mathf.Clamp(RespawnTimer.RemainingTime(Runner)??0,0,DuelRespawn.DelaySeconds);
    [Networked] public int Weapon { get; set; }
    [Networked] public int RifleAmmo { get; set; }
    [Networked] public int PistolAmmo { get; set; }
    [Networked] public Vector2 Look { get; set; }
    [Networked] public NetworkButtons Previous { get; set; }
    [Networked] public TickTimer FireTimer { get; set; }
    [Networked] public TickTimer ReloadTimer { get; set; }
    [Networked] public int Shots { get; set; }
    [Networked] public int ConsumedFirePress { get; set; }
    [Networked] public Vector3 ShotPoint { get; set; }
    [Networked] public Vector3 ShotDirection { get; set; }
    [Networked] public float RifleHeat { get; set; }
    [Networked] public TickTimer RifleRecovery { get; set; }
    public float SpreadAngle=>Weapon==0?Weapons.RifleSpread(RifleHeat,DuelSession.Instance.IsAiming):Weapon==3?3.5f:0;
    [Networked] public int Hits { get; set; }
    [Networked] public int ShotgunAmmo { get; set; }
    [Networked] public int SniperAmmo { get; set; }
    [Networked] public int OwnedWeapons { get; set; }
    [Networked] public int PickupsCollected { get; set; }
    [Networked] public int LastPickupWeapon { get; set; }
    [Networked] public int LastHitSeat { get; set; }
    [Networked] public int LastHitDamage { get; set; }
    [Networked] public NetworkBool LastHitKilled { get; set; }
    [Networked] public Vector3 DamageOrigin { get; set; }
    public float DamagePulse { get; private set; }
    public float DeathProgress { get; private set; }
    public bool HasWeapon(int kind)=>Weapons.IsFirearm(kind)&&(OwnedWeapons&(1<<kind))!=0;
    public int AmmoFor(int kind)=>kind switch{0=>RifleAmmo,1=>PistolAmmo,3=>ShotgunAmmo,4=>SniperAmmo,_=>0};
    public int Ammo => Weapon switch {0=>RifleAmmo,1=>PistolAmmo,3=>ShotgunAmmo,4=>SniperAmmo,_=>1};
    public float ReloadProgress=>ReloadTimer.IsRunning?Mathf.Clamp01(1-(ReloadTimer.RemainingTime(Runner)??0)/Weapons.Reload[Weapon]):0;
    void SetAmmo(int value){switch(Weapon){case 0:RifleAmmo=value;break;case 1:PistolAmmo=value;break;case 3:ShotgunAmmo=value;break;case 4:SniperAmmo=value;break;}}
    NetworkCharacterController cc;
    Camera eye, weaponCamera;
    public Camera ViewCamera=>eye;
    Transform viewWeapon, worldWeapon, viewMuzzle, worldMuzzle;
    DuelReloadView reloadView;
    AudioSource sound;
    Animation characterAnimation;
    string idleClip, walkClip, playingClip, holdingClip;
    int worldWeaponKind=-1, heardHits;
    float nextStep;
    bool wasReloading;
    int renderedShots, renderedWeapon = -1;
    int pendingLocalShots;
    Vector3 predictedShotPoint;
    Vector3 predictedShotDirection;
    float recoil;
    int renderedHealth;
    CharacterController capsule;
    Renderer[] bodies;
    DuelAvatar avatar;
    int renderedSeat=-1,presentedSpawnSequence=-1;
    bool spawned;
    public bool IsReady=>spawned&&Object&&Object.IsValid;
    public override void Spawned() {
      cc = GetComponent<NetworkCharacterController>();
      capsule=GetComponent<CharacterController>();
      gameObject.layer=PlayerLayer;hitboxRoot=GetComponent<HitboxRoot>();
      lookReader=GetPropertyReader<Vector2>(nameof(Look));
      avatar=GetComponentInChildren<DuelAvatar>();if(avatar)avatar.Build(Seat);renderedSeat=Seat;
      bodies=GetComponentsInChildren<Renderer>();
      sound=gameObject.AddComponent<AudioSource>();sound.spatialBlend=HasInputAuthority?0:1;sound.minDistance=2;sound.maxDistance=40;sound.rolloffMode=AudioRolloffMode.Linear;
      characterAnimation=GetComponentInChildren<Animation>();
      if(characterAnimation)foreach(AnimationState state in characterAnimation){
        var name=state.name.ToLowerInvariant();
        if(name.Contains("idle"))idleClip=state.name;
        if(name.Contains("walk"))walkClip=state.name;
        if(name=="holding-both")holdingClip=state.name;
      }
      if(characterAnimation&&!string.IsNullOrEmpty(holdingClip)) {
        var pose=characterAnimation[holdingClip];pose.layer=1;pose.wrapMode=WrapMode.Loop;
        foreach(var bone in GetComponentsInChildren<Transform>())if(bone.name=="arm-left"||bone.name=="arm-right")pose.AddMixingTransform(bone,true);
        characterAnimation.Blend(holdingClip,1,.1f);
      }
      if (HasStateAuthority) ResetForMatch();
      if (HasInputAuthority) {
        DuelSession.Instance.Local = this;
        DuelSession.Instance.Look = Look;
        var cameraObject = new GameObject("Local FPS camera");
        eye = cameraObject.AddComponent<Camera>(); eye.nearClipPlane = .04f; eye.fieldOfView = 80;
        eye.clearFlags=CameraClearFlags.SolidColor;eye.backgroundColor=DuelWorld.SkyColor;
        eye.cullingMask&=~(1<<30);
        var weaponCameraObject=new GameObject("Viewmodel camera");weaponCameraObject.transform.SetParent(eye.transform,false);
        weaponCamera=weaponCameraObject.AddComponent<Camera>();weaponCamera.cullingMask=1<<30;weaponCamera.fieldOfView=65;
        weaponCamera.nearClipPlane=.01f;weaponCamera.farClipPlane=3;
        weaponCamera.GetUniversalAdditionalCameraData().renderType=CameraRenderType.Overlay;
        eye.GetUniversalAdditionalCameraData().cameraStack.Add(weaponCamera);
        cameraObject.AddComponent<AudioListener>();
        DuelSession.Instance.SetLobbyCamera(false);
        foreach (var body in bodies) body.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.ShadowsOnly;
      }
      Debug.Log($"RIVALS_PLAYER_SPAWN seat={Seat} bot={IsBot} local={HasInputAuthority}");
      renderedShots = Shots;
      renderedHealth=Health;
      spawned=true;DuelSession.Instance.RegisterPlayer(this);
    }
    public void ResetForMatch()=>ResetLife(SpawnPosition(Seat),new Vector2(Team==0?0:180,0));
    public void RespawnAt(Vector3 position) {
      var facing=new Vector3(-position.x,0,-position.z);
      ResetLife(position,new Vector2(facing.sqrMagnitude>.01f?Quaternion.LookRotation(facing).eulerAngles.y:0,0));
    }
    void ResetLife(Vector3 position,Vector2 look) {
      if (!HasStateAuthority) return;
      Health = MaxHealth; RifleAmmo = 0; PistolAmmo = 12; ShotgunAmmo=0; SniperAmmo=0; Weapon = Weapons.Pistol;
      RespawnTimer=TickTimer.None;EliminationRecorded=false;ConsumedFirePress=0;
      SpawnSequence++;SpawnPoint=position;SpawnLook=look;
      nextBotDecision=0;botTargetSeat=-1;botSeenSince=-1;botInput=default;
      if(hitboxRoot)hitboxRoot.HitboxRootActive=true;
      OwnedWeapons=1<<Weapons.Pistol;LastHitSeat=-1;
      RifleHeat=0;RifleRecovery=TickTimer.None;
      if(capsule){capsule.height=1.85f;capsule.center=new Vector3(0,.93f,0);}
      Look=look;Previous=default;
      FireTimer = ReloadTimer = TickTimer.None;
      cc = GetComponent<NetworkCharacterController>();
      cc.Teleport(position, Quaternion.Euler(0, Look.x, 0));
      cc.Velocity = Vector3.zero;
      if (HasInputAuthority){DuelSession.Instance.Look = Look;DuelSession.Instance.ClearWeaponRequest();}
    }
    public void SyncSpawnView() {
      if(!HasInputAuthority||!IsReady||presentedSpawnSequence==SpawnSequence)return;
      presentedSpawnSequence=SpawnSequence;
      DuelSession.Instance.Look=SpawnLook;DuelSession.Instance.ResetLifeInput();
      DamagePulse=DeathProgress=recoil=0;pendingLocalShots=0;
    }
    public bool CollectWeapon(int kind) {
      if(!HasStateAuthority||Health<=0||!Weapons.IsFirearm(kind))return false;
      if(Weapon==kind)return false;
      OwnedWeapons=1<<kind;
      RifleAmmo=PistolAmmo=ShotgunAmmo=SniperAmmo=0;
      Weapon=kind;SetAmmo(Weapons.Magazines[kind]);
      ReloadTimer=TickTimer.None;FireTimer=TickTimer.CreateFromSeconds(Runner,.18f);
      RifleHeat=0;RifleRecovery=TickTimer.None;
      LastPickupWeapon=kind;PickupsCollected++;return true;
    }
    public int TakeDamage(int amount,Vector3 origin,DuelPlayer attacker=null) {
      var match=DuelSession.Instance.Match;
      if(!HasStateAuthority||Health<=0||!match||match.Phase!=2||(attacker&&attacker.Team==Team))return 0;
      int applied=Mathf.Min(Health,Mathf.Max(0,amount));Health-=applied;DamageOrigin=origin;
      if(Health==0){
        cc.Velocity=Vector3.zero;ReloadTimer=TickTimer.None;
        RespawnTimer=TickTimer.CreateFromSeconds(Runner,DuelRespawn.DelaySeconds);
        if(hitboxRoot)hitboxRoot.HitboxRootActive=false;
        if(attacker)match.RecordElimination(attacker,this);
        Debug.Log($"RIVALS_ELIMINATED seat={Seat} respawnSeconds={DuelRespawn.DelaySeconds}");
      }
      return applied;
    }
    public override void FixedUpdateNetwork() {
      if(!IsReady)return;
      var match = DuelSession.Instance.Match;
      if (!match || !match.Object || !match.Object.IsValid) return;
      DuelInput input;
      if (IsBot) {
        if (!HasStateAuthority) return;
        if(match.Phase!=2||Health<=0){botTargetSeat=-1;botSeenSince=-1;nextBotDecision=0;botInput=default;return;}
        input = BotInput();
      } else if (!GetInput(out input)) return;
      // Counters are scoped to a life. Old packets must not alter the new
      // baseline; the first fresh short click is valid even after packet loss.
      if(!IsBot&&input.SpawnSequence!=SpawnSequence)return;
      if (match.Phase != 2 || Health <= 0) { Previous = input.Buttons; ConsumedFirePress=input.FirePress;return; }
      Look = new Vector2(input.Look.x, Mathf.Clamp(input.Look.y, -85, 85));
      var pressed = input.Buttons.GetPressed(Previous); Previous = input.Buttons;
      if(RifleRecovery.ExpiredOrNotRunning(Runner))RifleHeat=Mathf.MoveTowards(RifleHeat,0,Runner.DeltaTime*20);
      bool aim = input.Buttons.IsSet(Action.Aim);
      cc.maxSpeed = IsBot ? 3.8f : aim ? 3.2f : input.Buttons.IsSet(Action.Sprint) ? 8 : 5.5f;
      cc.rotationSpeed = 0; cc.acceleration = 70; cc.braking = 20;
      var move = Quaternion.Euler(0, Look.x, 0) * new Vector3(input.Move.x, 0, input.Move.y);
      if (pressed.IsSet(Action.Jump)) cc.Jump();
      cc.Move(move); transform.rotation = Quaternion.Euler(0, Look.x, 0);
      // Predict weapon state on the input authority as well as the host. Fusion
      // restores these networked values before resimulation; damage stays on host.
      if (ReloadTimer.IsRunning && ReloadTimer.Expired(Runner)) {
        SetAmmo(Weapons.Magazines[Weapon]);
        ReloadTimer = TickTimer.None;
      }
      if ((pressed.IsSet(Action.Reload) || Ammo == 0) && !ReloadTimer.IsRunning && Ammo < Weapons.Magazines[Weapon])
        ReloadTimer = TickTimer.CreateFromSeconds(Runner, Weapons.Reload[Weapon]);
      if(ReloadTimer.IsRunning)ConsumedFirePress=input.FirePress;
      bool wantsFire=input.Buttons.IsSet(Action.Fire)||input.FirePress>ConsumedFirePress;
      if (wantsFire && FireTimer.ExpiredOrNotRunning(Runner) && !ReloadTimer.IsRunning && Ammo > 0) {
        ConsumedFirePress=input.FirePress;Fire(aim);
      }
    }
    DuelInput BotInput() {
      int tick=Runner.Tick;
      if(tick<nextBotDecision)return botInput;
      int stride=Mathf.Max(1,Runner.TickRate/10);
      nextBotDecision=tick+stride+(nextBotDecision==0?Seat%stride:0);
      DuelPlayer enemy=null;float nearest=float.MaxValue;
      foreach(var player in DuelSession.Instance.Players) {
        if(player.Team==Team||player.Health<=0)continue;
        float distance=(player.transform.position-transform.position).sqrMagnitude;
        if(distance<nearest){nearest=distance;enemy=player;}
      }
      botInput=default;
      if (!enemy) return default;
      var delta = enemy.transform.position - transform.position;
      if(delta.sqrMagnitude<.001f)return default;
      float now=(float)Runner.SimulationTime,distanceToEnemy=delta.magnitude;
      var eyePosition=transform.position+Vector3.up*1.55f;
      var bodyDelta=enemy.transform.position+Vector3.up*1.05f-eyePosition;
      bool visible=distanceToEnemy<50&&!Physics.Raycast(eyePosition,bodyDelta.normalized,bodyDelta.magnitude,WorldMask,QueryTriggerInteraction.Ignore);
      if(botTargetSeat!=enemy.Seat||!visible){botTargetSeat=enemy.Seat;botSeenSince=-1;}
      if(visible&&botSeenSince<0)botSeenSince=now;
      var target=Quaternion.LookRotation(bodyDelta.normalized).eulerAngles;
      // Imperfect tracking belongs to the bot's aim, not the weapon trajectory.
      // In particular, a human sniper still fires exactly along its crosshair.
      float wobble=Weapon==4?2.7f:Mathf.Lerp(3.2f,5.5f,Mathf.Clamp01(distanceToEnemy/40));
      float aimYaw=target.y+Mathf.Sin(now*1.13f+Seat*1.7f)*wobble;
      float aimPitch=Mathf.DeltaAngle(0,target.x)+Mathf.Sin(now*.87f+Seat*2.3f)*(Weapon==4?1.4f:2.1f);
      var botLook=new Vector2(Mathf.MoveTowardsAngle(Look.x,aimYaw,85*stride*Runner.DeltaTime),Mathf.MoveTowardsAngle(Look.y,aimPitch,60*stride*Runner.DeltaTime));
      var destination=enemy.transform.position;
      float pickupDistance=38*38;
      if(OwnedWeapons==(1<<Weapons.Pistol))for(int slot=0;slot<DuelMatch.PickupCount;slot++) {
        var pickup=DuelSession.Instance.Match.Pickups[slot];float distance=(pickup.Position-transform.position).sqrMagnitude;
        if(!pickup.Respawn.IsRunning&&distance<pickupDistance){pickupDistance=distance;destination=pickup.Position;}
      }
      var desired=destination-transform.position;desired.y=0;
      var travel=desired.normalized;
      bool obstacle=false;
      float best=-2;
      foreach(float turn in SteeringAngles) {
        var direction=Quaternion.Euler(0,turn,0)*desired.normalized;
        bool blocked=BotPathBlocked(transform.position,direction);
        if(turn==0)obstacle=blocked;
        float score=Vector3.Dot(direction,desired.normalized);
        if(!blocked&&score>best){best=score;travel=direction;if(turn==0)break;}
      }
      if(best==-2)travel=Vector3.zero;
      var localTravel=Quaternion.Euler(0,-botLook.x,0)*travel;
      bool seekingPickup=pickupDistance<38*38;
      bool advance=seekingPickup||!visible||distanceToEnemy>17||obstacle;
      // More willing to close distance, with pauses and the same forgiving aim.
      bool moveWindow=Mathf.Repeat(now+Seat*.53f,5)<(seekingPickup?3.8f:3f);
      var i = new DuelInput { Look=botLook,Weapon=-1,Move=advance&&moveWindow?new Vector2(localTravel.x,localTravel.z):Vector2.zero };
      float firingRange=Weapon==3?12:Weapon==4?50:38;
      bool reacted=visible&&now-botSeenSince>=.8f+(Seat%3)*.15f;
      bool aligned=Mathf.Abs(Mathf.DeltaAngle(botLook.x,target.y))<12&&Mathf.Abs(Mathf.DeltaAngle(botLook.y,Mathf.DeltaAngle(0,target.x)))<8;
      bool firingWindow=Mathf.Repeat(now+Seat*.71f,3)<1.4f;
      i.Buttons.Set(Action.Fire,reacted&&aligned&&distanceToEnemy<firingRange&&firingWindow);
      return botInput=i;
    }
    public static bool BotPathBlocked(Vector3 feet,Vector3 direction) {
      // SphereCast skips an obstacle already overlapping its starting sphere.
      // A low ray also sees short barricades below the sphere on raised decks,
      // while letting a character touching a wall move along or away from it.
      return Physics.Raycast(feet+Vector3.up*.5f,direction,2f,WorldMask,QueryTriggerInteraction.Ignore)||
        Physics.SphereCast(feet+Vector3.up,.4f,direction,out _,2f,WorldMask,QueryTriggerInteraction.Ignore);
    }
    void Fire(bool aiming=false) {
      float botInterval=Weapon==4?2.9f:Weapon==3?1.3f:Weapon==0?.5f:.7f;
      FireTimer = TickTimer.CreateFromSeconds(Runner, IsBot ? Mathf.Max(botInterval,Weapons.Interval[Weapon]) : Weapons.Interval[Weapon]);
      SetAmmo(Ammo-1);
      Vector3 origin = transform.position + Vector3.up * 1.55f;
      Vector3 direction = Quaternion.Euler(Look.y, Look.x, 0) * Vector3.forward;
      if(Weapon==0) {
        RifleHeat=Mathf.Min(12,RifleHeat+1);RifleRecovery=TickTimer.CreateFromSeconds(Runner,.24f);
        var spread=Weapons.SpreadOffset(Shots+1,Seat,Weapons.RifleSpread(RifleHeat,aiming));
        direction=Quaternion.Euler(Look.y+spread.y,Look.x+spread.x,0)*Vector3.forward;
      }
      float range = Weapon==3?30:1000;
      ShotDirection=direction;
      ShotPoint = origin + direction * range;
      Physics.SyncTransforms();
      // One lag-compensated hit test per trigger for every weapon. Shotgun fans
      // are presentation only; close-range damage is applied once, never per pellet.
      int damageTotal=0;DuelPlayer lastVictim=null;
      {
        if(TraceShot(origin,direction,range,out var point,out var victim,out float hitHeight)) {
          ShotPoint=point;
          if(HasStateAuthority&&victim&&victim.Health>0) {
            int damage=Weapons.ShotDamage(Weapon,Vector3.Distance(origin,point),hitHeight>1.4f);
            damageTotal+=victim.TakeDamage(damage,origin,this);lastVictim=victim;
          }
        }
      }
      if(lastVictim){Hits++;LastHitSeat=lastVictim.Seat;LastHitDamage=damageTotal;LastHitKilled=lastVictim.Health==0;}
      Shots++;
      if(Weapon==4)ReloadTimer=TickTimer.CreateFromSeconds(Runner,Weapons.Reload[4]);
      // Present a local forward simulation event exactly once. A corrected shot
      // count may go backwards; using that count for local FX can swallow the
      // next short click. Resimulation and returning snapshots never enqueue FX.
      if(HasInputAuthority&&Runner.IsForward){pendingLocalShots++;predictedShotPoint=ShotPoint;predictedShotDirection=ShotDirection;}
#if UNITY_EDITOR || DEVELOPMENT_BUILD
      if(DuelNetworkSmoke.Running&&HasStateAuthority&&!HasInputAuthority&&!IsBot)
        Debug.Log($"RIVALS_CONFIRMED_SHOT count={Shots} utcTicks={System.DateTime.UtcNow.Ticks}");
#endif
    }
    bool TraceShot(Vector3 origin,Vector3 direction,float range,out Vector3 point,out DuelPlayer victim,out float height) {
      point=origin+direction*range;victim=null;height=0;float nearest=range+1;
      if(HasStateAuthority&&!IsBot&&Runner.LagCompensation!=null) {
        // Player capsules use their own PhysX layer, so they cannot occlude
        // their historical hitboxes. Static arena geometry remains in the query.
        Runner.LagCompensation.RaycastAll(origin,direction,range,Object.InputAuthority,compensatedHits,WorldMask,
          true,HitOptions.IncludePhysX|HitOptions.SubtickAccuracy,QueryTriggerInteraction.Ignore);
#if UNITY_EDITOR || DEVELOPMENT_BUILD
        if(DuelCombatSmoke.Running)Debug.Log($"RIVALS_TRACE_DEBUG hitboxes={Runner.LagCompensation.TotalHitboxes} count={compensatedHits.Count} origin={origin} dir={direction}");
#endif
        foreach(var hit in compensatedHits) {
          var target=hit.Hitbox?hit.Hitbox.GetComponentInParent<DuelPlayer>():null;
          if(target&&!target.IsReady)continue;
          if(target&&(target==this||target.Team==Team||target.Health<=0))continue;
          if(hit.Distance>=nearest)continue;
          nearest=hit.Distance;point=hit.Point;victim=target;
          height=target?hit.Point.y-hit.HitboxColliderPosition.y:0;
        }
      } else {
        int count=Physics.RaycastNonAlloc(origin,direction,shotHits,range,~0,QueryTriggerInteraction.Ignore);
        for(int n=0;n<count;n++) {
          var hit=shotHits[n];var target=hit.collider.GetComponentInParent<DuelPlayer>();
          if(target&&!target.IsReady)continue;
          if(target&&(target==this||target.Team==Team||target.Health<=0))continue;
          if(hit.distance>=nearest)continue;
          nearest=hit.distance;point=hit.point;victim=target;height=target?point.y-target.transform.position.y:0;
        }
      }
#if UNITY_EDITOR || DEVELOPMENT_BUILD
      if(DuelNetworkSmoke.Running&&HasStateAuthority&&victim&&!victim.GetComponent<CharacterController>().Raycast(new Ray(origin,direction),out _,range))
        DuelNetworkSmoke.HistoricalHits++;
#endif
      return nearest<=range;
    }
    public override void Render() {
      if(!IsReady)return;
      SyncSpawnView();
      if(renderedSeat!=Seat&&avatar){
        renderedSeat=Seat;avatar.Rebuild(Seat);worldWeaponKind=-1;renderedWeapon=-1;
        bodies=avatar.GetComponentsInChildren<Renderer>();
        if(HasInputAuthority)foreach(var body in bodies)body.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.ShadowsOnly;
      }
      bool podium=DuelSession.Instance.Match&&DuelSession.Instance.Match.Phase==4;
      if(eye)eye.enabled=!podium;
      var art=DuelArt.Get;
      if(Health<renderedHealth){DamagePulse=1;if(avatar)avatar.FlashDamage();if(art&&sound&&DuelSession.Instance.AudioEnabled)sound.PlayOneShot(art.Hit,HasInputAuthority?.45f:.22f);}
      if(Health>renderedHealth){DamagePulse=0;DeathProgress=0;}
      renderedHealth=Health;DamagePulse=Mathf.MoveTowards(DamagePulse,0,Time.deltaTime*2.4f);
      DeathProgress=Health<=0?Mathf.MoveTowards(DeathProgress,1,Time.deltaTime/ .65f):0;
      if(capsule&&Mathf.Abs(capsule.height-(Health>0?1.85f:.65f))>.01f){capsule.height=Health>0?1.85f:.65f;capsule.center=new Vector3(0,Health>0?.93f:.33f,0);}
      if(!HasInputAuthority&&worldWeaponKind!=Weapon) {
        worldWeaponKind=Weapon;
        if(worldWeapon)Destroy(worldWeapon.gameObject);
        worldWeapon=DuelWorld.MakeWeapon(avatar?avatar.GunSocket:transform,Weapon,false,Seat);
        worldMuzzle=DuelWorld.WeaponMuzzle(worldWeapon);
        worldWeapon.localPosition=avatar?Vector3.zero:new Vector3(.27f,1.19f,.42f);
        worldWeapon.localScale=Vector3.one*.8f;
      }
      var speed=new Vector2(cc.Velocity.x,cc.Velocity.z).magnitude;
      float pitch=Look.y;
      if(!HasInputAuthority&&TryGetSnapshotsBuffers(out var from,out var to,out float alpha))
        pitch=Mathf.LerpAngle(lookReader.Read(from).y,lookReader.Read(to).y,alpha);
      if(avatar)avatar.Pose(speed,pitch,Weapon,Health>0);
      if(characterAnimation) {
        var clip=speed>.5f?walkClip:idleClip;
        if(!string.IsNullOrEmpty(clip)&&clip!=playingClip){playingClip=clip;characterAnimation.CrossFade(clip,.12f);}
      }
      if(art&&sound&&DuelSession.Instance.AudioEnabled) {
        if(ReloadTimer.IsRunning&&!wasReloading)sound.PlayOneShot(art.Reload,.24f);
        wasReloading=ReloadTimer.IsRunning;
        if(Hits!=heardHits){heardHits=Hits;if(HasInputAuthority)sound.PlayOneShot(art.Hit,.18f);}
        if(speed>.8f&&cc.Grounded&&Time.time>nextStep&&Health>0) {
          nextStep=Time.time+(speed>6?.27f:.4f);
          if(art.Footsteps.Length>0)sound.PlayOneShot(art.Footsteps[UnityEngine.Random.Range(0,art.Footsteps.Length)],HasInputAuthority?.22f:.35f);
        }
      }
      bool fired=HasInputAuthority?pendingLocalShots>0:Shots>renderedShots;
      if (fired) {
        VisualShots+=HasInputAuthority?pendingLocalShots:Shots-renderedShots;
        pendingLocalShots=0;LastVisualShotTime=Time.realtimeSinceStartup;
        if(HasInputAuthority){ShotFeedbackMs=(LastVisualShotTime-LastInputShotTime)*1000;DuelSession.Instance.ReportLocalShot(VisualShots);}
        renderedShots = Shots; recoil = Weapon>=3?.19f:.09f;
        if(art&&sound&&DuelSession.Instance.AudioEnabled)sound.PlayOneShot(art.Shot(Weapon),HasInputAuthority?.3f:.5f);
      }
      if (!HasInputAuthority || !eye) {
        if(fired&&worldMuzzle)DuelShotTracer.ShowWeapon(Weapon,worldMuzzle,ShotPoint,ShotDirection);
        return;
      }
      if (renderedWeapon != Weapon) {
        renderedWeapon = Weapon;
        if (viewWeapon) Destroy(viewWeapon.gameObject);
        viewWeapon = DuelWorld.MakeWeapon(weaponCamera.transform, Weapon,true,Seat);
        reloadView=viewWeapon.gameObject.AddComponent<DuelReloadView>();reloadView.Build(Weapon,Seat);
        viewMuzzle = DuelWorld.WeaponMuzzle(viewWeapon);
      }
      recoil = Mathf.MoveTowards(recoil, 0, Time.deltaTime * .8f);
      var session = DuelSession.Instance;
      if(!session.Match || !session.Match.Object || !session.Match.Object.IsValid)return;
      if (session.Match.Phase != 2) session.Look = Look;
      // Keep the camera/reticle on the authoritative aim; recoil animates the gun.
      float fall=Mathf.SmoothStep(0,1,DeathProgress);
      float roll=Health>0?Mathf.Sin(Time.time*62)*DamagePulse*2.4f:-62*fall;
      eye.transform.SetPositionAndRotation(transform.position+Vector3.up*Mathf.Lerp(1.55f,.32f,fall),Quaternion.Euler(session.Look.y+fall*12,session.Look.x,roll));
      bool reloading=ReloadTimer.IsRunning&&Health>0;
      bool aim = Health>0&&session.IsAiming&&!reloading;
      eye.fieldOfView = Mathf.Lerp(eye.fieldOfView, aim ? (Weapon==4?24:52) : 80, Time.deltaTime * 15);
      float bob=aim?0:Mathf.Sin(Time.time*9)*Mathf.Clamp01(speed/5)*.008f;
      float reloadBlend=reloading?Mathf.SmoothStep(0,1,Mathf.Min(ReloadProgress/.12f,(1-ReloadProgress)/.12f)):0;
      var restPosition=new Vector3(aim?(Weapon==0?.07f:0f):.24f,(aim?(Weapon==0?-.27f:Weapon==4?-.24f:-.19f):-.20f)+bob,.59f-recoil*.5f);
      viewWeapon.localPosition=Vector3.Lerp(viewWeapon.localPosition,Vector3.Lerp(restPosition,new Vector3(.14f,-.09f,.64f),reloadBlend),Time.deltaTime*18);
      viewWeapon.localRotation=Quaternion.Slerp(Quaternion.Euler(-recoil*22,0,0),Quaternion.Euler(-12,-28,32),reloadBlend);
      reloadView.Pose(reloading,ReloadProgress);
      viewWeapon.gameObject.SetActive(Health>0&&!podium);
      if(fired&&viewMuzzle&&Health>0&&!podium)DuelShotTracer.ShowWeapon(Weapon,viewMuzzle,predictedShotPoint,predictedShotDirection,eye,weaponCamera);
    }
    public void PrepareDespawn(){spawned=false;if(DuelSession.Instance)DuelSession.Instance.UnregisterPlayer(this);}
    public override void Despawned(NetworkRunner runner,bool hasState) {
      PrepareDespawn();
      if(eye)Destroy(eye.gameObject);
    }
    void OnDestroy() { PrepareDespawn();if (eye) Destroy(eye.gameObject); }
  }
}
