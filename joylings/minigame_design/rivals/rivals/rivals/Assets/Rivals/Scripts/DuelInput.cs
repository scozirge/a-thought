using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public struct DuelInput : INetworkInput {
    public Vector2 Move;
    public Vector2 Look;
    public NetworkButtons Buttons;
    public int Weapon;
    // A cumulative press survives a short tap being absent from the next packet.
    public int FirePress;
    public int AltPress;
    // Inputs from the previous life must not move or fire after a respawn.
    public int SpawnSequence;
  }
  // Retire bit 2 without changing the wire IDs of the remaining controls.
  public enum Action { Fire=0, Aim=1, Sprint=3, Reload=4 }
  public static class Weapons {
    public const int Rifle=0,Pistol=1,Cleaver=2,Shotgun=3,Sniper=4,Gatling=5,Rocket=6,Nuke=7,Poison=8;
    public static readonly int[] Slots = {Pistol,Shotgun,Sniper,Rifle,Gatling,Rocket,Nuke,Cleaver,Poison};
    public static bool IsWeapon(int kind)=>kind>=0&&kind<Names.Length;
    public static bool IsFirearm(int kind)=>kind==Rifle||kind==Pistol||kind==Shotgun||kind==Sniper||kind==Gatling;
    public static bool CanAim(int kind)=>IsFirearm(kind);
    public static bool Unlimited(int kind)=>kind==Rocket||kind==Poison;
    public static Color Color(int kind)=>kind switch {
      Shotgun=>new Color(1,.58f,.18f),Sniper=>new Color(.73f,.43f,1),Rifle=>new Color(.2f,.88f,1),
      Gatling=>new Color(1,.68f,.19f),Rocket=>new Color(1,.38f,.16f),Nuke=>new Color(1,.83f,.20f),
      Cleaver=>new Color(.55f,.95f,1),Poison=>new Color(.45f,1,.20f),_=>UnityEngine.Color.white};
    public static readonly string[] Names = { "步槍", "手槍", "菜刀", "散彈槍", "狙擊槍", "加特林", "無限火箭", "核彈", "劇毒藥水" };
    public const float ShotgunCloseRange=5f;
    public static readonly int[] Magazines = { 30, 12, 1, 6, 1, 100, 1, 1, 1 };
    public static readonly int[] Damage = { 20, 28, 300, 300, 150, 12, 300, 300, 30 };
    public static readonly float[] Interval = { .12f, .28f, .6f, .8f, 1.2f, .06f, 4f, .5f, 3f };
    public static readonly float[] Reload = { 1.6f, 1.1f, 0, 2f, 2.2f, 6f, 0, 0, 0 };
    public const float CleaverRange=2.5f,RocketRadius=6f,RocketInnerRadius=3f,NukeRadius=14f,NukeDelay=7f;
    public const float PoisonRadius=4f,PoisonDuration=5f,PoisonInterval=.5f;
    public static float Spread(int kind,float heat,bool aiming,float speed=0) {
      float move=Mathf.Clamp01(speed/5.5f);
      return kind switch {
        Rifle=>RifleSpread(heat,aiming)+move*(aiming?.45f:1.2f),
        Gatling=>(.6f+Mathf.Clamp(heat,0,16)*.52f+move*1.4f)*(aiming?.8f:1),
        Pistol=>Mathf.Clamp(heat-1,0,5)*.22f+move*.3f,
        Shotgun=>3.5f,_=>0};
    }
    public static float RecoveryRate(int kind)=>kind==Gatling?6:kind==Pistol?8:20;
    public static int ShotDamage(int kind,float distance,bool headshot) {
      if(kind==4)return Damage[4];
      if(kind==Cleaver)return 300;
      if(kind==3)return distance<=ShotgunCloseRange?Damage[3]:Mathf.RoundToInt(Mathf.Lerp(15,Damage[3],Mathf.Exp(-(distance-ShotgunCloseRange)*.3f)));
      return Mathf.RoundToInt(Damage[kind]*(headshot?1.5f:1));
    }
    public static string ReloadStage(int kind,float progress) {
      if(kind==Gatling)return progress<.3f?"卸下彈鼓":progress<.78f?"裝入彈鏈":"旋轉槍管就緒";
      if(kind==3)return progress<.2f?"打開裝填口":progress<.78f?"裝入霰彈":"拉動護木";
      if(kind==4)return progress<.26f?"拉栓退殼":progress<.72f?"裝入子彈":"推栓上膛";
      return progress<.3f?"退出彈匣":progress<.73f?"裝入彈匣":"拉栓上膛";
    }
    public static float RifleSpread(float heat,bool aiming)=>Mathf.Clamp(heat-3,0,9)*.8f*(aiming?.8f:1);
    // Stable across client prediction and host replay; never use global Random.
    public static Vector2 SpreadOffset(int shot,int seat,float angle) {
      uint seed=unchecked((uint)(shot*747796405+seat*2891336453L+1));
      seed^=seed>>16;seed*=2246822519u;seed^=seed>>13;
      float rotation=(seed&65535)/65535f*Mathf.PI*2;
      float radius=(.55f+.45f*((seed>>16)&65535)/65535f)*angle;
      return new Vector2(Mathf.Cos(rotation),Mathf.Sin(rotation))*radius;
    }
  }
}
