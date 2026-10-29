using UnityEngine;

namespace Starbro.NeonIO
{
    public static class CursorMovement
    {
        // Distances are expressed at a 1080-pixel viewport height, matching game scale.
        public static float SpeedScale(float screenDistance, float viewportHeight, float stopRadius, float fullSpeedRadius)
        {
            float distance = screenDistance * 1080f / Mathf.Max(1, viewportHeight);
            float fraction = Mathf.InverseLerp(stopRadius, Mathf.Max(stopRadius + 1, fullSpeedRadius), distance);
            return Mathf.SmoothStep(0, 1, fraction);
        }
        public static Vector2 ScreenOrigin(Camera camera, Vector3 rolePosition)
            => camera ? (Vector2)camera.WorldToScreenPoint(rolePosition) : new Vector2(Screen.width * .5f, Screen.height * .5f);
    }
}
