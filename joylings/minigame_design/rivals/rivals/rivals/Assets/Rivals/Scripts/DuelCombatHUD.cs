using System.Linq;
using UnityEngine;

namespace RivalsPrototype {
  public partial class DuelSession {
    DuelPlayer aimTarget,lastHitTarget;
    int seenPickups,seenLife;
    float targetUntil,pickupUntil,nextTargetScan;
    string pickupMessage;
    public DuelPlayer AimTarget=>aimTarget;
    readonly RaycastHit[] targetHits=new RaycastHit[64];
    readonly bool[] nameVisible=new bool[MaxPlayers];

    void RequestWeapon(int kind) {
      if(Local.HasWeapon(kind))weapon=kind;
      else {pickupMessage=$"尚未取得{Weapons.Names[kind]}，到地圖上找找！";pickupUntil=Time.unscaledTime+1.6f;}
    }
    void UpdateCombatHud() {
      if(!Local||!Local.Object||!Local.Object.IsValid||!Match||!Match.Object||!Match.Object.IsValid)return;
      if(seenLife!=Local.SpawnSequence){seenLife=Local.SpawnSequence;lastHitTarget=aimTarget=null;seenPickups=Local.PickupsCollected;lastHits=Local.Hits;pickupUntil=hitUntil=targetUntil=0;ClearWeaponRequest();}
      if(Local.Hits!=lastHits) {
        lastHits=Local.Hits;hitUntil=Time.unscaledTime+.24f;targetUntil=Time.unscaledTime+2;
        lastHitTarget=Match.Players.FirstOrDefault(p=>p.Seat==Local.LastHitSeat);
      }
      if(Local.PickupsCollected!=seenPickups) {
        seenPickups=Local.PickupsCollected;pickupMessage=$"已撿取 {Weapons.Names[Local.LastPickupWeapon]}";pickupUntil=Time.unscaledTime+2;
      }
      if(Time.unscaledTime<nextTargetScan)return;
      nextTargetScan=Time.unscaledTime+.08f;aimTarget=null;
      var camera=Local.ViewCamera;if(!camera||Local.Health<=0)return;
      foreach(var player in Players)nameVisible[player.Seat]=player!=Local&&player.Health>0&&(player.transform.position-camera.transform.position).sqrMagnitude<NameRange*NameRange&&VisiblePoint(player.transform.position+Vector3.up*1.65f);
      var origin=camera.transform.position;
      int count=Physics.SphereCastNonAlloc(origin,.12f,camera.transform.forward,targetHits,100,~0,QueryTriggerInteraction.Ignore);
      float nearest=float.MaxValue;
      for(int n=0;n<count;n++) {
        var hit=targetHits[n];
        var player=hit.collider.GetComponentInParent<DuelPlayer>();
        if(player&&!player.IsReady)continue;
        if(player==Local||(player&&player.Health<=0))continue;
        if(hit.distance>=nearest)continue;
        nearest=hit.distance;aimTarget=player;
      }
    }
    bool VisiblePoint(Vector3 point) {
      if(!Local||!Local.ViewCamera)return false;
      var origin=Local.ViewCamera.transform.position;var delta=point-origin;
      return !Physics.Raycast(origin,delta.normalized,delta.magnitude,DuelPlayer.WorldMask,QueryTriggerInteraction.Ignore);
    }
    void DrawCombatHud() {
      if(!Local||!Local.ViewCamera)return;
      float pulse=Local.DamagePulse;
      if(pulse>0) {
        Fill(new Rect(0,0,hudWidth,hudHeight),new Color(.8f,.02f,.01f,pulse*.075f));
        for(int band=0;band<14;band++) {
          var color=new Color(.86f,.035f,.025f,pulse*.6f*(1-band/14f));float inset=band*4;
          Fill(new Rect(inset,0,4,hudHeight),color);Fill(new Rect(hudWidth-4-inset,0,4,hudHeight),color);
          Fill(new Rect(0,inset,hudWidth,4),color);Fill(new Rect(0,hudHeight-4-inset,hudWidth,4),color);
        }
        if(Local.Health>0) {
          var direction=Local.ViewCamera.transform.InverseTransformDirection(Local.DamageOrigin-Local.transform.position);
          var matrix=GUI.matrix;GUIUtility.RotateAroundPivot(Mathf.Atan2(direction.x,direction.z)*Mathf.Rad2Deg,HudCenter);
          Fill(new Rect(HudCenter.x-14,HudCenter.y-77,28,5),new Color(1,.12f,.07f,pulse));GUI.matrix=matrix;
        }
      }
      if(Local.Health>0&&Match.Phase==2) {
        var target=aimTarget?aimTarget:Time.unscaledTime<targetUntil?lastHitTarget:null;
        if(target&&target.IsReady) {
          var color=TeamColor(target.Team);
          bool near=(target.transform.position-Local.ViewCamera.transform.position).sqrMagnitude<NameRange*NameRange;
          string label=target.Health<=0?"已擊倒":near?FitHudName(target.DisplayName,105,14):"目標";
          var box=new Rect(HudCenter.x-88,HudCenter.y-63,176,36);HudRound(box,new Color(.04f,.07f,.1f,.94f),6);
          HudText(new Rect(box.x+10,box.y+2,111,26),label,14,null,TextAnchor.MiddleLeft);
          HudText(new Rect(box.x+125,box.y+2,41,26),target.Health.ToString(),14,color,TextAnchor.MiddleRight);
          Fill(new Rect(box.x+10,box.y+30,156,3),new Color(.18f,.2f,.24f));Fill(new Rect(box.x+10,box.y+30,156*Mathf.Clamp01((float)target.Health/DuelPlayer.MaxHealth),3),color);
        }
        if(Time.unscaledTime<hitUntil) {
          var matrix=GUI.matrix;GUIUtility.RotateAroundPivot(45,HudCenter);
          var color=Local.LastHitKilled?new Color(1,.73f,.18f):Color.white;
          foreach(var rect in new[]{new Rect(HudCenter.x-2,HudCenter.y-20,4,10),new Rect(HudCenter.x-2,HudCenter.y+10,4,10),new Rect(HudCenter.x-20,HudCenter.y-2,10,4),new Rect(HudCenter.x+10,HudCenter.y-2,10,4)}) {
            Fill(new Rect(rect.x-1,rect.y-1,rect.width+2,rect.height+2),Color.black);Fill(rect,color);
          }
          GUI.matrix=matrix;
          HudText(new Rect(HudCenter.x-40,HudCenter.y+28,80,26),Local.LastHitKilled?"擊倒":$"-{Local.LastHitDamage}",19,color,bold:true);
        }
        if(Time.unscaledTime<pickupUntil){var box=new Rect(HudCenter.x-110,HudCenter.y+94,220,34);HudCard(box);HudText(box,pickupMessage,15);}
        DrawPickupLabels();
      }
    }
    void DrawPickupLabels() {
      var camera=Local.ViewCamera;
      for(int slot=0;slot<DuelMatch.PickupCount;slot++) {
        var pickup=Match.Pickups[slot];var point=pickup.Position+Vector3.up*1.8f;
        if((point-camera.transform.position).sqrMagnitude>18*18)continue;
        var screen=camera.WorldToViewportPoint(point);
        if(screen.z<=0||screen.x<.08f||screen.x>.92f||screen.y<.22f||screen.y>.78f||!VisiblePoint(point))continue;
        var rect=new Rect(screen.x*hudWidth-82,(1-screen.y)*hudHeight-14,164,28);
        string hint=pickup.Respawn.IsRunning?$" · {Mathf.CeilToInt(pickup.Respawn.RemainingTime(Runner)??0)}秒":Local.Weapon==pickup.Weapon?" · 已持有":" · 靠近替換";
        HudRound(rect,new Color(.04f,.07f,.1f,.94f),5);HudText(rect,Weapons.Names[pickup.Weapon]+hint,14,Weapons.Color(pickup.Weapon));
      }
    }
  }
}
