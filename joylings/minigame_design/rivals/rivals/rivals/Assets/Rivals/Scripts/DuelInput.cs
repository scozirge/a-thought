using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public struct DuelInput : INetworkInput {
    public Vector2 Move;
    public Vector2 Look;
    public NetworkButtons Buttons;
    public int Weapon;
  }
  public enum Action { Fire, Aim, Jump, Sprint, Reload, Slide }
  public static class Weapons {
    public static readonly string[] Names = { "步槍", "手槍", "小刀", "散彈槍", "狙擊槍" };
    public static readonly int[] Magazines = { 30, 12, 1, 6, 5 };
    public static readonly int[] Damage = { 20, 28, 55, 12, 80 };
    public static readonly float[] Interval = { .12f, .28f, .55f, .8f, 1.2f };
    public static readonly float[] Reload = { 1.6f, 1.1f, 0, 2f, 2.2f };
  }
}
