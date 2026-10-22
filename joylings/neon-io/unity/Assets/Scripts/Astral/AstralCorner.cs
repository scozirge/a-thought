using UnityEngine;

namespace Neon.Astral
{
    // HUD stays at the safe viewport edges on 4:3, 16:10 and ultrawide screens,
    // while menus and modals retain their readable, uniformly scaled layout.
    [DefaultExecutionOrder(500)]
    public sealed class AstralCorner : MonoBehaviour
    {
        public RectTransform safe;
        public Vector2 corner, inset;
        void LateUpdate()
        {
            if(!safe)return;
            var r=(RectTransform)transform;
            var point=new Vector3(Mathf.Lerp(safe.rect.xMin,safe.rect.xMax,corner.x),Mathf.Lerp(safe.rect.yMin,safe.rect.yMax,corner.y));
            var local=r.parent.InverseTransformPoint(safe.TransformPoint(point));
            r.anchoredPosition=(Vector2)local+new Vector2((.5f-corner.x)*(r.rect.width+2*inset.x),(.5f-corner.y)*(r.rect.height+2*inset.y));
        }
    }
}
