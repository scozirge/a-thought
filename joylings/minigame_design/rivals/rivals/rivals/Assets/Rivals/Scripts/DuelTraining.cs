using System;
using Fusion;
using UnityEngine;

namespace RivalsPrototype {
  public partial class DuelSession {
    public bool IsTraining { get; private set; }
    public int TrainingWeapon { get; private set; }=Weapons.Pistol;
    int trainingWeaponRequest=-1;
    bool trainingArmoryOpen;
    DuelTrainingWorld trainingWorld;
    void SetTrainingMode(bool enabled) {
      IsTraining=enabled;trainingArmoryOpen=false;trainingWeaponRequest=-1;TrainingWeapon=Weapons.Pistol;
      if(enabled&&!trainingWorld)trainingWorld=gameObject.AddComponent<DuelTrainingWorld>();
      if(trainingWorld)trainingWorld.SetVisible(enabled);
    }
    public bool SelectTrainingWeapon(int kind) {
      if(!IsTraining||!Runner||Runner.GameMode!=GameMode.Single||!started||!Local||!Local.IsReady||!Weapons.IsWeapon(kind))return false;
      TrainingWeapon=kind;trainingWeaponRequest=kind;return true;
    }
    public void ApplyTrainingWeaponRequest() {
      if(trainingWeaponRequest<0||!Local||Local.Health<=0)return;
      if(Local.EquipTrainingWeapon(trainingWeaponRequest))trainingWeaponRequest=-1;
    }
    public void RememberTrainingPickup(int kind){if(IsTraining)TrainingWeapon=kind;}
    void OpenTrainingArmory(){if(!IsTraining)return;trainingArmoryOpen=true;PauseControls();}
    void DrawTrainingScoreboard() {
      bool bottomArmory=hudWidth>520&&hudWidth<=760&&hudHeight<=540;
      float reserve=DuelWebInput.TouchMode?(bottomArmory?174:284):(bottomArmory?88:200);
      bool narrow=hudWidth-hudLeft-hudRight-reserve<284;
      float width=Mathf.Min(360,hudWidth-hudLeft-hudRight-(narrow?0:reserve));
      float x=hudLeft+(hudWidth-hudLeft-hudRight-(narrow?0:reserve)-width)/2,y=hudTop+(narrow?54:0);
      scoreBounds=new Rect(x,y,width,68);DrawLocalIdentity(new Rect(x,y,width,32));
      var strip=new Rect(x,y+38,width,30);HudCard(strip);
      HudText(new Rect(x+12,strip.y,90,30),"訓練場",17,HudGold,TextAnchor.MiddleLeft,true);
      HudText(new Rect(x+104,strip.y,width-116,30),$"擊倒 {Match.Blue} · 自動復活",15,HudMuted,TextAnchor.MiddleRight);
#if !UNITY_WEBGL || UNITY_EDITOR
      if(HudButton(new Rect(hudWidth-hudRight-120,hudTop,120,44),"更換武器"))OpenTrainingArmory();
#endif
    }
    void DrawTrainingArmory() {
      Fill(new Rect(0,0,hudWidth,hudHeight),new Color(.025f,.04f,.07f,.8f));
      float width=Mathf.Min(690,hudWidth-24),height=Mathf.Min(398,hudHeight-20);
      var box=new Rect((hudWidth-width)/2,(hudHeight-height)/2,width,height);HudCard(box,HudGold);
      HudText(new Rect(box.x+20,box.y+12,width-40,32),"訓練場 · 選擇武器",25,null,TextAnchor.MiddleLeft,true);
      HudText(new Rect(box.x+20,box.y+49,width-40,25),"點選即可領取滿彈武器 · 靶子與自己 3 秒後復活",16,HudMuted,TextAnchor.MiddleLeft);
      float cell=(width-48)/3,row=Mathf.Min(77,(height-138)/3);
      for(int i=0;i<Weapons.Slots.Length;i++) {
        int kind=Weapons.Slots[i];var rect=new Rect(box.x+16+(i%3)*(cell+8),box.y+84+(i/3)*row,cell,row-8);
        if(HudButton(rect,Weapons.Names[kind],kind==TrainingWeapon)){SelectTrainingWeapon(kind);trainingArmoryOpen=false;ResumeControls();}
      }
      if(HudButton(new Rect(box.x+16,box.yMax-48,width-32,36),"返回練習")){trainingArmoryOpen=false;ResumeControls();}
    }
  }

  public partial class DuelMatch {
    public bool IsTraining=>DuelSession.Instance&&DuelSession.Instance.IsTraining;
    void BeginTraining(DuelPlayer[] players) {
      Game=1;Blue=Red=0;Winner=-1;ClearOrdnance();damageBatchDepth=0;pendingWinner=-1;
      foreach(var player in players)player.ResetForMatch();
      for(int slot=0;slot<PickupCount;slot++)SpawnPickup(slot);
      Phase=2;Timer=TickTimer.None;
    }
    void UpdateTraining(DuelPlayer[] players) {
      if(Phase==0){BeginTraining(players);return;}
      foreach(var player in players)if(player.Health<=0&&player.RespawnTimer.Expired(Runner))player.ResetForMatch();
      DuelSession.Instance.ApplyTrainingWeaponRequest();UpdatePickups(players);UpdateOrdnance();
    }
  }

