using UnityEngine;

namespace RivalsPrototype {
  public class DuelArt : ScriptableObject {
    public GameObject Rifle, Pistol, Knife, Shotgun, Sniper, Character, Crate, Target;
    public Texture2D Floor, Crosshair;
    public Texture2D[] WeaponIcons;
    public AudioClip RifleShot, PistolShot, ShotgunShot, SniperShot, Reload, Hit;
    public AudioClip[] Footsteps;
    static DuelArt cached;
    public static DuelArt Get => cached ? cached : cached = Resources.Load<DuelArt>("DuelArt");
    public GameObject Weapon(int kind) => kind switch { 0=>Rifle,1=>Pistol,2=>Knife,3=>Shotgun,4=>Sniper,_=>null };
    public AudioClip Shot(int kind) => kind switch { 0=>RifleShot,1=>PistolShot,3=>ShotgunShot,4=>SniperShot,_=>Hit };
  }
}
