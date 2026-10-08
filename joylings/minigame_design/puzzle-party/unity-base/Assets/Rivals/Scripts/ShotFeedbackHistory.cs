namespace RivalsPrototype {
  // Local-only history: never roll back already played sound, recoil or tracers.
  public sealed class ShotFeedbackHistory {
    int life=-1,firePress=-1,fireShots,altPress=-1,altShots;
    public bool TryPresent(int spawn,int press,bool secondary,int ordinal) {
      if(spawn<life||ordinal<=0)return false;
      if(spawn>life){life=spawn;firePress=altPress=-1;fireShots=altShots=0;}
      if(secondary)return Advance(ref altPress,ref altShots,press,ordinal);
      return Advance(ref firePress,ref fireShots,press,ordinal);
    }
    static bool Advance(ref int lastPress,ref int lastShot,int press,int ordinal) {
      if(press<lastPress)return false;
      if(press>lastPress){lastPress=press;lastShot=0;}
      if(ordinal<=lastShot)return false;
      lastShot=ordinal;return true;
    }
  }
}
