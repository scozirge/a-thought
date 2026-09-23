using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.InputSystem;

namespace RivalsPrototype {
  public static class DuelWebInput {
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern float RivalsLookX();
    [DllImport("__Internal")] static extern float RivalsLookY();
    [DllImport("__Internal")] static extern int RivalsCanvasFocused();
    [DllImport("__Internal")] static extern void RivalsLookEnabled(int enabled);
    [DllImport("__Internal")] static extern void RivalsResumeLook();
    [DllImport("__Internal")] static extern void RivalsReleaseLook();
    public static bool Focused=>RivalsCanvasFocused()!=0;
    public static bool HasControl=>Focused;
    public static Vector2 ReadDelta()=>new Vector2(RivalsLookX(),RivalsLookY());
    public static void SetActive(bool active)=>RivalsLookEnabled(active?1:0);
    public static void Resume()=>RivalsResumeLook();
    public static void Release()=>RivalsReleaseLook();
#else
    public static bool Focused=>false;
    public static bool HasControl=>Cursor.lockState==CursorLockMode.Locked;
    public static Vector2 ReadDelta()=>Mouse.current==null?Vector2.zero:Mouse.current.delta.ReadValue();
    public static void SetActive(bool active){}
    public static void Resume(){Cursor.lockState=CursorLockMode.Locked;Cursor.visible=false;}
    public static void Release(){Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}
#endif
    public static Vector2 Rotate(Vector2 look,Vector2 delta,float sensitivity) {
      return new Vector2(Mathf.Repeat(look.x+delta.x*sensitivity,360),Mathf.Clamp(look.y-delta.y*sensitivity,-85,85));
    }
  }
}
