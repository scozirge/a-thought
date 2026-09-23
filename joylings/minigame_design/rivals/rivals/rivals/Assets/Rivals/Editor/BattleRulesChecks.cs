using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace RivalsPrototype.Editor {
  public static class BattleRulesChecks {
    static void Check(bool value,string message){if(!value)throw new Exception("BATTLE_RULES_FAILED "+message);}
    public static void Validate() {
      Check(DuelNames.All.Length==100&&DuelNames.All.Distinct().Count()==100,"100 unique names");
      Check(DuelNames.Clean("<b>貓貓</b>\n").IndexOf('<')<0,"names cannot contain markup");
      Check(DuelNames.Clean(new string('貓',30)).Length==10,"name length");
      Check(Weapons.ShotDamage(3,5,false)==300&&Weapons.ShotDamage(3,10,false)<90&&Weapons.ShotDamage(3,25,false)<20,"shotgun falloff");
      Check(Weapons.ShotDamage(4,1,true)==150&&Weapons.ShotDamage(4,900,false)==150&&Weapons.Magazines[4]==1,"sniper");
      Check(Weapons.RifleSpread(3,true)==0&&Weapons.RifleSpread(8,true)>3,"rifle burst accuracy");
      Check(Weapons.SpreadOffset(20,1,5)==Weapons.SpreadOffset(20,1,5),"deterministic prediction spread");
      Check(DuelMatch.PickupCount==4&&DuelMatch.PickupRespawnSeconds==5&&DuelMatch.RoundsToWin==5&&DuelMatch.PodiumSeconds==10,"game rules");
      Check(DuelPlayer.MaxHealth==300,"triple player health");
      Check(DuelPickups.SpawnPoints.Length==4&&DuelPickups.SpawnPoints.Distinct().Count()==4&&DuelPickups.SpawnPoints.All(p=>Mathf.Abs(p.x)==30&&Mathf.Abs(p.z)==30),"four corner pickups");
      Check(DuelPickups.WeaponFor(0,1)==3&&DuelPickups.WeaponFor(0,2)==4&&DuelPickups.WeaponFor(1,1)==4&&DuelPickups.WeaponFor(1,2)==3&&DuelPickups.WeaponFor(2,1)==0&&DuelPickups.WeaponFor(3,2)==0,"balanced rotating weapon layout");
      for(int distance=6;distance<=30;distance++)Check(Weapons.ShotDamage(3,distance,false)<=Weapons.ShotDamage(3,distance-1,false),"monotonic shotgun falloff");
      Debug.Log("RIVALS_BATTLE_RULES_OK");
    }
    const string Pending="RivalsBattleSmokePending";
    static double stableSince;
    public static void Run(){Validate();SessionState.SetBool(Pending,true);Resume();}
    [InitializeOnLoadMethod] static void Resume(){if(SessionState.GetBool(Pending,false)){stableSince=EditorApplication.timeSinceStartup;EditorApplication.update-=WaitForImport;EditorApplication.update+=WaitForImport;}}
    static void WaitForImport(){
      if(EditorApplication.isCompiling||EditorApplication.isUpdating){stableSince=EditorApplication.timeSinceStartup;return;}
      if(EditorApplication.timeSinceStartup-stableSince<5)return;
      EditorApplication.update-=WaitForImport;SessionState.SetBool(Pending,false);
      UnityEditor.SceneManagement.EditorSceneManager.OpenScene("Assets/Rivals/Scenes/Rivals.unity");EditorApplication.isPlaying=true;
    }
  }
}
