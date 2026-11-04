using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;

namespace ShapeStudio {
    public sealed class Studio : MonoBehaviour {
        public const int RoundMs=180000;
        const int CollectMs=3500;
        [Serializable] class InputPoint {public int x,y;public string op,tool;}
        [Serializable] class View {
            public string phase,original; public bool connected,busy,host,canPick,done,markPending;
            public int round,seconds,me,identity,winner; public Portrait[] people;
        }
        class Seat {
            public int peer; public string token,ink; public int id,avatar,revision,playedRound;
            public bool online,drawn,done;
            public Portrait Public(bool reveal,int round) => new Portrait{id=id,avatar=avatar,online=online,done=done,
                revision=reveal?revision:0,drawn=reveal&&drawn,participating=round>0&&playedRound==round};
            public SeatCopy Copy() => new SeatCopy{peer=peer,id=id,token=token,ink=ink,avatar=avatar,
                revision=revision,playedRound=playedRound,online=online,drawn=drawn,done=done};
        }
        static readonly string[] Names={"貓貓怪","大狗狗","胖企鵝","小狐狸","圓河豚","熊熊糖","小章魚","兔耳朵","刺刺蝟","慢烏龜","花花鹿","松鼠球","水獺獺","粉紅豬","蹦蹦蛙","獅子王","小鯨魚","啾啾鳥","考拉寶","虎斑班"};
        readonly List<Seat> seats=new List<Seat>();
        readonly Dictionary<int,int> receivedArt=new Dictionary<int,int>();
        StudioLink link; readonly Sheet board=new Sheet(), model=new Sheet();
        Texture2D texture; Color32[] pixels;
        string phase="home",token,original="";
        int round,deadline,card=-1,winner=-1,me,identity,nextId,stamp,lastState,localVersion;
        int lastSecond=-1;float nextSend,nextRequest,nextHello;bool dirty,finalSent,wasPickable;
        int pendingMark;bool done,resync;
        Portrait[] people=Array.Empty<Portrait>();
        [DllImport("__Internal")] static extern void StudioView(string json);
        [DllImport("__Internal")] static extern void StudioNotice(string text);
        [DllImport("__Internal")] static extern void StudioPicture(int round,int id,int revision,string ink);
        static void Notice(string text){
            #if UNITY_WEBGL && !UNITY_EDITOR
            StudioNotice(text);
            #else
            Debug.Log(text);
            #endif
        }
        void Awake() {
            Application.runInBackground=true;Application.targetFrameRate=30;
            identity=UnityEngine.Random.Range(0,Names.Length);token=Guid.NewGuid().ToString("N");
            texture=new Texture2D(Sheet.Size,Sheet.Size,TextureFormat.RGBA32,false);texture.filterMode=FilterMode.Bilinear;
            pixels=new Color32[Sheet.Size*Sheet.Size];
            link=gameObject.AddComponent<StudioLink>();
            link.Changed+=Publish;link.Opened+=Opened;link.Received+=Receive;link.Departed+=Departed;link.Closed+=Offline;
            link.SaveRoom+=SaveRoom;link.Promoted+=BecomeTeacher;
            link.TeacherChanged+=()=>{lastState=0;resync=me>0;Hello();};
        }
        void Start(){Publish();}
        public void SetToken(string value){if(!link.Connected && Guid.TryParseExact(value,"N",out var unused))token=value;}
        public void Reroll(){if(link.Connected||link.Busy)return;identity=(identity+UnityEngine.Random.Range(1,Names.Length))%Names.Length;Notice("你是"+Names[identity]);Publish();}
        public void HostRoom(){link.Connect(true);}
        public void JoinRoom(){link.Connect(false);}
        public async void Leave(){
            if(!link.Connected)return;
            if(link.Host)link.Broadcast(new Wire{type="closed"});
            await link.Close("");
        }
        void Offline(string notice){
            seats.Clear();people=Array.Empty<Portrait>();phase="home";round=0;card=-1;winner=-1;me=0;
            nextId=0;stamp=lastState=0;original="";ResetPaper();
            if(!string.IsNullOrEmpty(notice))Notice(notice);Publish();
        }
        void Opened(){
            phase=link.WantsHost?"handoff":"joining";Publish();
        }
        Wire SaveRoom()=>new Wire{type="handoff",phase=phase,round=round,card=card,deadline=deadline,
            winner=winner,stamp=stamp,seq=nextId,seats=seats.Select(s=>s.Copy()).ToArray()};
        void BecomeTeacher(Wire saved){
            if(saved==null){phase="wait";Notice("教室開好了");Sync();return;}
            phase=saved.phase;round=saved.round;card=saved.card;deadline=saved.deadline;
            winner=saved.winner;nextId=saved.seq;stamp=saved.stamp;seats.Clear();
            foreach(var s in saved.seats??Array.Empty<SeatCopy>()){
                seats.Add(new Seat{peer=s.peer,id=s.id,token=s.token,ink=s.ink,
                    avatar=s.avatar,revision=s.revision,playedRound=s.playedRound,
                    online=s.online&&link.Present(s.peer),drawn=s.drawn,done=s.done});
            }
            ResetPaper();
            if(card>=0){Deck.Draw(card,model);original=phase=="reveal"?model.Pack():"";}
            Notice("你已接手出題");Sync();
            if(phase=="reveal")foreach(var s in seats.Where(s=>s.drawn))ShowWork(s.id,s.revision,s.ink);
        }
        void Hello(){link.Send(default,new Wire{type="hello",token=token,avatar=identity});nextHello=Time.unscaledTime+2;}
        public void NextRound() {
            if(!link.Connected||!link.Host || !(phase=="wait" || CanPick()&&(winner>=0 || !seats.Any(s=>s.drawn))))return;
            seats.RemoveAll(s=>!s.online);round++;phase="draw";winner=-1;card=Deck.Next();original="";
            foreach(var s in seats){s.drawn=s.done=false;s.ink=null;s.revision=0;s.playedRound=round;}
            ResetPaper();Deck.Draw(card,model);deadline=unchecked(link.Now+RoundMs);Sync();
        }
        public void Choose(string idText){
            if(!link.Host || !CanPick() || !int.TryParse(idText,out int id) || !seats.Any(s=>s.id==id&&s.drawn))return;
            winner=id;Sync();
        }
        int TimeLeft() => unchecked(deadline-link.Now);
        bool CanPick() => phase=="reveal" && TimeLeft()<=-CollectMs;
        bool InDrawingRound() => link.Connected && !link.Host && phase=="draw" && me>0 && TimeLeft()>0;
        bool CanDraw() => InDrawingRound() && !done && pendingMark==0;
        public void ToggleDone(){
            if(!InDrawingRound() || pendingMark!=0)return;
            board.End();done=!done;SendMark();Publish();
        }
        void SendMark(){
            pendingMark=++localVersion;
            link.Send(default,new Wire{type="mark",round=round,seq=pendingMark,ink=board.Pack(),done=done});
            dirty=false;
        }
        public void EndRound(){
            if(!link.Connected || !link.Host || phase!="draw")return;
            deadline=link.Now;Reveal();
        }
        public void Pointer(string json) {
            if(!CanDraw())return;
            var p=JsonUtility.FromJson<InputPoint>(json);if(p==null)return;
            int x=Mathf.Clamp(p.x,0,255),y=Mathf.Clamp(p.y,0,255);
            switch(p.op){
                case "down":board.Begin(p.tool=="oval"||p.tool=="box"||p.tool=="tri"?p.tool:"pen",x,y);break;
                case "move":if(!board.Down)return;board.Move(x,y);break;
                case "up":if(!board.Down)return;board.Move(x,y);board.End();break;
                default:return;
            }
            dirty=true;
        }
        public void EndStroke(){if(CanDraw())board.End();}
        public void Undo(){if(CanDraw() && board.Undo())dirty=true;}
        void Update(){
            if(!link.Connected)return;
            if(!link.Host && phase=="joining" && Time.unscaledTime>=nextHello)Hello();
            if(phase=="draw"){
                if(TimeLeft()<=0){
                    if(link.Host)Reveal();else FinishInk();
                } else if(!link.Host && dirty && Time.unscaledTime>=nextSend)SendInk(false);
            }
            if(phase=="reveal"){
                if(link.Host && wasPickable!=CanPick()){wasPickable=CanPick();Publish();}
                if(!link.Host && Time.unscaledTime>=nextRequest){
                    foreach(var p in people)if(p.drawn && (!receivedArt.TryGetValue(p.id,out int rev)||rev<p.revision))
                        link.Send(default,new Wire{type="get",round=round,member=p.id});
                    nextRequest=Time.unscaledTime+2;
                }
            }
            int seconds=Seconds();if(seconds!=lastSecond){lastSecond=seconds;Publish();}
        }
        int Seconds()=>phase=="draw"?Math.Min(180,(int)Math.Ceiling(Math.Max(0,TimeLeft())/1000.0)):0;
        void ResetPaper(){board.Reset();receivedArt.Clear();localVersion=pendingMark=0;done=dirty=finalSent=wasPickable=false;nextRequest=nextSend=0;}
        void FinishInk(){if(finalSent || me==0)return;board.End();if(!done && pendingMark==0 && (dirty||localVersion>0))SendInk(true);finalSent=true;Publish();}
        void SendInk(bool final){
            link.Send(default,new Wire{type="ink",round=round,seq=++localVersion,ink=board.Pack(),final=final});
            dirty=false;nextSend=Time.unscaledTime+0.65f;
        }
        void Reveal(){
            phase="reveal";original=model.Pack();Sync();
            foreach(var seat in seats.Where(s=>s.drawn))ShowWork(seat.id,seat.revision,seat.ink);
        }
        void Receive(int sender,Wire m) {
            if(link.Host){HostReceive(sender,m);return;}
            switch(m.type){
                case "state":ApplyState(m);break;
                case "full":_ = link.Close("師傅已額滿，請稍後再加入。");break;
                case "closed":_ = link.Close("房主已關房。");break;
                case "art":
                    if(phase=="reveal" && m.round==round && people.Any(p=>p.id==m.member) && Sheet.Unpack(m.ink)!=null)
                        ShowWork(m.member,m.seq,m.ink);
                    break;
            }
        }
        void HostReceive(int sender,Wire m) {
            if(m.type=="hello"){Register(sender,m);return;}
            var seat=seats.Find(s=>s.online && s.peer==sender);
            if(seat==null || m.round!=round)return;
            if(m.type=="get" && phase=="reveal"){
                var art=seats.Find(s=>s.id==m.member && s.drawn);
                if(art!=null)link.Send(sender,new Wire{type="art",round=round,member=art.id,seq=art.revision,ink=art.ink});
            }
            bool mark=m.type=="mark";
            if((!mark && m.type!="ink") || (phase!="draw" && phase!="reveal") || TimeLeft()<-CollectMs
                || seat.playedRound!=round || m.seq<=seat.revision)return;
            if(seat.done && !mark)return;
            // A locked sheet can only be unlocked. Ignore replacement ink in that request.
            if(!seat.done){
                var bits=Sheet.Unpack(m.ink);if(bits==null)return;
                seat.ink=m.ink;seat.drawn=Array.Exists(bits,b=>b!=0);
            }
            seat.revision=m.seq;if(mark)seat.done=m.done;
            if(mark || phase=="reveal")Sync();
            if(phase=="reveal" && seat.drawn)ShowWork(seat.id,seat.revision,seat.ink);
        }
        void Register(int sender,Wire m){
            if(!Guid.TryParseExact(m.token,"N",out var unused))return;
            var seat=seats.Find(s=>s.online && s.peer==sender);
            if(seat!=null){StateTo(seat,true);return;}
            seat=seats.Find(s=>!s.online && s.token==m.token);
            var taken=new HashSet<int>(seats.Where(s=>s.online).Select(s=>s.avatar));
            if(seat==null) {
                seat=new Seat{id=++nextId,token=m.token,avatar=Mathf.Clamp(m.avatar,0,19)};
            }
            if(taken.Contains(seat.avatar)){
                var choices=Enumerable.Range(0,20).Where(i=>!taken.Contains(i)).ToArray();
                if(choices.Length==0){link.Send(sender,new Wire{type="full"});return;}
                seat.avatar=choices[UnityEngine.Random.Range(0,choices.Length)];
            }
            if(!seats.Contains(seat))seats.Add(seat);
            seat.peer=sender;seat.online=true;if(phase=="draw")seat.playedRound=round;
            Notice(Names[seat.avatar]+"加入了");Sync(seat);
        }
        void Departed(int player){
            var s=seats.Find(n=>n.online && n.peer==player);if(s==null)return;
            s.online=false;Notice(Names[s.avatar]+"離開了");
            Sync();
        }
        Portrait[] Roster()=>seats.Select(s=>s.Public(phase=="reveal",round)).ToArray();
        void StateTo(Seat s,bool restore){
            link.Send(s.peer,new Wire{type="state",phase=phase,round=round,deadline=deadline,member=s.id,avatar=s.avatar,
                winner=winner,card=phase=="reveal"?card:-1,people=people,stamp=++stamp,final=restore,
                seq=s.revision,done=s.done,ink=restore?s.ink:null});
        }
        void Sync(Seat restoring=null){
            people=Roster();foreach(var s in seats.Where(n=>n.online))StateTo(s,s==restoring);Publish();
        }
        void ApplyState(Wire m){
            if(m.stamp<=lastState || (resync&&!m.final))return;
            bool first=me==0;var priorPeople=people;
            if(phase=="draw" && m.round==round && m.phase=="reveal")FinishInk();
            if(round!=m.round){ResetPaper();original="";card=-1;}
            round=m.round;phase=m.phase;me=m.member;identity=m.avatar;winner=m.winner;deadline=m.deadline;lastState=m.stamp;
            people=m.people??Array.Empty<Portrait>();
            if(m.final && m.seq>=localVersion && m.ink!=null && phase=="draw"){
                var bits=Sheet.Unpack(m.ink);if(bits!=null){board.Reset(bits);localVersion=m.seq;}
            }
            if(resync && m.final && phase=="draw" && (dirty||localVersion>m.seq)){
                if(pendingMark!=0 || done!=m.done)SendMark();else if(!done)SendInk(false);
            }
            if(m.final)resync=false;
            if(m.seq>=pendingMark){pendingMark=0;done=m.done;}
            if(phase=="reveal" && card!=m.card){card=m.card;Deck.Draw(card,model);original=model.Pack();}
            if(first)Notice("你是"+Names[identity]+"，已加入");
            else foreach(var p in people){
                bool wasOnline=priorPeople.Any(a=>a.id==p.id&&a.online);
                if(p.online&&!wasOnline)Notice(Names[p.avatar]+"加入了");
                if(!p.online&&wasOnline)Notice(Names[p.avatar]+"離開了");
            }
            nextRequest=0;Publish();
        }
        void ShowWork(int id,int revision,string ink){
            if(receivedArt.TryGetValue(id,out int old) && old>=revision)return;
            receivedArt[id]=revision;
            #if UNITY_WEBGL && !UNITY_EDITOR
            StudioPicture(round,id,revision,ink);
            #endif
        }
        void Publish(){
            if(link==null)return;
            var v=new View{phase=phase,connected=link.Connected,busy=link.Busy,host=link.Host,round=round,
                seconds=Seconds(),identity=identity,me=me,winner=winner,people=people,canPick=CanPick(),
                done=done,markPending=pendingMark!=0,original=phase=="reveal"?original:""};
            #if UNITY_WEBGL && !UNITY_EDITOR
            StudioView(JsonUtility.ToJson(v));
            #endif
        }
        void OnGUI(){
            if(phase!="draw" || Event.current.type!=EventType.Repaint)return;
            var s=link.Host?model:board;
            if(s.Dirty)s.Paint(texture,pixels);
            GUI.DrawTexture(new Rect(0,0,Screen.width,Screen.height),texture,ScaleMode.StretchToFill,false);
        }
    }
}
