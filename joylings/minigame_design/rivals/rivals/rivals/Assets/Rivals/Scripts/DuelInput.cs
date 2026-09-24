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
    // Inputs from the previous life must not move or fire after a respawn.
    public int SpawnSequence;
  }
  public enum Action { Fire, Aim, Jump, Sprint, Reload }
  public static class Weapons {
    public const int Pistol=1;
    // Asset IDs stay stable; only these four weapons are playable.
    public static readonly int[] Slots = {1,3,4,0};
    public static bool IsFirearm(int kind)=>kind==0||kind==1||kind==3||kind==4;
    public static Color Color(int kind)=>kind==3?new Color(1,.58f,.18f):kind==4?new Color(.73f,.43f,1):kind==0?new Color(.2f,.88f,1):UnityEngine.Color.white;
    public static readonly string[] Names = { "步槍", "手槍", "小刀", "散彈槍", "狙擊槍" };
    public const float ShotgunCloseRange=5f;
    public static readonly int[] Magazines = { 30, 12, 1, 6, 1 };
    public static readonly int[] Damage = { 20, 28, 55, 300, 150 };
    public static readonly float[] Interval = { .12f, .28f, .55f, .8f, 1.2f };
    public static readonly float[] Reload = { 1.6f, 1.1f, 0, 2f, 2.2f };
    public static int ShotDamage(int kind,float distance,bool headshot) {
      if(kind==4)return Damage[4];
      if(kind==3)return distance<=ShotgunCloseRange?Damage[3]:Mathf.RoundToInt(Mathf.Lerp(15,Damage[3],Mathf.Exp(-(distance-ShotgunCloseRange)*.3f)));
      return Mathf.RoundToInt(Damage[kind]*(headshot?1.5f:1));
    }
    public static string ReloadStage(int kind,float progress) {
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
