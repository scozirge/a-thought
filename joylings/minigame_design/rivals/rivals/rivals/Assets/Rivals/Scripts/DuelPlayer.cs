using System.Linq;
using Fusion;
using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace RivalsPrototype {
  [RequireComponent(typeof(NetworkCharacterController))]
  public class DuelPlayer : NetworkBehaviour {
    [Networked] public int Seat { get; set; }
    public int Team => Seat % 2;
    public static Vector3 SpawnPosition(int seat) {
      float[] lanes={0,-4,4,8};
      return new Vector3(lanes[Mathf.Clamp(seat/2,0,3)],.1f,seat%2==0?-13:13);
    }
    [Networked] public NetworkBool IsBot { get; set; }
    [Networked] public int Health { get; set; }
    [Networked] public int Weapon { get; set; }
    [Networked] public int RifleAmmo { get; set; }
    [Networked] public int PistolAmmo { get; set; }
    [Networked] public Vector2 Look { get; set; }
    [Networked] public NetworkButtons Previous { get; set; }
    [Networked] public TickTimer FireTimer { get; set; }
    [Networked] public TickTimer ReloadTimer { get; set; }
    [Networked] public TickTimer SlideTimer { get; set; }
    [Networked] public TickTimer SlideCooldown { get; set; }
    [Networked] public int Shots { get; set; }
    [Networked] public Vector3 ShotPoint { get; set; }
    [Networked] public int Hits { get; set; }
    [Networked] public int ShotgunAmmo { get; set; }
    [Networked] public int SniperAmmo { get; set; }
    public int Ammo => Weapon switch {0=>RifleAmmo,1=>PistolAmmo,3=>ShotgunAmmo,4=>SniperAmmo,_=>1};
    void SetAmmo(int value){switch(Weapon){case 0:RifleAmmo=value;break;case 1:PistolAmmo=value;break;case 3:ShotgunAmmo=value;break;case 4:SniperAmmo=value;break;}}
    NetworkCharacterController cc;
    Camera eye, weaponCamera;
    public Camera ViewCamera=>eye;
    Transform viewWeapon, worldWeapon;
    AudioSource sound;
    Animation characterAnimation;
    string idleClip, walkClip, playingClip, holdingClip;
    int worldWeaponKind=-1, heardHits;
    float nextStep;
    bool wasReloading;
    int renderedShots, renderedWeapon = -1;
    float recoil;
    Renderer[] bodies;
    DuelAvatar avatar;
    public override void Spawned() {
      cc = GetComponent<NetworkCharacterController>();
      avatar=GetComponentInChildren<DuelAvatar>();if(avatar)avatar.Build(Seat);
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
      if (HasStateAuthority) ResetRound();
      if (HasInputAuthority) {
        DuelSession.Instance.Local = this;
        var cameraObject = new GameObject("Local FPS camera");
        eye = cameraObject.AddComponent<Camera>(); eye.nearClipPlane = .04f; eye.fieldOfView = 80;
        eye.clearFlags=CameraClearFlags.SolidColor;eye.backgroundColor=new Color(.36f,.66f,.91f);
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
    }
    public void ResetRound() {
      if (!HasStateAuthority) return;
      Health = 100; RifleAmmo = 30; PistolAmmo = 12; ShotgunAmmo=6; SniperAmmo=5; Weapon = 0;
      Look = new Vector2(Team == 0 ? 0 : 180, 0);
      FireTimer = ReloadTimer = SlideTimer = SlideCooldown = TickTimer.None;
      cc = GetComponent<NetworkCharacterController>();
      cc.Teleport(SpawnPosition(Seat), Quaternion.Euler(0, Look.x, 0));
      cc.Velocity = Vector3.zero;
      if (HasInputAuthority) DuelSession.Instance.Look = Look;
    }
    public override void FixedUpdateNetwork() {
      var match = DuelSession.Instance.Match;
      if (!match || !match.Object || !match.Object.IsValid) return;
      DuelInput input;
      if (IsBot) {
        if (!HasStateAuthority) return;
        input = BotInput();
      } else if (!GetInput(out input)) return;
      if (match.Phase != 2 || Health <= 0) { Previous = input.Buttons; return; }
      Look = new Vector2(input.Look.x, Mathf.Clamp(input.Look.y, -85, 85));
      var pressed = input.Buttons.GetPressed(Previous); Previous = input.Buttons;
      if (input.Weapon >= 0 && input.Weapon < Weapons.Names.Length && Weapon != input.Weapon) {
        Weapon = input.Weapon; ReloadTimer = TickTimer.None; FireTimer = TickTimer.CreateFromSeconds(Runner, .18f);
      }
      bool aim = input.Buttons.IsSet(Action.Aim) && Weapon != 2;
      if (pressed.IsSet(Action.Slide) && cc.Grounded && SlideCooldown.ExpiredOrNotRunning(Runner)) {
        SlideTimer = TickTimer.CreateFromSeconds(Runner, .5f); SlideCooldown = TickTimer.CreateFromSeconds(Runner, 1.5f);
      }
      bool sliding = !SlideTimer.ExpiredOrNotRunning(Runner);
      cc.maxSpeed = sliding ? 11 : aim ? 3.2f : input.Buttons.IsSet(Action.Sprint) || Weapon == 2 ? 8 : 5.5f;
      cc.rotationSpeed = 0; cc.acceleration = 70; cc.braking = 20;
      var move = Quaternion.Euler(0, Look.x, 0) * new Vector3(input.Move.x, 0, input.Move.y);
      if (sliding) move = Quaternion.Euler(0, Look.x, 0) * Vector3.forward;
      if (pressed.IsSet(Action.Jump)) cc.Jump();
      cc.Move(move); transform.rotation = Quaternion.Euler(0, Look.x, 0);
      if (!HasStateAuthority) return;
      if (ReloadTimer.IsRunning && ReloadTimer.Expired(Runner)) {
        SetAmmo(Weapons.Magazines[Weapon]);
        ReloadTimer = TickTimer.None;
      }
      if (Weapon != 2 && (pressed.IsSet(Action.Reload) || Ammo == 0) && !ReloadTimer.IsRunning && Ammo < Weapons.Magazines[Weapon])
        ReloadTimer = TickTimer.CreateFromSeconds(Runner, Weapons.Reload[Weapon]);
      if (input.Buttons.IsSet(Action.Fire) && FireTimer.ExpiredOrNotRunning(Runner) && !ReloadTimer.IsRunning && Ammo > 0) Fire();
    }
    DuelInput BotInput() {
      var enemy = DuelSession.Instance.Match.Players.FirstOrDefault(p => p.Team != Team && p.Health>0);
      if (!enemy) return default;
      var delta = enemy.transform.position - transform.position;
      var target = Quaternion.LookRotation(delta.normalized).eulerAngles;
      var origin=transform.position+Vector3.up;
      var obstacle=Physics.RaycastAll(origin,delta.normalized,Mathf.Min(delta.magnitude,5),~0,QueryTriggerInteraction.Ignore)
        .Any(h=>!h.collider.GetComponentInParent<DuelPlayer>());
      var travel=delta.normalized;
      if(obstacle) travel=Vector3.Cross(Vector3.up,delta.normalized);
      var localTravel=Quaternion.Euler(0,-target.y,0)*travel;
      var i = new DuelInput { Look = new Vector2(target.y, 0), Weapon = 0,
        Move = delta.magnitude > 10 || obstacle ? new Vector2(localTravel.x,localTravel.z) : new Vector2(Mathf.Sin((float)Runner.SimulationTime * 1.4f), 0) };
      i.Buttons.Set(Action.Fire, (Mathf.FloorToInt((float)Runner.SimulationTime * 2) % 3) != 0);
      return i;
    }
    void Fire() {
      FireTimer = TickTimer.CreateFromSeconds(Runner, IsBot ? .35f : Weapons.Interval[Weapon]);
      if(Weapon!=2)SetAmmo(Ammo-1);
      Vector3 origin = transform.position + Vector3.up * 1.55f;
      Vector3 direction = Quaternion.Euler(Look.y, Look.x, 0) * Vector3.forward;
      if (IsBot) direction = Quaternion.Euler(0, Mathf.Sin((float)Runner.SimulationTime * 3) * 6, 0) * direction;
      float range = Weapon == 2 ? 2.8f : Weapon==3?35:100;
      ShotPoint = origin + direction * range;
      Physics.SyncTransforms();
      int pellets=Weapon==3?7:1;
      for(int pellet=0;pellet<pellets;pellet++) {
        float angle=pellet*Mathf.PI/3;
        var spread=pellet==0?direction:Quaternion.Euler(Mathf.Sin(angle)*3,Mathf.Cos(angle)*3,0)*direction;
        foreach(var hit in Physics.RaycastAll(origin,spread,range,~0,QueryTriggerInteraction.Ignore).OrderBy(h=>h.distance)) {
          var victim=hit.collider.GetComponentInParent<DuelPlayer>();
          if(victim&&(victim==this||victim.Team==Team))continue;
          if(pellet==0)ShotPoint=hit.point;
          if(victim&&victim.Health>0) {
            int damage=Weapons.Damage[Weapon];
            if(Weapon!=2&&hit.point.y-victim.transform.position.y>1.4f)damage=Mathf.RoundToInt(damage*1.5f);
            victim.Health=Mathf.Max(0,victim.Health-damage);Hits++;
          }
          break;
        }
      }
      Shots++;
    }
    public override void Render() {
      if(!Object||!Object.IsValid)return;
      var art=DuelArt.Get;
      if(!HasInputAuthority&&worldWeaponKind!=Weapon) {
        worldWeaponKind=Weapon;
        if(worldWeapon)Destroy(worldWeapon.gameObject);
        worldWeapon=DuelWorld.MakeWeapon(avatar?avatar.GunSocket:transform,Weapon,false,Seat);
        worldWeapon.localPosition=avatar?Vector3.zero:new Vector3(.27f,1.19f,.42f);
        worldWeapon.localScale=Vector3.one*.8f;
      }
      var speed=new Vector2(cc.Velocity.x,cc.Velocity.z).magnitude;
      if(avatar)avatar.Pose(speed,Look.y,Weapon,Health>0);
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
      if (Shots != renderedShots) {
        renderedShots = Shots; recoil = Weapon>=3?.19f:.09f;
        if(art&&sound&&DuelSession.Instance.AudioEnabled)sound.PlayOneShot(art.Shot(Weapon),HasInputAuthority?.3f:.5f);
        var go = new GameObject("Shot tracer");
        var line = go.AddComponent<LineRenderer>();
        line.material = DuelWorld.TracerMaterial;
        line.startWidth = .025f; line.endWidth = .006f; line.positionCount = 2;
        line.SetPosition(0, transform.position + Vector3.up * 1.45f); line.SetPosition(1, ShotPoint);
        Destroy(go, .065f);
      }
      if (!HasInputAuthority || !eye) return;
      if (renderedWeapon != Weapon) {
        renderedWeapon = Weapon;
        if (viewWeapon) Destroy(viewWeapon.gameObject);
        viewWeapon = DuelWorld.MakeWeapon(weaponCamera.transform, Weapon,true,Seat);
      }
      recoil = Mathf.MoveTowards(recoil, 0, Time.deltaTime * .8f);
      var session = DuelSession.Instance;
      if(!session.Match || !session.Match.Object || !session.Match.Object.IsValid)return;
      if (session.Match.Phase != 2) session.Look = Look;
      eye.transform.SetPositionAndRotation(transform.position + Vector3.up * 1.55f, Quaternion.Euler(session.Look.y - recoil * 8, session.Look.x, 0));
      bool aim = UnityEngine.InputSystem.Mouse.current != null && UnityEngine.InputSystem.Mouse.current.rightButton.isPressed && Cursor.lockState == CursorLockMode.Locked;
      eye.fieldOfView = Mathf.Lerp(eye.fieldOfView, aim && Weapon != 2 ? (Weapon==4?24:52) : 80, Time.deltaTime * 15);
      float bob=aim?0:Mathf.Sin(Time.time*9)*Mathf.Clamp01(speed/5)*.008f;
      viewWeapon.localPosition = Vector3.Lerp(viewWeapon.localPosition, new Vector3(aim ? 0f : .24f, ReloadTimer.IsRunning ? -.46f : (aim?(Weapon==4?-.17f:-.13f):-.20f)+bob, .59f - recoil*.5f), Time.deltaTime * 18);
      viewWeapon.localRotation = Quaternion.Euler(ReloadTimer.IsRunning ? 35 : Weapon == 2 ? -15+recoil * 300 : -recoil*22, 0, Weapon==2?-18:ReloadTimer.IsRunning?-18:0);
    }
    void OnDestroy() { if (eye) Destroy(eye.gameObject); }
  }
}
