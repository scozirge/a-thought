#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Linq;
using System.Threading.Tasks;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  // Real host/client regression with optional Fusion packet delay, jitter and loss.
  // Never included in the playable release.
  public sealed class DuelNetworkSmoke : MonoBehaviour {
    public static bool Running;
    static readonly int[] Targets={0,14,19,22,25};
    static readonly int[] Kinds={1,1,0,3,4};
    static bool ready;
    public static int HistoricalHits;
    static Vector3 renderedTarget;
    int seenVisual,feedbackSamples;float maxFeedback;
    void Awake(){Running=true;ready=false;HistoricalHits=0;}
    static void Check(bool ok,string message){if(!ok)throw new Exception("NETWORK_CHECK_FAILED "+message);}
    static async Task Wait(Func<bool> condition,string label,float seconds=40) {
      float until=Time.realtimeSinceStartup+seconds;
      while(!condition()){if(Time.realtimeSinceStartup>until)throw new Exception("NETWORK_TIMEOUT "+label);await Task.Delay(40);}
    }
    public static DuelInput Input(DuelSession s) {
      var input=new DuelInput{Look=new Vector2(0,-70),Weapon=-1};
      if(!ready||!s.Match||!s.Local)return input;
      if(s.Runner.IsServer) {
        float desired=24+Mathf.Sin(Time.realtimeSinceStartup)*3;
        input.Move=new Vector2(Mathf.Clamp(desired-s.Local.transform.position.x,-1,1),0);
      }else {
        int stage=s.Match.Game;
        if(stage>=1&&stage<=4){
          input.Weapon=Kinds[stage];
          // Short clicks exercise rollback around button release; held automatic
          // fire alone cannot catch a presentation counter swallowing the next tap.
          int tick=s.Runner.Tick;
          bool trigger=stage!=1||tick%30<3;
          input.Buttons.Set(Action.Fire,trigger&&s.Local.Shots<Targets[stage]);
        }
        if(stage==5&&ready) {
          var direction=renderedTarget+Vector3.up*1.1f-s.Local.transform.position-Vector3.up*1.55f;
          var angle=Quaternion.LookRotation(direction).eulerAngles;
          input.Look=new Vector2(angle.y,Mathf.DeltaAngle(0,angle.x));input.Weapon=1;
          input.Buttons.Set(Action.Fire,s.Local.Hits<3&&s.Local.Shots<37);
        }
      }
      return input;
    }
    void LateUpdate() {
      var s=DuelSession.Instance;
      if(!ready||!s.Local||s.Runner.IsServer)return;
      var target=s.Players.FirstOrDefault(p=>p.Seat==0);if(target)renderedTarget=target.transform.position;
      if(s.Local.VisualShots==seenVisual)return;
      seenVisual=s.Local.VisualShots;feedbackSamples++;maxFeedback=Mathf.Max(maxFeedback,s.Local.ShotFeedbackMs);
      Debug.Log($"RIVALS_PREDICTED_SHOT count={seenVisual} feedbackMs={s.Local.ShotFeedbackMs:F2} rttMs={s.Runner.GetPlayerRtt(s.Runner.LocalPlayer)*1000:F1} utcTicks={DateTime.UtcNow.Ticks}");
    }
    async void Start() {
      try {
        var s=DuelSession.Instance;
        await Wait(()=>s.Local&&s.Match&&s.Players.Length==8&&s.Runner.ActivePlayers.Count()==2,"two humans",80);
        if(s.Runner.IsServer) {
          foreach(var p in s.Players) {
            p.IsBot=false;p.Health=100;
            p.GetComponent<NetworkCharacterController>().Teleport(p==s.Local?new Vector3(24,.1f,10):p.HasInputAuthority?new Vector3(24,.1f,-10):new Vector3(32,.1f,p.Seat*3-12));
            p.GetComponent<NetworkCharacterController>().Velocity=Vector3.zero;
          }
          var client=s.Players.First(p=>p.Object.InputAuthority!=PlayerRef.None&&p!=s.Local);
          client.GetComponent<NetworkCharacterController>().Teleport(new Vector3(24,.1f,-10));
          s.Match.Phase=1;s.Match.Timer=TickTimer.CreateFromSeconds(s.Runner,5);await Task.Delay(1500);
          for(int n=0;n<DuelMatch.PickupCount;n++){var pickup=s.Match.Pickups[n];pickup.Respawn=TickTimer.CreateFromSeconds(s.Runner,300);s.Match.Pickups.Set(n,pickup);}
          s.Match.Game=1;s.Match.Phase=2;s.Match.Timer=TickTimer.CreateFromSeconds(s.Runner,300);ready=true;
          for(int stage=1;stage<=4;stage++) {
            if(stage>1){client.CollectWeapon(Kinds[stage]);s.Match.Game=stage;}
            await Wait(()=>client.Shots>=Targets[stage],"authoritative shots "+stage);
            await Task.Delay(1500);
            Check(client.Shots==Targets[stage],"duplicate authoritative shot");
            Check(client.Ammo==(stage==1?10:Weapons.Magazines[Kinds[stage]]-(Targets[stage]-Targets[stage-1])),"authoritative ammo stage "+stage);
            Check(s.Players.All(p=>p.Health==100),"air shots must not damage");
            Debug.Log($"RIVALS_NETWORK_STAGE_OK stage={stage} shots={client.Shots} ammo={client.Ammo}");
          }
          s.Match.Game=5;
          await Wait(()=>client.Hits>=3,"moving target hit compensation",20);
          await Task.Delay(1000);
          Check(HistoricalHits>0,"at least one rewind hit misses the current target capsule");
          Debug.Log($"RIVALS_LAG_COMPENSATION_OK hits={client.Hits} rewindOnlyHits={HistoricalHits} targetHealth={s.Local.Health}");
          s.Match.Game=6;await Task.Delay(3500);
          Debug.Log("RIVALS_NETWORK_HOST_OK weapons=4 shots=25 reload=true duplicates=0 damage=0");
        }else {
          await Wait(()=>s.Match.Phase==2&&s.Match.Game==1,"ready");ready=true;
          await Wait(()=>s.Match.Game==5,"all four weapons",80);
          Check(s.Local.Shots==25&&s.Local.VisualShots==25,"exactly 25 predicted/confirmed presentations");
          Check(s.Local.SniperAmmo==2,"sniper ammo reconciled");
          Check(feedbackSamples>=20&&maxFeedback<120,"immediate local feedback");
          Debug.Log($"RIVALS_NETWORK_CLIENT_OK shots={s.Local.Shots} visuals={s.Local.VisualShots} maxFeedbackMs={maxFeedback:F2} samples={feedbackSamples} rttMs={s.Runner.GetPlayerRtt(s.Runner.LocalPlayer)*1000:F1}");
          await Wait(()=>s.Match.Game==6,"moving target hits",25);
          Check(s.Local.Hits>=3,"authoritative hits returned to client");
        }
        Application.Quit(0);
      }catch(Exception e){Debug.LogException(e);Application.Quit(2);}
    }
  }
}
#endif
