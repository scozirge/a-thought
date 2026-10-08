using System;
using System.Collections;
using System.Linq;
using UnityEngine;

namespace Together {
 public partial class PuzzleParty {
  IEnumerator Animate(float seconds,Action<float> tick=null){float t=0;while(t<seconds){if(!paused){t+=Time.unscaledDeltaTime*speed;tick?.Invoke(Mathf.Clamp01(t/seconds));}yield return null;}}
  IEnumerator Playback(Result plan){
   foreach(var f in plan.frames){
    if(game=="sticker"){
     if(f.type=="stamp"){active=f.machine;Cue("第 "+(active+1)+" 張 · "+Rules.Group(active),"貼上"+Rules.Label(settings[active])+"色，後貼蓋前貼。","hero");yield return Animate(.3f);stickerBoard=f.board;yield return Animate(.6f);}
     else{active=-1;rotating=true;Cue("系統：整張作品向右轉一次","第 "+f.after+" 張貼完 → 轉 90 度 → 再繼續下一組。","portal");yield return Animate(1.05f,p=>rotation=90*p);stickerBoard=f.board;rotation=0;yield return Animate(.35f);rotating=false;}
    }else if(game=="animal"){
     active=f.index;
     string movement=f.command=="swap"?AnimalName(f.before[0])+"和"+AnimalName(f.before[1])+"交換。":AnimalName(f.before[0])+"走到隊伍最後。";
     Cue(Rules.Groups[active]+" · "+AnimalAction(f.command),movement+"做完再輪到下一組。","hero");yield return Animate(.32f);
     yield return Animate(1.05f,p=>{
      foreach(string id in level.lineup){
       int from=Array.IndexOf(f.before,id),to=Array.IndexOf(f.board,id),actor=Array.IndexOf(level.lineup,id);
       float y=f.command=="cycle"?(from==0?-54*Mathf.Sin(p*Mathf.PI):0):from<2?(from==0?-32:24)*Mathf.Sin(p*Mathf.PI):0;
       animalPositions[actor]=new Vector2(Mathf.Lerp(from,to,p),y);
      }
     });
     animalOrder=f.board;yield return Animate(.3f);
    }else if(game=="penguin"){
     active=f.index;Cue("第 "+(f.index+1)+" 步 · "+Rules.Group(f.index),"一起"+Rules.Label(f.command)+"滑，碰冰塊或邊界才停。","hero");float max=Math.Max(1,f.distances.Max());
     yield return Animate(.18f+.11f*max,p=>{for(int i=0;i<icePositions.Length;i++)icePositions[i]=Vector2.Lerp(f.from[i].Vec(),f.positions[i].Vec(),f.distances[i]==0?0:Mathf.Min(1,p*max/f.distances[i]));});
     for(int i=0;i<icePositions.Length;i++)icePositions[i]=f.positions[i].Vec();
     Cue("第 "+(f.index+1)+" 次滑行結束",string.Join("；",f.distances.Select((d,i)=>(i==0?"小紅":"小藍")+(d==0?"被擋住，留在原地":"滑了 "+d+" 格"))),"safe");yield return Animate(.26f);
    }else{
     currentStep=f.index;active=Array.IndexOf(level.editable,f.index);fire=new Cell[0];breath=null;charge=0;
     Cue("第 "+(f.index+1)+" 步 · 勇者"+Rules.Label(f.command),"勇者先做動作，接著才輪到怪物。","hero");Vector2 from=heroPosition,to=f.action.position.Vec();
     if(f.entrance.HasValue){int a=Array.FindIndex(level.portals,p=>p.Equals(f.entrance.Value));string entry=a==0?"A 門":"B 門",exit=a==0?"B 門":"A 門";portalPhase=entry;
      Cue("勇者進入 "+entry,entry+" → "+exit+"，這一步只傳送一次。","portal");yield return Animate(.42f,p=>heroPosition=Vector2.Lerp(from,f.entrance.Value.Vec(),p));yield return Animate(.25f,p=>heroAlpha=1-p);
      heroPosition=to;portalPhase=exit;Cue("勇者從 "+exit+" 出來","現在的位置是 "+exit+"，接著才執行下一步。","portal");yield return Animate(.4f,p=>heroAlpha=p);yield return Animate(.2f);portalPhase="";
     }else yield return Animate(.5f,p=>heroPosition=Vector2.Lerp(from,to,Mathf.Min(1,p/0.75f)));
     bool attacked=!hero.defeated&&f.action.defeated;hero=f.action;heroPosition=hero.position.Vec();heroAlpha=1;
     if(attacked){Cue("攻擊成功！"+(level.Dragon?"火龍":"怪物")+"被擊退","出口打開，後續怪物行動會被阻止。","safe");yield return Animate(.55f);}
     foreach(var e in f.effects){
      eventStates[e.after]="正在執行";
      if(e.kind=="move"){
       Cue("第 "+e.after+" 步後 · "+(level.Dragon?"火龍":"怪物")+Rules.Label(e.direction)+"移動","移到藍圈標示的那一格。","move");yield return Animate(.6f,p=>monsterPosition=Vector2.Lerp(e.from.Vec(),e.to.Vec(),p));monsterPosition=e.to.Vec();hero.monster=e.to;
      }else if(e.kind=="fire"){
       facing=e.direction;Cue("火龍蓄力！準備"+Rules.Label(e.direction)+"噴火","第 "+e.after+" 步後 · 橘框是這次會燒到的格子。","fire");yield return Animate(.5f,p=>charge=p);
       charge=0;fire=e.cells;breath=e;Cue("火龍"+Rules.Label(e.direction)+"噴火！",e.hit?"勇者站在火焰裡，這一步失敗了。":"勇者在安全位置，等火熄滅再繼續。","fire");yield return Animate(1.05f,p=>breathProgress=p);breath=null;
       if(!e.hit){fire=new Cell[0];Cue("火熄滅了","這次噴火結束，接著執行下一步。","safe");yield return Animate(.38f);}
      }else{Cue("已阻止！火龍不會再噴火","勇者先攻擊成功，第 "+e.after+" 步後的怪物行動取消。","safe");yield return Animate(.8f);}
      eventStates[e.after]=e.kind=="cancel"?"已阻止":"已執行";
     }
     hero=f.hero;heroPosition=hero.position.Vec();monsterPosition=hero.monster.Vec();log.Add("第 "+(f.index+1)+" 步："+f.message);
    }
   }
   active=-1;if(game=="animal"){Cue("四步完成 · 一起拍照！","喀嚓！現在來比對目標照片。","safe");yield return Animate(.42f,p=>cameraFlash=Mathf.Sin(p*Mathf.PI));cameraFlash=0;}
   active=-1;rotating=false;result=plan;playing=false;paused=false;
   if(plan.success){PlayerPrefs.SetInt("done:"+level.id,1);PlayerPrefs.Save();Cue("計畫成功！",game=="hero"?"拿到寶劍、擊退怪物，也走到了出口。":game=="sticker"?"每一格都與目標相同！":game=="animal"?"喀嚓！所有動物都和目標照片站在同樣的位置！":settings.Length+" 步結束，全部企鵝都停在家裡！","safe");}
   else Cue(game=="hero"?"第 "+(currentStep+1)+" 步出了問題":"再看一次結果",game=="hero"?plan.frames.Last().message:game=="sticker"?"驚嘆號是與目標不同的格子。設定保留，改一組再試試。":game=="animal"?"驚嘆號的位置和目標不同。設定保留，改一組再試試。":"還有企鵝沒回家。設定保留，改一組再試試。","fire");
  }
 }
}
