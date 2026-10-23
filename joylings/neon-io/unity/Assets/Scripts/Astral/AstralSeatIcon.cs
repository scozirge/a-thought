using UnityEngine;
using UnityEngine.UI;

namespace Neon.Astral
{
    // A small planar ranger: faceted head, broad shoulders and a split-leg silhouette.
    // Outline and solid states share exactly the same contour, at any display density.
    public sealed class AstralSeatIcon : MaskableGraphic
    {
        static readonly Vector2[] Head = { new Vector2(-.10f,.25f), new Vector2(-.13f,.32f), new Vector2(-.10f,.43f), new Vector2(0,.46f), new Vector2(.10f,.43f), new Vector2(.13f,.32f), new Vector2(.10f,.25f) };
        static readonly Vector2[] Body = { new Vector2(-.12f,.17f), new Vector2(.12f,.17f), new Vector2(.27f,.09f), new Vector2(.34f,-.11f), new Vector2(.27f,-.15f), new Vector2(.16f,.01f), new Vector2(.13f,-.13f), new Vector2(.19f,-.42f), new Vector2(.09f,-.46f), new Vector2(0,-.23f), new Vector2(-.09f,-.46f), new Vector2(-.19f,-.42f), new Vector2(-.13f,-.13f), new Vector2(-.16f,.01f), new Vector2(-.27f,-.15f), new Vector2(-.34f,-.11f), new Vector2(-.27f,.09f) };
        // Triangulated around the torso, with separate limbs so concave gaps remain empty.
        static readonly int[] BodyTriangles = { 0,1,6, 0,6,12, 6,9,12, 1,2,5, 2,3,4, 2,4,5, 1,5,6, 0,12,13, 0,13,16, 16,13,14, 16,14,15, 6,7,8, 6,8,9, 12,9,10, 12,10,11 };
        bool filled;
        public bool Filled { get => filled; set { if (filled == value) return; filled = value; SetVerticesDirty(); } }
        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear(); var r = rectTransform.rect; float size = Mathf.Min(r.height, r.width / .78f);
            Vector2 P(Vector2 p) => r.center + p * size;
            var ink = AstralWidgets.Gold; ink.a = filled ? .95f : .36f;
            if (filled)
            {
                for (int i = 1; i < Head.Length - 1; i++) Triangle(vh,P(Head[0]),P(Head[i]),P(Head[i+1]),ink);
                for (int i = 0; i < BodyTriangles.Length; i += 3) Triangle(vh,P(Body[BodyTriangles[i]]),P(Body[BodyTriangles[i+1]]),P(Body[BodyTriangles[i+2]]),ink);
            }
            float width = Mathf.Clamp(size * .022f, 1, 1.8f);
            foreach (var contour in new[] { Head, Body })
                for (int i = 0; i < contour.Length; i++) Line(vh,P(contour[i]),P(contour[(i+1)%contour.Length]),width,ink);
        }
        static void Triangle(VertexHelper vh, Vector2 a, Vector2 b, Vector2 c, Color ink)
        { int n=vh.currentVertCount;vh.AddVert(a,ink,Vector2.zero);vh.AddVert(b,ink,Vector2.zero);vh.AddVert(c,ink,Vector2.zero);vh.AddTriangle(n,n+1,n+2); }
        static void Line(VertexHelper vh, Vector2 a, Vector2 b, float width, Color ink)
        {
            Vector2 d=(b-a).normalized, normal=new Vector2(-d.y,d.x)*width*.5f;
            Triangle(vh,a-normal,b-normal,b+normal,ink);Triangle(vh,a-normal,b+normal,a+normal,ink);
        }
    }
}
