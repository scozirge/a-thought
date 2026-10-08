using System;
using System.Linq;
using Together;
using UnityEngine;

public static class PuzzleRoomChecks {
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
  checks=0;var room=new RoomAuthority(Fixtures(),"ABC123","teacher","老師");
  Need(room.View("teacher").myGroup==3&&room.View("teacher").isHost,"老師固定第四組");
  Need(room.View("teacher").settings.Length==4&&room.View("teacher").game=="","初始四格及遊戲選單");
  Need(!room.View("unknown").connected&&room.View("unknown").myGroup==-1,"未知身分沒有席位");
  No(room,"stranger",Action(room,"open","sticker"),"未加入者不能操作");
  Need(room.TryJoin("a","甲",0,out _),"第一組加入");
  Need(room.TryJoin("b","乙",1,out _),"第二組加入");
  Need(room.TryJoin("c","丙",2,out _),"第三組加入");
  Need(!room.TryJoin("d","丁",0,out _),"每組僅一名身分");
  Need(!room.TryJoin("d","丁",3,out _),"學生不能佔老師組");
  Need(!room.TryJoin("d","丁",-1,out _),"無效組別拒絕");
  Need(room.TryJoin("a","甲重連",0,out _)&&room.View("a").members.Length==4,"同身分重連不新增席位");
  Need(!room.TryJoin("a","甲",1,out _),"重連不可偷換組");
  Need(room.View("a").myGroup==0&&!room.View("a").isHost,"每位收到自己的組別");
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
  Need(room.TryJoin("new-c","新同學",2,out _),"離線組別可補進");
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
  room.Remove("b");room.Remove("new-c");
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
  Need(!room.TryJoin("x","新同學",0,out _),"關房後不可加入");
  No(room,"teacher",Action(room,"open","sticker"),"關房後操作拒絕");
  Need(Rules.ColorParts("").Length==2&&Rules.ColorParts(null).Length==2,"空字串與 null 草稿都能開始選 A、B");
  Need(Rules.MayReveal(false,false,false),"單機老師可看答案");
  Need(Rules.MayReveal(false,true,true),"連線老師可看答案");
  Need(!Rules.MayReveal(false,true,false),"學生不可看答案");
  Need(!Rules.MayReveal(true,false,true),"連線過渡期間不可看答案");
  var book=JsonUtility.FromJson<LevelBook>(Resources.Load<TextAsset>("levels").text).levels;
  var dual=book.First(l=>l.twoColor);var classroom=new RoomAuthority(book,"123456","teacher","老師");
  Yes(classroom,"teacher",Action(classroom,"open","sticker",dual.index),"開啟雙色題");
  Need(classroom.TryJoin("pupil","同學",0,out _),"雙色題學生加入");
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
  Debug.Log("PUZZLE_ROOMS_OK "+checks+" authority checks (four groups, permissions, simultaneous answers, timing and reconnect)");
 }
}
