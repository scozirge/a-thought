using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace RivalsPrototype.Editor {
  public static class BotNavigationChecks {
    static void Check(bool value,string label) {
      if(!value)throw new Exception("BOT_NAVIGATION_FAILED "+label);
      Debug.Log("BOT_NAVIGATION_CHECK "+label);
    }
    public static void Run() {
      EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
      var wall=new GameObject("Observed staggered screen");
      wall.transform.position=new Vector3(12,2.2f,5);
      wall.AddComponent<BoxCollider>().size=new Vector3(12,4.4f,1.2f);
      var barricade=new GameObject("Observed deck barricade");
      barricade.transform.position=new Vector3(-18,2.025f,-21);
      barricade.AddComponent<BoxCollider>().size=new Vector3(3,1.05f,.6f);
      Physics.SyncTransforms();
      // Coordinates captured from the stalled live Web match, at either side
      // of the screen and near a raised deck's low barricade.
      var south=new Vector3(11.1640625f,.0751953125f,4.078125f);
      var north=new Vector3(10.4296875f,.0751953125f,5.9384765625f);
      var deck=new Vector3(-18.845703125f,1.5751953125f,-18.7705078125f);
      Check(!Physics.SphereCast(south+Vector3.up,.4f,Vector3.forward,out _,2f,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore),"reproduce overlapping sphere missing screen");
      Check(DuelPlayer.BotPathBlocked(south,Vector3.forward),"south approach detects touching wall");
      Check(DuelPlayer.BotPathBlocked(north,Vector3.back),"north approach detects touching wall");
      Check(DuelPlayer.BotPathBlocked(deck,Vector3.back),"raised deck detects low barricade");
      foreach(var feet in new[]{south,north}) {
        Check(!DuelPlayer.BotPathBlocked(feet,Vector3.left),"can steer left along touching wall");
        Check(!DuelPlayer.BotPathBlocked(feet,Vector3.right),"can steer right along touching wall");
      }
      Check(!DuelPlayer.BotPathBlocked(south,Vector3.back),"can retreat from wall");
      Check(!DuelPlayer.BotPathBlocked(north,Vector3.forward),"can retreat from opposite wall");
      Check(!DuelPlayer.BotPathBlocked(new Vector3(33,.075f,0),Vector3.forward),"open lane remains traversable");
      Debug.Log("RIVALS_BOT_NAVIGATION_OK");
    }
  }
}
