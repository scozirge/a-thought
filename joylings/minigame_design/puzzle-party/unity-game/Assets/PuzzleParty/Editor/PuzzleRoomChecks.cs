using System;
using System.Linq;
using System.Reflection;
using Together;
using UnityEngine;

public static class PuzzleRoomChecks {
 sealed class FirstOrderRandom:System.Random {public override int Next(int maxValue)=>0;}
 static int checks;
 static void Need(bool condition,string message){checks++;if(!condition)throw new Exception("連線房間驗證失敗："+message);}
 static Level[] Fixtures() {
  var sticker=new Level{game="sticker",index=0,id="room-sticker",cols=2,rows=2,options=new[]{"red","blue"},target=new[]{"red","blue","blue","red"},masks=Enumerable.Range(0,4).Select(i=>new Mask{cells=new[]{i}}).ToArray()};
  var penguin=new Level{game="penguin",index=0,id="room-penguin",steps=4,options=new[]{"right","down","left","up"},boards=new[]{
   new IceBoard{size=3,start=new Cell(1,1),goal=new Cell(0,0),walls=new Cell[0]},
   new IceBoard{size=3,start=new Cell(0,1),goal=new Cell(0,0),walls=new Cell[0]}
  }};
  var bad=new Level{game="penguin",index=1,steps=8,options=penguin.options,boards=penguin.boards};
  return new[]{sticker,penguin,bad};
 }
 static RoomAction Action(RoomAuthority room,string type,string game=null,int index=0,int slot=0,string value=null,float speed=1,string playerId=null) {
  return new RoomAction{type=type,roundId=room.View("teacher").roundId,game=game,index=index,slot=slot,value=value,speed=speed,playerId=playerId};
 }
 static void Yes(RoomAuthority room,string sender,RoomAction action,string message) {
  bool accepted=room.Apply(sender,action,out string error);Need(accepted,message+" "+error);
 }
 static void No(RoomAuthority room,string sender,RoomAction action,string message) {
  int revision=room.View("teacher").revision;
  bool accepted=room.Apply(sender,action,out string error);Need(!accepted&&!string.IsNullOrEmpty(error),message);Need(room.View("teacher").revision==revision,message+" 不可改變房間");
 }
 static void Fill(RoomAuthority room,string[] values) {
  for(int i=0;i<4;i++)Yes(room,"teacher",Action(room,"set",slot:i,value:values[i]),"老師可代答所有組別");
 }

