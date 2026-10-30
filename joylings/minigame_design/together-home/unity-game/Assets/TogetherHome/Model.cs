using System;
using System.Linq;
namespace CatDog {
 [Serializable] public class Thing {
  public double x,y,w,h,r,speed,range,phase,top,bottom,min,max;
  public int? owner,mode,openAfterKey; public bool crateOnly,ceiling; public int dir,number;
  public int[] keyIndices; public Thing[] pads,buttons,controls;
  public Thing Copy(){return (Thing)MemberwiseClone();}
 }
 [Serializable] public class Body {
  public double x,y,w=38,h=44,vy,vx; public bool grounded,exited,heavy;
  public int support=-1,onBox=-1; public int[] gateSides=Array.Empty<int>();
  public Body Copy(){var b=(Body)MemberwiseClone();b.gateSides=(int[])gateSides.Clone();return b;}
 }
 [Serializable] public class Balance {public Thing a,b;public double[] initial;public double speed,top,bottom;public int lockKey;}
 [Serializable] public class World {public double width,top,bottom,left;}
 [Serializable] public class Level {
  public int id,mode;public string name,saveKey,hint,puzzle;public string[] solution;
  public double[] starts,startFloors; public Thing door;public World world;
  public Thing[] platforms=Array.Empty<Thing>(),gates=Array.Empty<Thing>(),keys=Array.Empty<Thing>(),lifts=Array.Empty<Thing>(),switches=Array.Empty<Thing>(),movers=Array.Empty<Thing>(),rafts=Array.Empty<Thing>(),iceZones=Array.Empty<Thing>(),floor,ceilingPieces;
  public Body[] boxes=Array.Empty<Body>();public Balance[] balances=Array.Empty<Balance>();public int[][] linkedBoxes;
  public bool tutorial,ice,jumpSwap,gravityFlip,phaseOnJump;public double helpRange,tether,ceiling;
  public double? fallY,fallTop,cameraTop,viewHeight;
 }
 [Serializable] public class State {
  public int level,mode;public Body[] players,boxes;public double[] lifts,rafts;public double[][] balances;
  public int[] gravity;public int?[] collectedBy;public bool[] collected,latched,switches;
  public bool key,won,failed,lostCargo;public int? fallen;public double clock,flash;
  public State Copy(){var n=(State)MemberwiseClone();n.players=players.Select(p=>p.Copy()).ToArray();n.boxes=boxes.Select(p=>p.Copy()).ToArray();n.lifts=(double[])lifts.Clone();n.rafts=(double[])rafts.Clone();n.balances=balances.Select(a=>(double[])a.Clone()).ToArray();n.gravity=(int[])gravity.Clone();n.collected=(bool[])collected.Clone();n.collectedBy=(int?[])collectedBy.Clone();n.latched=(bool[])latched.Clone();n.switches=(bool[])switches.Clone();return n;}
 }
 [Serializable] public class Tape {public int frames;public int[][] actions;}
 public struct Command {public int axis;public bool jump,special;}
 public sealed class Keys {
  int held,jumps,flips;
  public void Set(int mask){int pressed=mask&~held;held=mask&255;jumps|=pressed&68;flips|=pressed&136;}
  public Command[] Read(){var result=new Command[2];for(int i=0;i<2;i++){int shift=i*4;result[i]=new Command{axis=((held&(2<<shift))!=0?1:0)-((held&(1<<shift))!=0?1:0),jump=(jumps&(4<<shift))!=0,special=(flips&(8<<shift))!=0};}return result;}
  public void Consume(){jumps=flips=0;} public void Clear(){held=jumps=flips=0;}
 }
}
