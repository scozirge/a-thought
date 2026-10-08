using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;

namespace Together {
 public partial class PuzzleParty : MonoBehaviour {
  Level[] levels;Level level;string game="";int levelIndex,selected;string[] settings=new string[4];
  bool levelPicker;bool playing,paused;float speed=1,scale=1,viewWidth;Vector2 scroll;Result result;
  string cue="準備出發",detail="四組選好，再按播放。",tone="ready";
  int active=-1,currentStep=-1;bool rotating;float rotation;string[] stickerBoard;
  HeroState hero;Vector2 heroPosition,monsterPosition;float heroAlpha=1;string portalPhase="";
  Cell[] fire=new Cell[0];Effect breath;float breathProgress,charge;string facing="right";
  Vector2[] icePositions;Dictionary<int,string> eventStates=new Dictionary<int,string>();List<string> log=new List<string>();
  Font font;Dictionary<string,Texture2D> art=new Dictionary<string,Texture2D>();GUIStyle labelStyle,buttonStyle;
  readonly List<Hit> hits=new List<Hit>();float nextSnapshot,maxScroll,contentHeight=1100,stageScrollY,headerExtra,roleExtra;bool cancelPointer;
  Color ink=C("294e45"),green=C("306d5c"),muted=C("778572"),paper=C("fffef8"),line=C("d9dfd0"),gold=C("ffe183");
  public static Color C(string s){ColorUtility.TryParseHtmlString("#"+s,out var c);return c;}
  string GameName(string g)=>g=="hero"?"傻瓜勇者":g=="sticker"?"貼紙工廠":g=="animal"?"動物拍照隊":"帶企鵝回家";
  void Awake(){
   #if UNITY_WEBGL && !UNITY_EDITOR
   WebGLInput.captureAllKeyboardInput=false;
   #endif
   Application.targetFrameRate=60;font=Resources.Load<Font>("NotoSansTC-Regular");
   levels=JsonUtility.FromJson<LevelBook>(Resources.Load<TextAsset>("levels").text).levels;
   foreach(string s in new[]{"hero","heroArmed","dragon","monster","sword","doorA","doorB","flame","penguinRed","penguinBlue"})art[s]=Resources.Load<Texture2D>("Art/"+s);
   InitOnline();speed=PlayerPrefs.GetFloat("speed",1);Debug.Log("PUZZLE_UNITY_READY "+levels.Length+" levels");
  }
  void Open(string g,int index){if(Route(new RoomAction{type="open",game=g,index=index}))return;var available=levels.Where(l=>l.game==g).ToArray();if(available.Length==0)return;StopAllCoroutines();playing=false;paused=false;game=g;levelIndex=Mathf.Clamp(index,0,available.Length-1);level=available[levelIndex];selected=3;scroll=Vector2.zero;
   settings=new string[level.Decisions];for(int i=0;i<settings.Length;i++){var v=PlayerPrefs.GetString(level.id+":"+i,"");if(Rules.ValidChoice(level,v))settings[i]=v;}ResetScene();
  }
  void ResetScene(){answerVisible=false;result=null;log.Clear();active=-1;currentStep=-1;rotating=false;rotation=0;heroAlpha=1;portalPhase="";breath=null;fire=new Cell[0];charge=0;eventStates.Clear();Cue("準備出發","四組填好計畫，再按播放。","ready");
   if(level==null)return;
   if(game=="sticker")stickerBoard=new string[level.cols*level.rows];
   if(game=="animal"){animalOrder=(string[])level.lineup.Clone();animalPositions=Enumerable.Range(0,animalOrder.Length).Select(i=>new Vector2(i,0)).ToArray();cameraFlash=0;Cue("先看目標照片","前兩隻交換，或隊長到最後。四步做完才拍照。","ready");}
   if(game=="hero"){hero=Rules.Initial(level);heroPosition=hero.position.Vec();monsterPosition=hero.monster.Vec();facing=level.events?.FirstOrDefault(e=>!string.IsNullOrEmpty(e.fireDirection))?.fireDirection??"right";}
   if(game=="penguin")icePositions=level.boards.Select(b=>b.start.Vec()).ToArray();
  }
  void Cue(string title,string text,string kind){cue=title;detail=text;tone=kind;}
  void Set(int i,string s){if(Route(new RoomAction{type="set",slot=i,value=s}))return;if(playing||i<0||i>=settings.Length||!Rules.ValidChoice(level,s))return;settings[i]=s;PlayerPrefs.SetString(level.id+":"+i,s);PlayerPrefs.Save();ResetScene();selected=i;}
  void Stop(){if(Route(new RoomAction{type="stop"}))return;StopAllCoroutines();playing=false;paused=false;ResetScene();}
  void Play(){if(Route(new RoomAction{type="play"}))return;if(playing||level==null||!Rules.Complete(level,settings))return;ResetScene();scroll.y=stageScrollY;playing=true;paused=false;StartCoroutine(Playback(Rules.Run(level,(string[])settings.Clone())));}
  public void Command(string s){var p=s.Split(':');switch(p[0]){case "open":Open(p[1],int.Parse(p[2]));break;case "set":Set(int.Parse(p[1]),p[2]);break;case "play":Play();break;case "stop":Stop();break;case "pause":TogglePause();break;case "speed":ChangeSpeed();break;case "clear":ClearChoices();break;case "home":GoHome();break;case "answer":ToggleAnswer();break;}}
  public void Scroll(string delta){if(answerVisible)return;if(float.TryParse(delta,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out var d)){scroll.y=Mathf.Clamp(scroll.y+d/scale,0,maxScroll);scroll.x=0;cancelPointer=true;}}
  void OnGUI(){
   if(font==null||levels==null)return;
   GUI.skin.font=font;labelStyle=new GUIStyle(GUI.skin.label){font=font,wordWrap=true,richText=false,alignment=TextAnchor.UpperLeft};labelStyle.normal.textColor=ink;
   buttonStyle=new GUIStyle(labelStyle){alignment=TextAnchor.MiddleCenter,fontSize=16,padding=new RectOffset(5,5,3,3)};
   viewWidth=Mathf.Clamp(Screen.width,360,1360);bool narrow=viewWidth<820;scale=Screen.width/viewWidth;float vh=Screen.height/scale;
   GUI.matrix=Matrix4x4.Scale(new Vector3(scale,scale,1));hits.Clear();if(cancelPointer){GUIUtility.hotControl=0;cancelPointer=false;}
   float total=contentHeight;
   maxScroll=Mathf.Max(0,total-vh);scroll.x=0;scroll.y=Mathf.Clamp(scroll.y,0,maxScroll);
   // WebGL wheel/touch input already arrives through Scroll; avoid a second scroll-view state.
   if(Event.current.type==EventType.ScrollWheel){
    #if !UNITY_WEBGL || UNITY_EDITOR
    if(!answerVisible)scroll.y=Mathf.Clamp(scroll.y+Event.current.delta.y*20,0,maxScroll);
    #endif
    Event.current.Use();
   }
   GUI.enabled=!answerVisible;
   if(maxScroll>0){
    scroll.y=GUI.VerticalScrollbar(new Rect(viewWidth-18,0,18,vh),scroll.y,vh,0,total);
    Round(new Rect(viewWidth-18,0,18,vh),C("f6f6ec"),0);
    Round(new Rect(viewWidth-16,0,14,vh),C("e5e8db"),6);
    float thumb=vh*vh/total;
    Round(new Rect(viewWidth-16,(vh-thumb)*scroll.y/maxScroll,14,thumb),C("a9b9a0"),6);
   }
   GUI.enabled=true;
   GUI.BeginGroup(new Rect(0,0,viewWidth-18,vh));
   GUI.BeginGroup(new Rect(0,-scroll.y,viewWidth-18,Mathf.Max(vh,total)));
   float w=viewWidth-40;
   if(game==""){
   Text(new Rect(24,20,w-158,44),"一起想想",28,ink,true);
   GUI.enabled=CanLead;if(game!=""&&Button(new Rect(viewWidth-185,22,160,44),"← 遊戲選單","home"))GoHome();GUI.enabled=true;
   if(Button(new Rect(viewWidth-185,game==""?22:76,160,44),Online?"房間 / 離開":"連線教室","room"))ShowRoom();
   Text(new Rect(24,76,w-174,56),Online?"房號 "+room.code:"一起玩",18,muted);
   headerExtra=Online?TextHeight(RoleIdentity(),viewWidth-48,22)+12:0;
   if(Online)Text(new Rect(24,132,viewWidth-48,headerExtra),RoleIdentity(),22,green,true);
   }
   roleExtra=Mathf.Max(0,TextHeight(RoleIdentity(),(narrow?viewWidth-48:(viewWidth-68)/2)-52,26)-39);
   if(game=="")DrawHome(narrow);else DrawGame(narrow);
   GUI.EndGroup();GUI.EndGroup();DrawAnswer(vh);GUI.matrix=Matrix4x4.identity;
   if(Event.current.type==EventType.Repaint&&Time.realtimeSinceStartup>nextSnapshot){Publish();nextSnapshot=Time.realtimeSinceStartup+.12f;}
  }
  float TextHeight(string text,float width,int size){labelStyle.fontSize=size;labelStyle.fontStyle=FontStyle.Bold;return labelStyle.CalcHeight(new GUIContent(text),width);}
  string RoleIdentity(){var member=Online?room.members.FirstOrDefault(m=>m.group==room.myGroup):null;return member==null?"你是老師組":RoomAuthority.TeamLabel(member);}
  void DrawHome(bool narrow){
   Text(new Rect(24,148+headerExtra,viewWidth-48,100),"一起玩！",32,ink,true);
   Text(new Rect(24,264+headerExtra,viewWidth-48,72),Online&&!room.isHost?"等老師選關":"選一個",20,muted);
   string[] gs={"sticker","penguin"},notes={"選顏色","選箭頭"};
   float cardWidth=narrow?viewWidth-48:(viewWidth-68)/2;
   for(int i=0;i<gs.Length;i++){
    Rect r=new Rect(24+(narrow?0:i%2*(cardWidth+20)),350+headerExtra+(narrow?i*340:i/2*340),cardWidth,320);Panel(r);
    if(gs[i]=="penguin")Image(new Rect(r.x+20,r.y+12,120,120),"penguinRed");
    else if(gs[i]=="animal"){AnimalFace(new Rect(r.x+20,r.y+16,94,94),"cat");AnimalFace(new Rect(r.x+120,r.y+16,94,94),"rabbit");}
    else for(int k=0;k<4;k++)Round(new Rect(r.x+28+k%2*46,r.y+22+k/2*46,41,41),ColorOf(new[]{"red","blue","green","yellow"}[k]),7);
    Text(new Rect(r.x+22,r.y+135,r.width-44,42),GameName(gs[i]),28,ink,true);
    Text(new Rect(r.x+22,r.y+184,r.width-44,65),notes[i],20,muted);
    GUI.enabled=CanLead;if(Button(new Rect(r.x+18,r.yMax-62,r.width-36,46),"開始","game:"+gs[i],green,Color.white))Open(gs[i],0);GUI.enabled=true;
   }
   float bottom=headerExtra+(narrow?1040:710);
   Text(new Rect(24,bottom,viewWidth-48,110),"",20,muted);
   contentHeight=bottom+140;
  }
  void DrawGame(bool narrow){
   float boardY=DrawCompactHeader(narrow);
   var available=levels.Where(l=>l.game==game).ToArray();
   if(game=="sticker"){DrawStickerOverview(boardY,narrow,available.Length);return;}
   float column=narrow?viewWidth-48:(viewWidth-68)/2;
   float gridSize=game=="animal"?0:game=="sticker"?Mathf.Min(235,(column-54)/2):Mathf.Min(level.boards.Length==1?320:265,(column-45)/level.boards.Length-8);
   int flowColumns=Math.Max(1,Mathf.FloorToInt((column-28)/136));
   float flowExtra=(Mathf.Ceil(settings.Length/(float)flowColumns)-1)*82;
   float boardHeight=game=="animal"?1030:(game=="sticker"?606:300)+gridSize+flowExtra;
   Rect board=new Rect(24,boardY,column,boardHeight);stageScrollY=boardY+70;
   Rect config=new Rect(narrow?24:44+column,narrow?board.yMax+20:boardY,column,ChoiceHeight(column));
   Panel(board);
   if(game=="sticker")DrawSticker(board);else if(game=="animal")DrawAnimal(board);else DrawIce(board);
   Panel(config);Text(new Rect(config.x+16,config.y+12,config.width-32,50),ShortIdentity(),20,green,true);
   float cy=config.y+DrawChoiceControls(config)+12;
   float inner=config.width-30;
   if(CanLead){
   if(playing){
    GUI.enabled=CanLead;if(Button(new Rect(config.x+15,cy,inner*.70f-8,48),"停止","stop",green,Color.white))Stop();
    if(Button(new Rect(config.x+15+inner*.70f,cy,inner*.30f,48),paused?"繼續":"暫停","pause"))TogglePause();GUI.enabled=true;
   }else{
    GUI.enabled=CanLead&&Rules.Complete(level,settings);
    if(Button(new Rect(config.x+15,cy,inner*.76f-8,48),"▶ 播放","play",green,Color.white))Play();GUI.enabled=true;
    GUI.enabled=CanLead;if(Button(new Rect(config.x+15+inner*.76f,cy,inner*.24f,48),speed+"×","speed"))ChangeSpeed();GUI.enabled=true;
   }
   GUI.enabled=!playing&&CanLead;
   if(Button(new Rect(config.x+15,cy+60,130,44),"清空","clear"))ClearChoices();GUI.enabled=true;
   }
   Text(new Rect(config.x+15,cy+116,inner,58),ShortStatus(),18,muted);
   float bottom=Mathf.Max(board.yMax,config.yMax);
   if(result!=null){
    Rect rr=new Rect(config.x,config.yMax+16,config.width,244);Panel(rr,result.success?C("eaf3df"):C("fff0dd"));
    Text(new Rect(rr.x+16,rr.y+14,rr.width-32,65),result.success?"成功！":"再試試",24,ink,true);
    Text(new Rect(rr.x+16,rr.y+80,rr.width-32,97),"",18,ink);
    bool last=levelIndex==available.Length-1;
    GUI.enabled=CanLead;if(CanLead&&result.success&&Button(new Rect(rr.x+16,rr.yMax-58,rr.width-32,44),last?"回遊戲選單":"下一關 →","next")){if(!last)Open(game,levelIndex+1);else GoHome();}GUI.enabled=true;
    bottom=Mathf.Max(bottom,rr.yMax);
   }
   contentHeight=bottom+36;
  }
  float ChoiceRow(float width)=>level.twoColor?344:game=="animal"?154:level.options.Length>2&&width<520&&(game=="penguin"||level.options.Length==4)?154+OwnerExtra(width-130):110+OwnerExtra(width-130);
  float ChoiceHeight(float width)=>70+settings.Length*ChoiceRow(width)+190;
  float DrawChoiceControls(Rect r){
   float y=r.y+70,row=ChoiceRow(r.width);
   for(int i=0;i<settings.Length;i++){
    Rect rr=new Rect(r.x+14,y,r.width-28,row-10);StepPanel(rr,i);
    if(level.twoColor){DrawTwoColor(rr,i);y+=row;continue;}
    float left=rr.x+10;
    if(game=="sticker"){MiniMask(new Rect(left,rr.y+42,52,52),level.masks[i].cells,level.cols);left+=64;}
    float nameExtra=OwnerExtra(r.width-130);
    Rect heading=new Rect(left,rr.y+8,rr.xMax-left-58,32+nameExtra);
    ReadyBadge(new Rect(rr.xMax-44,rr.y+6,34,32),i);
    Text(heading,StepNumber(i)+" "+ShortOwner(i),20,ink,true);

    HitBox(heading,"role:"+i);if(!answerVisible&&CanChoose(i)&&GUI.Button(heading,"",GUIStyle.none))selected=i;
    int cols=level.options.Length>2&&r.width<520?2:level.options.Length;
    float width=(rr.xMax-left-4)/cols;
    for(int j=0;j<level.options.Length;j++){
     string op=level.options[j];bool chosen=settings[i]==op;GUI.enabled=CanChoose(i);
     Rect option=new Rect(left+j%cols*width,rr.y+44+nameExtra+j/cols*51,width-6,44);
     if(game=="penguin"){if(DirectionButton(option,op,$"choose:{i}:{op}",chosen))Set(i,op);}
     else if(Button(option,Rules.Label(op),$"choose:{i}:{op}",chosen?ColorOf(op):paper))Set(i,op);
     GUI.enabled=true;
    }
    y+=row;
   }
   return y-r.y;
  }
  float DrawHeroControls(Rect r){
   float width=(r.width-36)/4,y=r.y+92;
   for(int i=0;i<level.steps;i++){int group=Array.IndexOf(level.editable,i);string cmd=group>=0?settings[group]:level.program[i];Rect slot=new Rect(r.x+14+i%4*width,y+i/4*91,width-7,83);
    Color bg=currentStep==i&&playing?gold:group>=0?C("edf3e5"):C("eceee7");if(group>=0&&selected==group&&!playing)Panel(new Rect(slot.x-2,slot.y-2,slot.width+4,slot.height+4),green);Panel(slot,bg);
    Text(new Rect(slot.x+6,slot.y+4,slot.width-12,20),$"{i+1} · "+(group>=0?Rules.Groups[group]:"已排好"),11,muted);
    Text(new Rect(slot.x+4,slot.y+22,slot.width-8,35),Rules.Icon(cmd),26,ink,true,TextAnchor.MiddleCenter);
    Text(new Rect(slot.x+3,slot.y+60,slot.width-6,20),Rules.Label(cmd),12,ink,false,TextAnchor.MiddleCenter);
    if(group>=0){HitBox(slot,"slot:"+group);if(!playing&&GUI.Button(slot,"",GUIStyle.none))selected=group;}
   }
   y+=Mathf.Ceil(level.steps/4f)*91+12;
   Text(new Rect(r.x+15,y,r.width-30,27),"正在設定："+Rules.Groups[selected],15,ink,true);y+=35;
   for(int i=0;i<level.options.Length;i++){string c=level.options[i];GUI.enabled=!playing;if(Button(new Rect(r.x+14+i%4*width,y+i/4*61,width-7,52),Rules.Icon(c)+"\n"+Rules.Label(c),"command:"+c,c=="wait"?C("eeeeea"):c=="attack"||c=="take"?C("f8ecd2"):C("eef4e7")))Set(selected,c);GUI.enabled=true;}
   return y-r.y+Mathf.Ceil(level.options.Length/4f)*61;
  }
  void Round(Rect r,Color c,float radius=10){GUI.DrawTexture(r,Texture2D.whiteTexture,ScaleMode.StretchToFill,true,0,c,0,radius);}
  void Panel(Rect r,Color? bg=null){Round(r,line,12);Round(new Rect(r.x+1,r.y+1,r.width-2,r.height-2),bg??paper,11);}
  void Text(Rect r,string s,int size=18,Color? color=null,bool bold=false,TextAnchor anchor=TextAnchor.UpperLeft){labelStyle.fontSize=size;labelStyle.fontStyle=bold?FontStyle.Bold:FontStyle.Normal;labelStyle.alignment=anchor;labelStyle.normal.textColor=color??ink;GUI.Label(r,s??"",labelStyle);}
  bool Button(Rect r,string s,string id,Color? bg=null,Color? fg=null,bool preserveDisabledColor=false){bool enabled=GUI.enabled;GUI.enabled=enabled&&(!answerVisible||id=="answer-close");Round(r,GUI.enabled?(bg??C("eff0e7")):preserveDisabledColor?Color.Lerp(bg??paper,C("d8ddcf"),.55f):C("d8ddcf"),8);buttonStyle.normal.textColor=fg??ink;buttonStyle.fontSize=20;HitBox(r,id);bool clicked=GUI.Button(r,s,buttonStyle);GUI.enabled=enabled;return clicked;}
  void HitBox(Rect r,string id){hits.Add(new Hit{id=id,enabled=GUI.enabled,x=r.x*scale,y=(r.y-scroll.y)*scale,w=r.width*scale,h=r.height*scale});}
  void RotateLocal(float angle,Vector2 p){GUI.matrix=GUI.matrix*Matrix4x4.TRS(new Vector3(p.x,p.y,0),Quaternion.Euler(0,0,angle),Vector3.one)*Matrix4x4.Translate(new Vector3(-p.x,-p.y,0));}
  void Image(Rect r,string name,float alpha=1,float angle=0){if(!art.TryGetValue(name,out var t)||t==null)return;var m=GUI.matrix;var c=GUI.color;GUI.color=new Color(1,1,1,alpha);if(angle!=0)RotateLocal(angle,r.center);GUI.DrawTexture(r,t,ScaleMode.ScaleToFit);GUI.color=c;GUI.matrix=m;}
  Color ColorOf(string c){switch(c){case "red":return C("ed7064");case "blue":return C("6b9fdd");case "yellow":return C("f2c85b");case "green":return C("67b49b");default:return C("f4f5eb");}}
  [Serializable] class Hit {public string id;public float x,y,w,h;public bool enabled;}
  [Serializable] class Snapshot {public RoomSnapshot room;public string game,level,cue,detail,tone,role;public float textPixelSize;public int index,active,step,attempt,decisions;public bool playing,paused,finished,success,rotating;public float rotation;public string[] settings,board,animals;public Vector2[] animalPositions;public HeroState hero;public Cell[] fire;public Vector2 heroPosition,monsterPosition;public Vector2[] penguins;public Hit[] controls;}
  [DllImport("__Internal")] static extern void PuzzleSnapshot(string json);
  void Publish(){
   #if UNITY_WEBGL && !UNITY_EDITOR
   PuzzleSnapshot(JsonUtility.ToJson(new Snapshot{room=room,attempt=Rules.Attempt(selected),decisions=settings.Length,role=RoleIdentity(),textPixelSize=18*scale,game=game,level=level?.id,index=levelIndex,cue=cue,detail=detail,tone=tone,active=active,step=currentStep,playing=playing,paused=paused,finished=result!=null,success=result?.success??false,rotating=rotating,rotation=rotation,settings=settings,board=stickerBoard,animals=animalOrder,animalPositions=animalPositions,hero=hero,fire=fire,heroPosition=heroPosition,monsterPosition=monsterPosition,penguins=icePositions,controls=hits.ToArray()}));
   #endif
  }
 }
}
