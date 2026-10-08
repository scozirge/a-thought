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
    readonly Texture2D[] arsenalIcons=new Texture2D[9];
    public Texture2D Icon(int kind) {
      if(!Weapons.IsWeapon(kind))return null;
      if(DuelWeaponModels.Custom(kind))return arsenalIcons[kind]?arsenalIcons[kind]:arsenalIcons[kind]=Resources.Load<Texture2D>("ArsenalIcons/weapon-"+kind);
      return WeaponIcons!=null&&kind<WeaponIcons.Length?WeaponIcons[kind]:null;
    }
    public AudioClip Shot(int kind) => kind switch { 0=>RifleShot,1=>PistolShot,3=>ShotgunShot,4=>SniperShot,5=>RifleShot,6=>ShotgunShot,7=>Reload,_=>Hit };
  }
}
