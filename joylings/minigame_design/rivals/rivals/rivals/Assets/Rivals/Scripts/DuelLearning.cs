using System;
using System.Runtime.InteropServices;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  [Serializable] public sealed class LearningQuestion {
    public string title,context,explanation;
    public string[] options;
    public int answer;
  }
  [Serializable] public sealed class LearningStage {
    public int weapon,unlock;
    public string name,reward;
    public LearningQuestion[] questions;
  }
  [Serializable] public sealed class LearningBank { public LearningStage[] stages; }
  public static class DuelLearning {
    public const int TotalQuestions=15;
    static LearningStage[] stages;
    public static LearningStage[] Stages=>stages??(stages=JsonUtility.FromJson<LearningBank>(Resources.Load<TextAsset>("WeaponQuestions").text).stages);
    public static LearningQuestion Question(int progress)=>Stages[progress/3].questions[progress%3];
    public static bool CanSelect(int progress,int weapon) {
      if(weapon==Weapons.Pistol)return true;
      for(int i=0;i<Stages.Length;i++)if(Stages[i].unlock==weapon)return progress>=(i+1)*3;
      return false;
    }
    public static bool CanCollect(int progress,int weapon)=>weapon==Weapons.Rifle||weapon==Weapons.Shotgun||weapon==Weapons.Sniper||CanSelect(progress,weapon);
  }

  public partial class DuelPlayer {
    [Networked] public int LearningProgress { get; set; }
    // 0 alive, 1 question, 2 feedback, 3 respawn countdown.
    [Networked] public int LearningState { get; set; }
    [Networked] public int LearningQuestionIndex { get; set; }
    [Networked] public int LearningChoice { get; set; }
    [Networked] public int RespawnWeapon { get; set; }
    public bool UsesLearning=>!IsBot&&!DuelSession.Instance.IsTraining;
    public bool CanCollectLearningWeapon(int kind)=>!UsesLearning||DuelLearning.CanCollect(LearningProgress,kind);
    public void BeginLearningDeath() {
      if(!HasStateAuthority)return;
      LearningQuestionIndex=LearningProgress;LearningChoice=-1;
      LearningState=UsesLearning&&LearningProgress<DuelLearning.TotalQuestions?1:3;
      RespawnTimer=LearningState==1?TickTimer.None:TickTimer.CreateFromSeconds(Runner,DuelRespawn.DelaySeconds);
    }
    bool LearningRequestValid(int life)=>HasStateAuthority&&UsesLearning&&Health<=0&&SpawnSequence==life&&DuelSession.Instance.Match&&DuelSession.Instance.Match.Phase==2;
    [Rpc(RpcSources.InputAuthority,RpcTargets.StateAuthority)]
    public void RPC_LearningAnswer(int life,int question,int choice) {
      if(!LearningRequestValid(life)||LearningState!=1||question!=LearningQuestionIndex||question!=LearningProgress||question<0||question>=DuelLearning.TotalQuestions)return;
      var q=DuelLearning.Question(question);if(choice<0||choice>=q.options.Length)return;
      LearningChoice=choice;LearningState=2;
      if(choice==q.answer){LearningProgress++;if(LearningProgress%3==0)RespawnWeapon=DuelLearning.Stages[LearningProgress/3-1].unlock;}
    }
    [Rpc(RpcSources.InputAuthority,RpcTargets.StateAuthority)]
    public void RPC_LearningContinue(int life) {
      if(!LearningRequestValid(life)||LearningState!=2)return;
      LearningState=3;RespawnTimer=TickTimer.CreateFromSeconds(Runner,DuelRespawn.DelaySeconds);
    }
    [Rpc(RpcSources.InputAuthority,RpcTargets.StateAuthority)]
    public void RPC_LearningWeapon(int life,int kind) {
      if(!LearningRequestValid(life)||LearningState!=3||!DuelLearning.CanSelect(LearningProgress,kind))return;
      RespawnWeapon=kind;
    }
  }

  public partial class DuelSession {
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern void RivalsReportLearning(string json);
#endif
    [Serializable] class LearningView {
      public bool visible,correct,unlocked,complete;
      public int state,life,question,progress,badges,selected,choice,answer,seconds;
      public string name,reward,title,context,explanation;
      public string[] options;
      public int[] weapons;
    }
    string lastLearningJson;
    bool learningWasVisible;
    void UpdateLearningView() {
      bool visible=started&&!IsTraining&&Local&&Local.IsReady&&Local.Health<=0&&Match&&Match.Object&&Match.Object.IsValid&&Match.Phase==2;
      if(visible&&!learningWasVisible){paused=false;ResetLifeInput();DuelWebInput.Release();}
      learningWasVisible=visible;
      var view=new LearningView{visible=visible};
      if(visible){
        var p=Local;view.state=p.LearningState;view.life=p.SpawnSequence;view.question=p.LearningQuestionIndex;view.progress=p.LearningProgress;
        view.badges=p.LearningProgress%3;view.selected=p.RespawnWeapon;view.choice=p.LearningChoice;view.seconds=Mathf.CeilToInt(p.RespawnSecondsRemaining);
        view.complete=p.LearningProgress>=DuelLearning.TotalQuestions;
        var available=new System.Collections.Generic.List<int>{Weapons.Pistol};
        foreach(var stage in DuelLearning.Stages)if(DuelLearning.CanSelect(p.LearningProgress,stage.unlock))available.Add(stage.unlock);
        view.weapons=available.ToArray();
        if(view.question<DuelLearning.TotalQuestions){
          var stage=DuelLearning.Stages[view.question/3];var q=DuelLearning.Question(view.question);
          view.name=stage.name;view.reward=stage.reward;view.title=q.title;view.context=q.context;view.options=q.options;
          // Only reveal the answer after the host accepts this life's attempt.
          view.answer=view.state==1?-1:q.answer;view.explanation=view.state==1?"":q.explanation;
          view.correct=view.state!=1&&p.LearningChoice==q.answer;
          view.unlocked=view.correct&&p.LearningProgress%3==0;
          if(view.unlocked)view.badges=3;
        }
      }
      string json=JsonUtility.ToJson(view);if(json==lastLearningJson)return;lastLearningJson=json;
#if UNITY_WEBGL && !UNITY_EDITOR
      RivalsReportLearning(json);
#endif
    }
    bool HandleLearningCommand(string action) {
      if(!action.StartsWith("learning:",StringComparison.Ordinal))return false;
      if(!Local||!Local.IsReady||IsTraining)return true;
      var bits=action.Split(':');if(bits.Length<3||!int.TryParse(bits[2],out int life))return true;
      if(bits[1]=="continue")Local.RPC_LearningContinue(life);
      else if(bits[1]=="answer"&&bits.Length==5&&int.TryParse(bits[3],out int question)&&int.TryParse(bits[4],out int choice))Local.RPC_LearningAnswer(life,question,choice);
      else if(bits[1]=="weapon"&&bits.Length==4&&int.TryParse(bits[3],out int kind))Local.RPC_LearningWeapon(life,kind);
      return true;
    }
  }
}
