using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace RivalsPrototype {
  // Presentation only. Damage, time and impact positions come from the host.
  public sealed class DuelOrdnanceView : MonoBehaviour {
    sealed class Effect {
      public int Sequence,Stage;
      public Transform Root,Model,Core,Cloud,Disc;
      public LineRenderer Ring,Inner;
      public TextMesh Text;
      public Transform[] Bits;
    }
    DuelMatch match;
    readonly Effect[] effects=new Effect[DuelMatch.OrdnanceCapacity];
    static readonly Dictionary<Color,Material> materials=new Dictionary<Color,Material>();
    Transform preview;
    LineRenderer laser,previewRing;
    static readonly Color Fire=new Color(1,.34f,.06f,.80f),Gold=new Color(1,.77f,.23f,.95f),Toxic=new Color(.47f,1,.16f,.85f),Red=new Color(1,.10f,.12f,.95f);

    public static Material EffectMaterial(Color color) {
      if(materials.TryGetValue(color,out var material)&&material)return material;
      // Explicit resource keeps the transparent shader in Web/IL2CPP builds.
      material=new Material(Resources.Load<Shader>("ArsenalEffect")){name="Arsenal effect",renderQueue=(int)RenderQueue.Transparent};
      material.SetColor("_BaseColor",color);
      materials[color]=material;return material;
    }
    void Awake(){match=GetComponent<DuelMatch>();}
    static Transform Root(string name,Transform parent){var t=new GameObject(name).transform;t.SetParent(parent,false);return t;}
    static Transform Ball(Transform parent,string name,Color color) {
      var t=DuelWeaponModels.Sphere(parent,name,Vector3.zero,Vector3.one,color);
      t.GetComponent<Renderer>().sharedMaterial=EffectMaterial(color);t.GetComponent<Renderer>().shadowCastingMode=ShadowCastingMode.Off;return t;
    }
    static LineRenderer Ring(Transform parent,float radius,Color color,float width=.1f) {
      var line=Root("Ground warning ring",parent).gameObject.AddComponent<LineRenderer>();line.useWorldSpace=false;line.loop=true;line.positionCount=80;
      line.sharedMaterial=EffectMaterial(color);line.startWidth=line.endWidth=width;line.shadowCastingMode=ShadowCastingMode.Off;
      for(int i=0;i<80;i++){float a=i*Mathf.PI/40;line.SetPosition(i,new Vector3(Mathf.Cos(a)*radius,.08f,Mathf.Sin(a)*radius));}return line;
    }
    static Transform Disc(Transform parent,float radius,Color color) {
      var t=DuelWeaponModels.Cylinder(parent,"Area marker",Vector3.up*.025f,radius,.014f,color);
      t.GetComponent<Renderer>().sharedMaterial=EffectMaterial(color);t.GetComponent<Renderer>().shadowCastingMode=ShadowCastingMode.Off;return t;
    }
    Effect Create(OrdnanceState state) {
      var e=new Effect{Sequence=state.Sequence,Stage=state.Stage,Root=Root("Synced "+Weapons.Names[state.Weapon],transform)};
      e.Root.position=state.Position;
      if(state.Stage==OrdnanceState.Flying) {
        e.Model=DuelWeaponModels.Projectile(e.Root,state.Weapon);
        var trail=e.Root.gameObject.AddComponent<TrailRenderer>();trail.sharedMaterial=EffectMaterial(state.Weapon==Weapons.Poison?Toxic:state.Weapon==Weapons.Cleaver?new Color(.65f,.95f,1,.7f):Gold);
        trail.time=state.Weapon==Weapons.Rocket?.5f:.25f;trail.minVertexDistance=.12f;trail.startWidth=state.Weapon==Weapons.Rocket?.14f:.065f;trail.endWidth=0;trail.shadowCastingMode=ShadowCastingMode.Off;
      }else if(state.Stage==OrdnanceState.Warning) {
        e.Disc=Disc(e.Root,Weapons.NukeRadius,new Color(.8f,.015f,.02f,.09f));
        e.Ring=Ring(e.Root,Weapons.NukeRadius,Red,.17f);e.Inner=Ring(e.Root,1.8f,Red,.1f);
        for(int i=0;i<4;i++){float a=i*Mathf.PI*.5f;var mark=DuelWeaponModels.Box(e.Root,"Strike boundary",new Vector3(Mathf.Sin(a),0,Mathf.Cos(a))*(Weapons.NukeRadius-.55f),new Vector3(.15f,.06f,1),Red);mark.localRotation=Quaternion.Euler(0,i*90,0);}
        e.Core=Ball(e.Root,"Infrared beacon",new Color(1,.1f,.13f,.45f));e.Core.localPosition=Vector3.up*2;e.Core.localScale=new Vector3(.12f,4,.12f);
        e.Model=DuelWeaponModels.NuclearPayload(e.Root);e.Model.gameObject.SetActive(false);
        e.Text=Root("Strike countdown",e.Root).gameObject.AddComponent<TextMesh>();e.Text.anchor=TextAnchor.MiddleCenter;e.Text.fontSize=64;e.Text.characterSize=.065f;e.Text.color=Red;e.Text.transform.localPosition=Vector3.up*3.2f;
      }else if(state.Stage==OrdnanceState.Toxic) {
        e.Disc=Disc(e.Root,Weapons.PoisonRadius,new Color(.26f,.8f,.08f,.38f));
        e.Ring=Ring(e.Root,Weapons.PoisonRadius,Toxic,.13f);
        e.Bits=new Transform[9];for(int i=0;i<e.Bits.Length;i++)e.Bits[i]=Ball(e.Root,"Poison bubble",new Color(.47f,1,.16f,.40f));
        for(int i=0;i<6;i++){float a=i*Mathf.PI/3;var mark=DuelWeaponModels.Box(e.Root,"Toxic hazard stripe",new Vector3(Mathf.Cos(a),0,Mathf.Sin(a))*(Weapons.PoisonRadius-.35f)+Vector3.up*.07f,new Vector3(.32f,.014f,.52f),new Color(.12f,.17f,.06f));mark.localRotation=Quaternion.Euler(0,-a*Mathf.Rad2Deg,0);}
      }else {
        bool nuclear=state.Stage==OrdnanceState.NuclearBlast;
        e.Core=Ball(e.Root,"Fireball",Gold);e.Cloud=Root("Smoke crown",e.Root);e.Bits=new Transform[nuclear?10:7];
        for(int i=0;i<e.Bits.Length;i++)e.Bits[i]=Ball(e.Cloud,"Smoke and embers",i%3==0?Fire:new Color(.13f,.16f,.19f,.63f));
        e.Ring=Ring(e.Root,1,Fire,.14f);e.Inner=Ring(e.Root,1,Gold,.09f);
        if(nuclear){e.Disc=Ball(e.Root,"Mushroom stem",new Color(.92f,.30f,.065f,.48f));}
      }
      return e;
    }
    void LateUpdate() {
      if(!match||!match.Object||!match.Object.IsValid)return;
      var session=DuelSession.Instance;
      for(int i=0;i<effects.Length;i++) {
        var state=match.Ordnance[i];var e=effects[i];
        if(state.Stage==0){if(e!=null){Destroy(e.Root.gameObject);effects[i]=null;}continue;}
        if(e==null||e.Sequence!=state.Sequence||e.Stage!=state.Stage){if(e!=null)Destroy(e.Root.gameObject);effects[i]=e=Create(state);}
        float age=Mathf.Max(0,(float)match.Runner.SimulationTime-state.StartedAt);
        float left=state.Lifetime.RemainingTime(match.Runner)??0;
        e.Root.position=state.Stage==OrdnanceState.Flying?Vector3.Lerp(e.Root.position,state.Position,1-Mathf.Exp(-Time.deltaTime*32)):state.Position;
        if(state.Stage==OrdnanceState.Flying) {
          if(state.Velocity.sqrMagnitude>.1f)e.Root.rotation=Quaternion.LookRotation(state.Velocity);
          e.Model.localRotation=state.Weapon==Weapons.Rocket?Quaternion.identity:Quaternion.Euler(age*(state.Weapon==Weapons.Cleaver?900:250),0,0);
        }else if(state.Stage==OrdnanceState.Warning) {
          float pulse=.72f+Mathf.Sin(age*14)*.28f;e.Ring.enabled=Mathf.Repeat(age*2.5f,1)<.78f;e.Ring.widthMultiplier=.12f+pulse*.10f;e.Inner.transform.localScale=Vector3.one*(.9f+.1f*pulse);
          e.Core.localScale=new Vector3(.10f+pulse*.08f,4,.10f+pulse*.08f);e.Text.text=Mathf.CeilToInt(left).ToString();
          if(session&&session.Local&&session.Local.ViewCamera)e.Text.transform.rotation=session.Local.ViewCamera.transform.rotation;
          e.Model.gameObject.SetActive(left<=1.4f);if(left<=1.4f)e.Model.localPosition=Vector3.up*(1.5f+Mathf.Pow(Mathf.Clamp01(left/1.4f),2)*42);
        }else if(state.Stage==OrdnanceState.Toxic) {
          float grow=Mathf.Clamp01(age*5);e.Disc.localScale=new Vector3(Weapons.PoisonRadius*2*grow,.007f,Weapons.PoisonRadius*2*grow);
          e.Ring.widthMultiplier=.10f+.035f*Mathf.Sin(age*5);
          for(int n=0;n<e.Bits.Length;n++){float phase=Mathf.Repeat(age*.52f+n*.31f,1),angle=n*2.39996f,radius=(.25f+(n%3)*.2375f)*Weapons.PoisonRadius;e.Bits[n].localPosition=new Vector3(Mathf.Cos(angle)*radius,.12f+phase*.85f,Mathf.Sin(angle)*radius);e.Bits[n].localScale=Vector3.one*(.13f+Mathf.Sin(phase*Mathf.PI)*.24f);}
          if(left<.4f)e.Root.localScale=Vector3.one*Mathf.Clamp01(left/.4f);
        }else {
          bool nuclear=state.Stage==OrdnanceState.NuclearBlast,rocket=state.Weapon==Weapons.Rocket;
          float duration=nuclear?3:rocket?1.2f:.35f,t=Mathf.Clamp01(age/duration),radius=nuclear?Weapons.NukeRadius:rocket?Weapons.RocketRadius:1;
          float fireSize=radius*(nuclear?.85f:.60f)*Mathf.Sin(Mathf.Clamp01(t*2)*Mathf.PI);
          e.Core.localPosition=Vector3.up*(nuclear?1.5f+t*7:.2f+t*.8f);e.Core.localScale=Vector3.one*Mathf.Max(.01f,fireSize);
          e.Ring.transform.localScale=Vector3.one*Mathf.Max(.1f,radius*Mathf.Clamp01(t*3));e.Inner.transform.localScale=Vector3.one*Mathf.Max(.1f,radius*Mathf.Clamp01(t*2.4f));
          e.Ring.widthMultiplier=(1-t)*.25f;e.Inner.widthMultiplier=(1-t)*.16f;
          for(int n=0;n<e.Bits.Length;n++){float a=n*2.39996f,spread=radius*(.15f+t*.40f);e.Bits[n].localPosition=new Vector3(Mathf.Cos(a)*spread,nuclear?2+t*9+n%2:t*2+.2f,Mathf.Sin(a)*spread);e.Bits[n].localScale=Vector3.one*radius*(.16f+t*.16f)*(1-t*t);}
          if(nuclear){e.Disc.localPosition=Vector3.up*(t*5);e.Disc.localScale=new Vector3(2.2f*(1-t),t*12,2.2f*(1-t));}
        }
      }
      UpdatePreview(session);
    }
    void UpdatePreview(DuelSession session) {
      bool active=session&&session.ControlsActive&&session.Local&&session.Local.Health>0&&session.Local.Weapon==Weapons.Nuke&&match.Phase==2;
      Vector3 point=default;var camera=active?session.Local.ViewCamera:null;
      active=active&&camera&&DuelMatch.TryNukeTarget(camera.transform.position,camera.transform.forward,out point);
      if(!active){if(preview)preview.gameObject.SetActive(false);return;}
      if(!preview) {
        preview=Root("Local infrared preview",transform);previewRing=Ring(preview,1.3f,new Color(1,.2f,.2f,.7f),.06f);
        laser=Root("Infrared beam",preview).gameObject.AddComponent<LineRenderer>();laser.sharedMaterial=EffectMaterial(new Color(1,.12f,.15f,.50f));laser.positionCount=2;laser.startWidth=laser.endWidth=.018f;
      }
      preview.gameObject.SetActive(true);preview.position=point;
      laser.SetPosition(0,camera.transform.position+camera.transform.right*.22f-camera.transform.up*.16f+camera.transform.forward*.65f);laser.SetPosition(1,point);
    }
  }
}