 public static void Check() {
  checks=0;CheckTutorial();var room=new RoomAuthority(Fixtures(),"ABC123","teacher","老師",new FirstOrderRandom());
  Need(room.View("teacher").myGroup==3&&room.View("teacher").isHost,"老師固定第四組");
  Need(room.View("teacher").settings.Length==4&&room.View("teacher").game=="","初始四格及遊戲選單");
  Need(!room.View("unknown").connected&&room.View("unknown").myGroup==-1,"未知身分沒有席位");
  Need(room.View("teacher").slotNames.All(n=>n=="老師"),"單獨開房四步都顯示房主取的名稱");
  Need(room.View("teacher").ready.All(v=>!v),"尚未作答均顯示未選");
  No(room,"stranger",Action(room,"open","sticker"),"未加入者不能操作");
  Need(!room.TryJoin("blank"," \n\t",out _),"空白名稱不能占用席位");
  Need(room.View("teacher").members.Length==1,"空白加入不影響加入順序");
  bool blankHostRejected=false;try{new RoomAuthority(Fixtures(),"123456","teacher","  ");}catch(ArgumentException){blankHostRejected=true;}
  Need(blankHostRejected,"老師也必須輸入組別名稱");
  Need(RoomAuthority.TeamLabel(room.View("teacher").members[0])=="老師","老師小隊顯示名稱");
  Need(room.TryJoin("a","甲",out _),"第一組加入");
  Need(room.TryJoin("b","乙",out _),"第二組加入");
  Need(room.TryJoin("c","丙",out _),"第三組加入");
  Need(!room.TryJoin("d","丁",out _),"每組僅一名身分");
  Need(room.View("b").myGroup==1&&room.View("c").myGroup==2,"依成功加入順序分配第二、三組");
  Need(room.TryJoin("a","甲重連",out _)&&room.View("a").members.Length==4,"同身分重連不新增席位");
  Need(room.TryJoin("a","甲",out _)&&room.View("a").myGroup==0,"同身分重複加入不更換組別");
  Need(room.View("a").myGroup==0&&!room.View("a").isHost,"每位收到自己的組別");
  Need(RoomAuthority.TeamLabel(room.View("a").members[0])=="甲","學生小隊顯示名稱");
  No(room,"a",Action(room,"open","sticker"),"只有老師可選關");
  No(room,"teacher",Action(room,"open","hero"),"舊遊戲不能進入連線");
  No(room,"teacher",Action(room,"open","penguin",1),"八次作答舊題不能進入");
  No(room,"teacher",Action(room,"open","sticker",99),"不存在的關卡拒絕");
  Yes(room,"teacher",Action(room,"open","sticker"),"老師開題");
  int round=room.View("teacher").roundId;
  var first=Action(room,"set",slot:0,value:"red");var second=Action(room,"set",slot:1,value:"blue");
  Yes(room,"a",first,"第一組獨立作答");Yes(room,"b",second,"另一組相同 round 並行作答不衝突");
  Need(room.View("a").settings[0]=="red"&&room.View("a").settings[1]=="blue","同步作答都保留");
  No(room,"a",Action(room,"set",slot:1,value:"red"),"不可修改別組");
  No(room,"a",Action(room,"set",slot:4,value:"red"),"沒有第五個作答位置");
  No(room,"a",Action(room,"set",slot:0,value:"unknown"),"不接受自造選項");
  No(room,"a",Action(room,"play"),"學生不能播放");
  No(room,"teacher",Action(room,"play"),"尚未填滿四組不能播放");
  Yes(room,"c",Action(room,"set",slot:2,value:"blue"),"第三組作答");
  Yes(room,"teacher",Action(room,"set",slot:3,value:"red"),"老師組作答");
  var leak=room.View("teacher");leak.settings[0]="blue";leak.members[0].group=3;
  Need(room.View("teacher").settings[0]=="red"&&room.View("a").myGroup==0,"快照不可回寫權威狀態");
  Yes(room,"teacher",Action(room,"play"),"四組完成才開始");
  Need(room.View("a").phase=="playing"&&!room.View("a").success&&room.View("a").durationMs==3600,"播放前不公布結果，貼紙每步 900ms");
  No(room,"a",Action(room,"set",slot:0,value:"blue"),"播放中鎖住作答");
  No(room,"teacher",Action(room,"play"),"重複播放請求不重啟");
  room.Advance(700);Need(room.View("b").elapsedMs==700,"權威時間推進");
  Yes(room,"teacher",Action(room,"pause"),"老師暫停");room.Advance(1000);
  Need(room.View("c").paused&&room.View("c").elapsedMs==700,"所有人共用暫停時間");
  room.Remove("c");Need(room.View("teacher").settings[2]=="blue","離線不刪答案");
  Need(room.TryJoin("new-c","新同學",out _),"離線組別可補進");
  Need(room.View("new-c").paused&&room.View("new-c").elapsedMs==700,"晚加入接收完整播放快照");
  Yes(room,"teacher",Action(room,"speed",speed:2),"老師選兩倍速");
  No(room,"teacher",Action(room,"speed",speed:float.NaN),"速度拒絕非數值");
  No(room,"teacher",Action(room,"speed",speed:3),"速度限制 1 或 2 倍");
  Yes(room,"teacher",Action(room,"resume"),"老師續播");room.Advance(1000);
  Need(room.View("a").elapsedMs==2700&&!room.View("a").success,"兩倍速且播完才公告");
  room.Advance(449);Need(room.View("a").phase=="playing","最後一刻仍在播放");
  room.Advance(1);Need(room.View("a").phase=="result"&&room.View("a").success&&room.View("a").elapsedMs==3600,"完整播完才公布成功");
  Yes(room,"teacher",Action(room,"set",slot:0,value:"blue"),"結果後改一組");
  Need(room.View("a").phase=="planning"&&!room.View("a").success&&room.View("a").settings[1]=="blue","修改只清結果並保留其他組");
  Yes(room,"teacher",Action(room,"play"),"錯誤選擇也能播放");room.Advance(99999);
  Need(room.View("a").phase=="result"&&!room.View("a").success,"失敗到結束才顯示");
  var stale=Action(room,"set",slot:0,value:"red");var saved=(string[])room.View("teacher").settings.Clone();
  Yes(room,"teacher",Action(room,"stop"),"停止播放");
  Need(room.View("teacher").settings.SequenceEqual(saved)&&room.View("teacher").roundId>round,"停止保留全部設定並換 round");
  No(room,"a",stale,"前一 round 的操作不能套入");
  Yes(room,"teacher",Action(room,"remove",playerId:"a"),"老師移除組別");
  Need(!room.View("a").connected&&room.View("teacher").settings[0]=="blue","移除後答案仍可代填");
  No(room,"a",Action(room,"set",slot:0,value:"red"),"被移除身分不能再操作");
  No(room,"teacher",Action(room,"remove",playerId:"teacher"),"不能誤移除自己");
  Yes(room,"teacher",Action(room,"clear"),"清空全部作答");
  Need(room.View("teacher").settings.All(s=>s==null)&&room.View("teacher").settings.Length==4,"清空仍有固定四組");
  Need(room.TryJoin("replacement","新甲",out _)&&room.View("replacement").myGroup==0,"補入最前空席，其他組不重新編號");
  Need(room.View("b").myGroup==1&&room.View("new-c").myGroup==2,"補位不改其他組號");
  room.Remove("replacement");room.Remove("b");room.Remove("new-c");
  Fill(room,new[]{"red","blue","blue","red"});Yes(room,"teacher",Action(room,"play"),"不足三組時老師能獨自開播");
  int previousRun=room.View("teacher").runId;
  Yes(room,"teacher",Action(room,"stop"),"播放中停止");
  Yes(room,"teacher",Action(room,"play"),"停止後重播");Need(room.View("teacher").runId==previousRun+1,"每次播放有新 runId");
  Yes(room,"teacher",Action(room,"open","penguin"),"切換企鵝題");
  Fill(room,new[]{"right","down","left","up"});Yes(room,"teacher",Action(room,"play"),"企鵝播放");
  Need(Math.Abs(room.View("teacher").durationMs-2530)<0.01f,"企鵝計時與 Unity 動畫一致");
  room.Advance(float.NaN);room.Advance(-100);room.Advance(float.PositiveInfinity);
  Need(room.View("teacher").elapsedMs==0,"非正常 delta 不破壞時鐘");
  room.Advance(1265);Need(room.View("teacher").success,"企鵝兩倍速結束判定");
  Yes(room,"teacher",Action(room,"home"),"老師返回遊戲選單");
  Need(room.View("teacher").game==""&&room.View("teacher").phase=="planning","所有人同步選單");
  room.Remove("teacher");Need(!room.View("teacher").connected,"老師離開即關房");
  Need(!room.TryJoin("x","新同學",out _),"關房後不可加入");
  No(room,"teacher",Action(room,"open","sticker"),"關房後操作拒絕");
  Need(Rules.ColorParts("").Length==2&&Rules.ColorParts(null).Length==2,"空字串與 null 草稿都能開始選 A、B");
  Need(Rules.MayReveal(false,false,false),"單機老師可看答案");
  Need(Rules.MayReveal(false,true,true),"連線老師可看答案");
  Need(!Rules.MayReveal(false,true,false),"學生不可看答案");
  Need(!Rules.MayReveal(true,false,true),"連線過渡期間不可看答案");
  var book=JsonUtility.FromJson<LevelBook>(Resources.Load<TextAsset>("levels").text).levels;
  var dual=book.First(l=>l.twoColor);var classroom=new RoomAuthority(book,"123456","teacher","老師");
  Need(classroom.TryJoin("pupil","同學",out _),"雙色題學生加入");
  Yes(classroom,"teacher",Action(classroom,"open","sticker",dual.index),"開啟雙色題");
  Yes(classroom,"pupil",Action(classroom,"set",slot:0,value:"red|"),"只填 A 區可暫存");
  Need(classroom.View("teacher").settings[0]=="red|","部分選色同步給老師");
  No(classroom,"teacher",Action(classroom,"play"),"缺 B 區不可播放");
  No(classroom,"pupil",Action(classroom,"set",slot:1,value:"red|blue"),"雙色題仍只能填自己組別");
  No(classroom,"pupil",Action(classroom,"set",slot:0,value:"red|bogus"),"拒絕不存在的顏色");
  No(classroom,"pupil",Action(classroom,"answer"),"答案不是學生可要求的房間操作");
  var solved=Rules.Solve(dual);Need(solved!=null&&Rules.Run(dual,solved).success,"雙色答案可通關");
  Fill(classroom,solved);Yes(classroom,"teacher",Action(classroom,"play"),"完整八色才開播");
  classroom.Advance(99999);Need(classroom.View("pupil").success,"雙色通關一致");
  Yes(classroom,"teacher",Action(classroom,"clear"),"雙色清空");
  Need(classroom.View("teacher").settings.All(string.IsNullOrEmpty),"A、B 同時清空");
  foreach(var l in book)Need(Rules.Run(l,Rules.Solve(l)).success,"老師答案通關："+l.id);
  foreach(string g in new[]{"sticker","penguin"})for(int count=0;count<=3;count++){
   var allocation=new RoomAuthority(Fixtures(),"123456","teacher","老師");
   for(int i=0;i<count;i++)Need(allocation.TryJoin("s"+i,"同學"+i,out _),"加入開題人數");
   Yes(allocation,"teacher",Action(allocation,"open",g),"依人數開題："+g);
   Need(allocation.View("teacher").slotGroups.Take(count).OrderBy(i=>i).SequenceEqual(Enumerable.Range(0,count))&&allocation.View("teacher").slotGroups.Skip(count).All(i=>i==3),"學生隨機在前、老師包辦後段");
   for(int i=0;i<count;i++)Need(allocation.View("s"+i).mySlot>=0&&allocation.View("s"+i).mySlot<count,"學生取得前段作答位置");
   if(count<3){
    Need(allocation.TryJoin("late","晚到",out _),"途中加入");
    Need(allocation.View("late").mySlot==-1,"途中加入等下題");
    No(allocation,"late",Action(allocation,"set",slot:count,value:"red"),"晚到不可拿老師步驟");
    Yes(allocation,"teacher",Action(allocation,"clear"),"清空不重新分工");
    Need(allocation.View("late").mySlot==-1,"清空維持分工");
    Yes(allocation,"teacher",Action(allocation,"open",g),"下題重算人數");
    Need(allocation.View("late").mySlot>=0&&allocation.View("late").mySlot<=count,"晚到在下題取得學生步驟");
   }
  }
  var gaps=new RoomAuthority(Fixtures(),"123456","teacher","老師",new FirstOrderRandom());
  gaps.TryJoin("first","甲",out _);gaps.TryJoin("second","乙",out _);
  Yes(gaps,"teacher",Action(gaps,"open","sticker"),"兩組開題");
  gaps.Remove("first");Need(gaps.View("second").mySlot==1&&gaps.View("teacher").slotGroups[0]==3,"離場原位交老師，不移動他人");
  Yes(gaps,"teacher",Action(gaps,"open","penguin"),"有空組時開下一題");
  Need(gaps.View("second").myGroup==1&&gaps.View("second").mySlot==0,"保留小隊身分，但學生步驟向前排列");
  Yes(gaps,"second",Action(gaps,"set",slot:0,value:"right"),"權限依步驟分配而非組號");
  No(gaps,"second",Action(gaps,"set",slot:1,value:"right"),"原組號不再是可修改步驟");
  var sync=new RoomAuthority(Fixtures(),"123456","teacher","大象");
  Need(sync.TryJoin("student","小兔",out _),"同步測試學生加入");
  Yes(sync,"teacher",Action(sync,"open","sticker"),"同步貼紙開題");
  Need(sync.View("student").slotNames.SequenceEqual(new[]{"小兔","大象","大象","大象"}),"每步顯示真實名稱，不附加老師");
  Fill(sync,new[]{"red","blue","blue","red"});
  Need(sync.View("student").ready.All(v=>v),"學生看見四步全選好");
  Yes(sync,"teacher",Action(sync,"clear"),"同步清空");
  No(sync,"teacher",Action(sync,"play"),"缺一人未選不得播放");
  Yes(sync,"teacher",Action(sync,"open","penguin"),"同步切企鵝");
  Need(sync.View("student").game=="penguin"&&sync.View("student").index==0&&sync.View("student").ready.All(v=>!v),"學生跟隨遊戲、關卡與清空狀態");
  Need(sync.TryJoin("late","小貓",out _),"晚加入學生");
  Need(sync.View("late").game=="penguin"&&sync.View("late").mySlot==-1,"晚加入也顯示老師當題");
  No(sync,"student",Action(sync,"remove",playerId:"late"),"學生不能踢人");
  Yes(sync,"teacher",Action(sync,"remove",playerId:"student"),"老師踢出學生");
  Need(!sync.View("student").connected&&sync.View("teacher").slotNames[0]=="大象","被踢者失去房間，空步驟交房主");
  CheckHomeScroll();
  CheckRandomAssignments(book);
  CheckRapidChoices();
  Debug.Log("PUZZLE_ROOMS_OK "+checks+" authority checks (four groups, permissions, simultaneous answers, timing and reconnect)");
 }
 static void CheckRapidChoices(){
  RoomSnapshot State(int ack=0,int round=8,int slot=1,string value=null,string phase="planning")=>new RoomSnapshot{connected=true,roundId=round,mySlot=slot,ackSequence=ack,phase=phase,settings=new[]{(string)null,value,null,null}};
  var draft=new ClientChoiceDraft();var first=State();
  draft.Remember(1,new RoomAction{type="set",roundId=8,slot=1,value="red|"},first);draft.Apply(first);
  Need(first.settings[1]=="red|","學生第一次選色立即保留");
  var colors=Rules.ColorParts(first.settings[1]);colors[1]="blue";
  draft.Remember(2,new RoomAction{type="set",roundId=8,slot=1,value=string.Join("|",colors)},first);
  var stale=State();draft.Apply(stale);Need(stale.settings[1]=="red|blue","快速選 A、B 不被舊廣播蓋掉");
  var ackFirst=State(1,value:"red|");draft.Apply(ackFirst);Need(ackFirst.settings[1]=="red|blue","第一筆回覆仍保留第二筆選色");
  var ackLatest=State(2,value:"red|blue");draft.Apply(ackLatest);Need(ackLatest.settings[1]=="red|blue","最新回覆完成確認");
  var teacher=State(2,value:"blue|red");draft.Apply(teacher);Need(teacher.settings[1]=="blue|red","確認後老師代填正常同步");
  draft.Remember(3,new RoomAction{type="set",roundId=8,slot=1,value="blue|blue"},teacher);
  var rejected=State(3,value:"blue|red");rejected.error="拒絕";draft.Apply(rejected);Need(rejected.settings[1]=="blue|red","拒絕回覆撤回未確認草稿");
  draft.Remember(4,new RoomAction{type="set",roundId=8,slot=1,value="red|red"},teacher);
  var next=State(round:9);draft.Apply(next);Need(next.settings.All(v=>v==null),"換題不帶入未確認選色");
  draft.Remember(5,new RoomAction{type="set",roundId=8,slot=0,value="red|red"},teacher);
  var other=State();draft.Apply(other);Need(other.settings.All(v=>v==null),"別人的步驟不可產生本機假選擇");
  draft.Remember(6,new RoomAction{type="set",roundId=8,slot=1,value="red|red"},teacher);
  var playing=State(value:"blue|red",phase:"playing");draft.Apply(playing);Need(playing.settings[1]=="blue|red"&&playing.phase=="playing","播放採用老師已確認答案");
 }
 static void CheckRandomAssignments(Level[] book){
  var firstOrders=new System.Collections.Generic.HashSet<string>();
  for(int seed=0;seed<12;seed++){
   var randomRoom=new RoomAuthority(book,"123456","teacher","老師",new System.Random(seed));
   for(int i=0;i<3;i++)randomRoom.TryJoin("s"+i,"同學"+i,out _);
   Yes(randomRoom,"teacher",Action(randomRoom,"open","sticker"),"隨機初次開題");
   firstOrders.Add(string.Join(",",randomRoom.View("teacher").slotGroups));
  }
  Need(firstOrders.Count>1,"首次分工不固定依加入順序");
  for(int count=0;count<=3;count++){
   var randomRoom=new RoomAuthority(book,"123456","teacher","老師",new System.Random(40+count));
   for(int i=0;i<count;i++)randomRoom.TryJoin("s"+i,"同學"+i,out _);
   int[] previous=null;
   foreach(var l in book){
    var stale=Action(randomRoom,"set",slot:0,value:l.options[0]);
    Yes(randomRoom,"teacher",Action(randomRoom,"open",l.game,l.index),"隨機切關／切遊戲："+l.id);
    var host=randomRoom.View("teacher");var assigned=Enumerable.Range(0,count).Select(i=>randomRoom.View("s"+i).mySlot).ToArray();
    Need(host.settings.All(v=>v==null),"每次開題清空上一題的選擇");
    Need(assigned.OrderBy(i=>i).SequenceEqual(Enumerable.Range(0,count))&&host.slotGroups.Skip(count).All(g=>g==3),"每位學生恰有一步，老師固定後段");
    if(count>1&&previous!=null)Need(assigned.Where((slot,i)=>slot==previous[i]).Count()==0,"重新開題後每位學生都換步驟");
    previous=assigned;
    No(randomRoom,"teacher",stale,"前題延遲封包不能污染新題");
    for(int i=0;i<count;i++){
     string id="s"+i;var student=randomRoom.View(id);
     Need(student.game==l.game&&student.index==l.index&&student.roundId==host.roundId&&student.settings.SequenceEqual(randomRoom.View("teacher").settings),"每位學生同步遊戲、關卡與目前選擇");
     for(int slot=0;slot<4;slot++){
      var action=Action(randomRoom,"set",slot:slot,value:l.options[0]);action.group=3;action.playerId="teacher";
      if(slot==student.mySlot)Yes(randomRoom,id,action,"本人作答有效");
      else No(randomRoom,id,action,"學生不能冒用老師或改其他人的步驟");
     }
     foreach(string command in new[]{"open","home","play","clear","stop","speed","remove","answer"})
      No(randomRoom,id,Action(randomRoom,command,l.game,l.index,playerId:"teacher"),"學生不能操作老師控制："+command);
    }
    foreach(string id in Enumerable.Range(0,count).Select(i=>"s"+i))Need(randomRoom.View(id).settings.SequenceEqual(randomRoom.View("teacher").settings),"所有學生都能看到相同的全部選擇");
    No(randomRoom,"teacher",Action(randomRoom,"play"),"老師未完成後段前禁止播放");
    var owners=(int[])randomRoom.View("teacher").slotGroups.Clone();
    Yes(randomRoom,"teacher",Action(randomRoom,"clear"),"清空不抽籤");
    Need(randomRoom.View("teacher").slotGroups.SequenceEqual(owners),"清空保持分工");
    Fill(randomRoom,Rules.Solve(l));Yes(randomRoom,"teacher",Action(randomRoom,"play"),"所有題目多人完成可播放");
    randomRoom.Advance(99999);
    Need(randomRoom.View("teacher").success&&Enumerable.Range(0,count).All(i=>randomRoom.View("s"+i).success),"全部玩家同步成功結果");
    Yes(randomRoom,"teacher",Action(randomRoom,"stop"),"停止不抽籤");
    Need(randomRoom.View("teacher").slotGroups.SequenceEqual(owners),"停止保持分工");
   }
  }
 }
 static void CheckTutorial(){
  var room=new RoomAuthority(Fixtures(),"TEACH","teacher","老師");room.TryJoin("student","小兔",out _);
  foreach(string game in new[]{"sticker","penguin"}){
   Yes(room,"teacher",Action(room,"open",game),"開啟教學對應遊戲");
   Yes(room,"student",Action(room,"set",slot:0,value:game=="sticker"?"red":"right"),"教學前設定");
   var before=room.View("student");
   for(int page=0;page<3;page++){
    Yes(room,"teacher",Action(room,"tutorial",game,page),"老師翻教學");
    var now=room.View("student");Need(now.tutorialGame==game&&now.tutorialPage==page,"學生同步教學遊戲與頁碼");
    Need(now.roundId==before.roundId&&now.mySlot==before.mySlot&&now.settings.SequenceEqual(before.settings),"教學不更動分工與答案");
    No(room,"student",Action(room,"tutorial",game,2),"學生不能翻頁");
    No(room,"student",Action(room,"tutorial-close"),"學生不能關閉教學");
    No(room,"student",Action(room,"set",slot:0,value:game=="sticker"?"blue":"down"),"教學擋住背景作答");
    No(room,"teacher",Action(room,"play"),"教學期間不能播放");
   }
   Need(room.TryJoin("late","晚加入",out _),"教學中可加入");Need(room.View("late").tutorialPage==2&&room.View("late").tutorialGame==game,"晚加入跟隨目前教學");room.Remove("late");
   No(room,"teacher",Action(room,"tutorial",game,3),"拒絕不存在的教學頁");
   Yes(room,"teacher",Action(room,"tutorial-close"),"老師關閉教學");
   Need(room.View("student").tutorialGame==""&&room.View("student").settings.SequenceEqual(before.settings),"全房關閉並保留答案");
  }
  Yes(room,"teacher",Action(room,"tutorial","sticker"),"選單前開教學");Yes(room,"teacher",Action(room,"home"),"回選單");Need(room.View("student").tutorialGame=="","回選單清除教學");
  Yes(room,"teacher",Action(room,"tutorial","penguin"),"從遊戲選單看教學");Yes(room,"teacher",Action(room,"open","sticker"),"換遊戲");Need(room.View("student").tutorialGame=="","換遊戲清除教學");
  Fill(room,new[]{"red","blue","blue","red"});Yes(room,"teacher",Action(room,"play"),"開始播放");No(room,"teacher",Action(room,"tutorial","sticker"),"播放中不可開教學");
 }
 static void CheckHomeScroll(){
  // Reproduce returning from level 20: the lobby snapshot has index 0 while the local level index is 19.
  var go=new GameObject("Scroll regression");go.SetActive(false);
  try{
   var ui=go.AddComponent<PuzzleParty>();var flags=BindingFlags.Instance|BindingFlags.NonPublic;
   var type=typeof(PuzzleParty);var offset=type.GetField("scroll",flags);
   type.GetField("levelIndex",flags).SetValue(ui,19);
   type.GetField("game",flags).SetValue(ui,"sticker");
   var apply=type.GetMethod("ApplyRoom",flags);
   var authority=new RoomAuthority(Fixtures(),"123456","teacher","老師");
   offset.SetValue(ui,new Vector2(0,120));apply.Invoke(ui,new object[]{authority.View("teacher")});
   Need(((Vector2)offset.GetValue(ui)).y==0,"回選單時重設一次捲動位置");
   offset.SetValue(ui,new Vector2(0,120));
   for(int i=0;i<5;i++)apply.Invoke(ui,new object[]{authority.View("teacher")});
   Need(((Vector2)offset.GetValue(ui)).y==120,"重複大廳快照不得將捲動位置彈回頂端");
   authority.TryJoin("student","小兔",out _);apply.Invoke(ui,new object[]{authority.View("teacher")});
   Need(((Vector2)offset.GetValue(ui)).y==120,"成員加入不得重設大廳捲動位置");
  }finally{UnityEngine.Object.DestroyImmediate(go);}
 }
}