  // This arena is local to GameMode.Single. It never enters the public room list.
  public sealed class DuelTrainingWorld : MonoBehaviour {
    Transform range;
    DuelWorld arena;
    Font labelFont;
    Material labelMaterial;
    void Awake(){Font.textureRebuilt+=RefreshFontAtlas;}
    void RefreshFontAtlas(Font font){if(font==labelFont&&labelMaterial)labelMaterial.mainTexture=font.material.mainTexture;}
    public static readonly Vector3[] Positions={
      new Vector3(0,.1f,-29),new Vector3(0,.1f,-27),new Vector3(-7,.1f,-19),new Vector3(7,.1f,-9),
      new Vector3(-7,.1f,6),new Vector3(7,.1f,21),new Vector3(-2,.1f,-11),new Vector3(2,.1f,-11)};
    public static Vector3 PickupPosition(int slot)=>new Vector3(-20+slot*5,.1f,-34);
    public void SetVisible(bool visible) {
      if(!arena)arena=FindFirstObjectByType<DuelWorld>(FindObjectsInactive.Include);
      if(visible&&!range)Build();
      if(arena)arena.gameObject.SetActive(!visible);
      if(range)range.gameObject.SetActive(visible);
      Physics.SyncTransforms();
    }
    void Build() {
      range=new GameObject("Training range").transform;range.SetParent(transform,false);
      var floor=new Color(.25f,.33f,.37f);var wall=new Color(.24f,.30f,.36f);var gold=new Color(1,.73f,.25f);
      DuelWorld.Block(range,"Range floor",new Vector3(0,-.3f,-3),new Vector3(54,.6f,76),floor);
      DuelWorld.Block(range,"Backstop",new Vector3(0,3,34),new Vector3(54,6,1),wall);
      DuelWorld.Block(range,"Rear wall",new Vector3(0,2,-40),new Vector3(54,4,1),wall);
      foreach(int side in new[]{-1,1})DuelWorld.Block(range,"Range wall",new Vector3(side*27,2,-3),new Vector3(1,4,74),wall);
      for(int x=-24;x<=24;x+=4)DuelWorld.Block(range,"Floor grid",new Vector3(x,.004f,-3),new Vector3(.025f,.008f,72),new Color(.30f,.38f,.41f),false);
      for(int z=-38;z<=30;z+=4)DuelWorld.Block(range,"Floor grid",new Vector3(0,.004f,z),new Vector3(52,.008f,.025f),new Color(.30f,.38f,.41f),false);
      DuelWorld.Block(range,"Firing line",new Vector3(0,.012f,-29),new Vector3(48,.025f,.14f),gold,false);
      foreach(int meters in new[]{10,20,35,50}) {
        float z=-29+meters;DuelWorld.Block(range,"Distance line",new Vector3(0,.013f,z),new Vector3(46,.025f,.06f),new Color(.39f,.55f,.60f),false);
        Sign(meters+" m",new Vector3(-23,1.4f,z),new Color(.70f,.88f,.95f));
      }
      Sign("TRAINING RANGE",new Vector3(0,4.3f,33.4f),gold,.21f);
      for(int i=1;i<Positions.Length;i++) {
        var p=Positions[i];DuelWorld.Block(range,"Target marker",new Vector3(p.x,.016f,p.z),new Vector3(1.8f,.03f,1.8f),new Color(.52f,.25f,.22f),false);
        Sign(i.ToString("00"),new Vector3(p.x,.7f,p.z+1.3f),new Color(1,.62f,.49f),.14f);
      }
      DuelWorld.Block(range,"Armory stripe",new Vector3(0,.013f,-36),new Vector3(45,.025f,.15f),new Color(.27f,.77f,.92f),false);
    }
    void Sign(string text,Vector3 position,Color color,float size=.16f) {
      var label=new GameObject("Range sign "+text).AddComponent<TextMesh>();label.transform.SetParent(range,false);label.transform.localPosition=position;
      if(!labelFont)labelFont=Resources.Load<Font>("Fonts/NotoSansTC-Regular");
      if(!labelMaterial)labelMaterial=new Material(Resources.Load<Shader>("TrainingLabel"));
      label.font=labelFont;labelMaterial.mainTexture=labelFont.material.mainTexture;label.GetComponent<MeshRenderer>().sharedMaterial=labelMaterial;
      label.text=text;label.fontSize=64;label.characterSize=size;label.anchor=TextAnchor.MiddleCenter;label.alignment=TextAlignment.Center;label.color=color;
      label.GetComponent<MeshRenderer>().shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
    }
    void OnDestroy(){Font.textureRebuilt-=RefreshFontAtlas;if(labelMaterial)Destroy(labelMaterial);if(arena)arena.gameObject.SetActive(true);if(range)Destroy(range.gameObject);}
  }
}
