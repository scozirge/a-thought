#if UNITY_EDITOR
using System;
using System.Linq;
using System.Threading.Tasks;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public sealed class DuelLearningSmoke : MonoBehaviour {
    int checks;
    void Check(bool ok,string label){if(!ok)throw new Exception("LEARNING_FAILED "+label);checks++;Debug.Log("LEARNING_CHECK "+label);}
    static async Task Wait(Func<bool> ready,string label,int ms=30000){var until=DateTime.UtcNow.AddMilliseconds(ms);while(!ready()){if(DateTime.UtcNow>until)throw new Exception("LEARNING_TIMEOUT "+label);await Task.Delay(20);}}
    async void Start(){
      try {
        var s=DuelSession.Instance;await Wait(()=>s.Local&&s.Local.IsReady&&s.Match&&s.Match.Phase==2,"ready");
        var p=s.Local;var match=s.Match;
        Check(match.Pickups.Count(x=>x.Weapon>=0)==4,"only four ordinary arena stations");
        Check(match.Pickups.All(x=>x.Weapon<0||DuelPickups.IsGroundWeapon(x.Weapon)),"no badge weapons exist in pickup state");
        await Task.Delay(150);
        Check(match.GetComponentsInChildren<Transform>().Count(x=>x.name.StartsWith("Weapon pickup "))==4,"no hidden badge weapon pedestals");
        // Isolate lesson lifecycle from combat; this harness only exists in Editor.
        foreach(var bot in s.Players.Where(x=>x.IsBot)){bot.Health=0;bot.RespawnTimer=TickTimer.None;}
        Check(p.LearningProgress==0&&p.RespawnWeapon==Weapons.Pistol,"new room starts locked with pistol");
        foreach(var stage in DuelLearning.Stages)Check(!p.CollectWeapon(stage.unlock),"locked ground pickup rejected "+stage.name);
        p.RPC_LearningAnswer(p.SpawnSequence,0,0);Check(p.LearningProgress==0,"alive cannot answer");
        p.TakeDamage(300,Vector3.zero);int life=p.SpawnSequence;
        Check(p.LearningState==1&&!p.RespawnTimer.IsRunning,"death waits for one answer without countdown");
        await Task.Delay(3300);Check(p.Health==0&&p.SpawnSequence==life,"reading longer than three seconds is allowed");
        p.RPC_LearningContinue(life);Check(p.LearningState==1,"cannot skip unanswered question");
        p.RPC_LearningAnswer(life,0,99);Check(p.LearningState==1,"invalid choice rejected");
        p.RPC_LearningAnswer(life,0,1);Check(p.LearningProgress==0&&p.LearningState==2,"wrong answer gives no badge");
        p.RPC_LearningAnswer(life,0,0);Check(p.LearningProgress==0,"cannot answer twice in one death");
        p.RPC_LearningContinue(life);Check(p.LearningState==3&&p.RespawnSecondsRemaining>2.9f,"continue starts three seconds");
        p.RPC_LearningWeapon(life,Weapons.Nuke);Check(p.RespawnWeapon==Weapons.Pistol,"locked respawn selection rejected");
        await Wait(()=>p.Health>0,"actual timed respawn",6000);Check(p.Weapon==Weapons.Pistol,"respawn with selected pistol");
        p.TakeDamage(300,Vector3.zero);Check(p.LearningQuestionIndex==0,"wrong question repeats next death");
        for(int question=0;question<15;question++){
          if(p.Health>0)p.TakeDamage(300,Vector3.zero);
          life=p.SpawnSequence;
          Check(p.LearningQuestionIndex==question&&p.LearningState==1,"fixed question order "+question);
          int previousDefault=DuelLearning.DefaultRespawnWeapon(question);
          Check(p.RespawnWeapon==previousDefault,"every death defaults to latest unlock "+question);
          p.RPC_LearningWeapon(life,Weapons.Pistol);Check(p.RespawnWeapon==previousDefault,"cannot change weapon while answering "+question);
          p.RPC_LearningAnswer(life-1,question,DuelLearning.Question(question).answer);Check(p.LearningState==1,"stale life rejected "+question);
          p.RPC_LearningAnswer(life,question,DuelLearning.Question(question).answer);
          Check(p.LearningProgress==question+1&&p.LearningState==2,"one badge awarded "+question);
          p.RPC_LearningAnswer(life,question,DuelLearning.Question(question).answer);Check(p.LearningProgress==question+1,"duplicate cannot award another badge "+question);
          if((question+1)%3==0)Check(p.RespawnWeapon==DuelLearning.Stages[question/3].unlock,"new unlock becomes default "+question);
          int latest=DuelLearning.DefaultRespawnWeapon(question+1);
          p.RPC_LearningWeapon(life,Weapons.Pistol);Check(p.RespawnWeapon==latest,"cannot change weapon during feedback "+question);
          p.RPC_LearningContinue(life);
          foreach(int ground in new[]{Weapons.Rifle,Weapons.Shotgun,Weapons.Sniper}){p.RPC_LearningWeapon(life,ground);Check(p.RespawnWeapon==latest,"ground weapon excluded from respawn selection "+question+":"+ground);}
          p.RPC_LearningWeapon(life,Weapons.Pistol);Check(p.RespawnWeapon==Weapons.Pistol,"pistol can override this countdown "+question);
          p.RespawnAt(new Vector3(0,.1f,-29));Check(p.Weapon==p.RespawnWeapon&&p.Health==300,"selected weapon equipped with full life "+question);
          int pickup=new[]{Weapons.Rifle,Weapons.Shotgun,Weapons.Sniper}[question%3];
          Check(p.CollectWeapon(pickup)&&p.Weapon==pickup&&p.RespawnWeapon==Weapons.Pistol,"ground pickup affects held weapon only "+question);
          p.TakeDamage(300,Vector3.zero);Check(p.RespawnWeapon==latest,"next death ignores pistol override and ground pickup "+question);
          p.ResetForMatch();Check(p.LearningProgress==question+1&&p.Weapon==latest&&p.RespawnWeapon==latest,"same-room new match uses latest unlocked weapon "+question);
        }
        p.TakeDamage(300,Vector3.zero);Check(p.LearningState==3&&p.RespawnTimer.IsRunning,"all unlocked skips questions");
        p.RPC_LearningWeapon(p.SpawnSequence,Weapons.Cleaver);p.RespawnAt(new Vector3(0,.1f,-29));Check(p.Weapon==Weapons.Cleaver,"older unlocked weapon can be selected");
        p.TakeDamage(300,Vector3.zero);Check(p.RespawnWeapon==Weapons.Nuke,"older weapon selection does not replace latest-unlock default");
        p.RPC_LearningWeapon(p.SpawnSequence-1,Weapons.Cleaver);Check(p.RespawnWeapon==Weapons.Nuke,"previous-life weapon selection rejected");
        // Leaving a question transfers the seat to a bot without trapping it forever.
        p.LearningProgress=0;p.BeginLearningDeath();var snapshot=new DuelSession.SeatSnapshot(p);
        var replacement=s.Players.First(x=>x.IsBot);snapshot.Apply(replacement);Check(replacement.RespawnTimer.IsRunning,"bot replacement has a running timer");
        s.WebControlCommand("leave");await Wait(()=>!s.Runner,"leave");
        s.LobbyCommand("{\"action\":\"create\",\"name\":\"題庫重入\"}");await Wait(()=>s.Local&&s.Match&&s.Match.Phase==2,"rejoin",60000);
        Check(s.Local.LearningProgress==0&&s.Local.RespawnWeapon==Weapons.Pistol,"leaving resets unlocks and selected weapon");
        Debug.Log("RIVALS_LEARNING_SMOKE_OK checks="+checks);await s.Runner.Shutdown();UnityEditor.EditorApplication.Exit(0);
      }catch(Exception e){Debug.LogException(e);UnityEditor.EditorApplication.Exit(1);}
    }
  }
}
#endif
