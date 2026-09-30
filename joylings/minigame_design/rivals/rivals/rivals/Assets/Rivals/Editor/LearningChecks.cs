using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace RivalsPrototype.Editor {
  public static class LearningChecks {
    public static void Run() {
      BattleRulesChecks.Validate();
      BotNavigationChecks.Run();
      var stages=DuelLearning.Stages;
      if(stages.Length!=5||stages.Any(s=>s.questions.Length!=3))throw new Exception("Expected five sets of three questions");
      foreach(var stage in stages)foreach(var q in stage.questions)if(q.options.Length<2||q.options.Length>3||q.answer<0||q.answer>=q.options.Length||string.IsNullOrWhiteSpace(q.explanation))throw new Exception("Invalid question");
      for(int progress=0;progress<=15;progress++)for(int i=0;i<5;i++)if(DuelLearning.CanSelect(progress,stages[i].unlock)!=(progress>=(i+1)*3))throw new Exception("Unlock order mismatch");
      Debug.Log("RIVALS_LEARNING_BANK_OK");
      UnityEditor.SceneManagement.EditorSceneManager.OpenScene("Assets/Rivals/Scenes/Rivals.unity");
      EditorApplication.isPlaying=true;
    }
  }
}
