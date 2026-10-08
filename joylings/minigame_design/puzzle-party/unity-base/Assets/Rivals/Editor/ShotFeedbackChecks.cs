using System;
using UnityEngine;

namespace RivalsPrototype.Editor {
  public static class ShotFeedbackChecks {
    public static void Validate() {
      var history=new ShotFeedbackHistory();int checks=0;
      void Check(bool ok,string label){if(!ok)throw new Exception("SHOT_FEEDBACK_FAILED "+label);checks++;}
      Check(history.TryPresent(1,1,false,1),"first short press");
      Check(!history.TryPresent(1,1,false,1),"same shot shifted to a later forward tick");
      Check(history.TryPresent(1,2,false,1),"fresh press after total shot count correction");
      Check(!history.TryPresent(1,1,false,1),"late packet for older press");
      Check(history.TryPresent(1,2,false,2),"held fire second shot");
      Check(!history.TryPresent(1,2,false,1),"held fire rollback");
      Check(!history.TryPresent(1,2,false,2),"held fire replay");
      Check(history.TryPresent(1,2,false,3),"held fire continues");
      Check(history.TryPresent(1,1,true,1),"secondary action has independent identity");
      Check(!history.TryPresent(1,1,true,1),"secondary replay");
      Check(history.TryPresent(1,2,false,4),"primary continues after secondary");
      Check(history.TryPresent(2,1,false,1),"respawn restarts press counters");
      Check(!history.TryPresent(1,99,false,1),"previous life cannot play effects");
      Check(!history.TryPresent(2,1,false,1),"new life replay");
      Check(history.TryPresent(2,1,true,1),"secondary in new life");
      Check(!history.TryPresent(2,2,false,0),"invalid ordinal");
      Debug.Log("RIVALS_SHOT_FEEDBACK_OK checks="+checks);
    }
  }
}
