using UnityEngine;
using UnityEngine.UI;

namespace Neon.Astral
{
    // One lossless atlas keeps small symbols sharp and shares a texture across UI draws.
    // Cells follow design/icons-v2/icons.json: four columns, two rows, 256 px each.
    public static class AstralSymbols
    {
        static Texture2D atlas;
        static bool loaded;
        public static Texture2D Atlas
        {
            get
            {
                if (!loaded)
                {
                    loaded = true;
                    atlas = Resources.Load<Texture2D>("Astral/Symbols/Atlas");
                    if (!atlas) Debug.LogError("Missing Astral UI symbol atlas.");
                }
                return atlas;
            }
        }
        static int Index(AstralGraphic.Shape shape)
        {
            switch (shape)
            {
                case AstralGraphic.Shape.Infinity: return 0;
                case AstralGraphic.Shape.Duel: return 1;
                case AstralGraphic.Shape.Collection: return 2;
                case AstralGraphic.Shape.Gear: return 3;
                case AstralGraphic.Shape.Book: return 4;
                case AstralGraphic.Shape.Exit: return 5;
                case AstralGraphic.Shape.Back: return 6;
                case AstralGraphic.Shape.Currency: return 7;
                default: return -1;
            }
        }
        public static bool IsSymbol(AstralGraphic.Shape shape) => Index(shape) >= 0;
        public static void Populate(VertexHelper vertices, Rect rect, AstralGraphic.Shape shape, Color color)
        {
            int index = Index(shape);
            if (index < 0 || !Atlas) return;
            float half = Mathf.Min(rect.width, rect.height) * .5f;
            Vector2 center = rect.center;
            float u = index % 4 * .25f, v = .5f - index / 4 * .5f;
            vertices.AddVert(center + new Vector2(-half, -half), color, new Vector2(u, v));
            vertices.AddVert(center + new Vector2(-half, half), color, new Vector2(u, v + .5f));
            vertices.AddVert(center + new Vector2(half, half), color, new Vector2(u + .25f, v + .5f));
            vertices.AddVert(center + new Vector2(half, -half), color, new Vector2(u + .25f, v));
            vertices.AddTriangle(0, 1, 2);
            vertices.AddTriangle(0, 2, 3);
        }
    }
}
