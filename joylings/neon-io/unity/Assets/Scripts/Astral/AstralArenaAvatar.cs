using Neon.Networking;
using Scoz.Func;
using UnityEngine;
using UnityEngine.UI;

namespace Neon.Astral
{
    // Render the actual three accessory sprites without spawning skills, cameras,
    // particle systems or a second networked character in the results screen.
    public sealed class AstralArenaAvatar : MonoBehaviour
    {
        static readonly System.Collections.Generic.Dictionary<int, Rect> visibleRects = new System.Collections.Generic.Dictionary<int, Rect>();
        static bool boundsLoaded;
        ArenaAppearance appearance;
        readonly AstralArenaSprite[] layers = new AstralArenaSprite[3];

        public void Show(ArenaAppearance value)
        {
            if (appearance.SameAs(value)) return;
            appearance = value;
            Sprite[] sprites = {
                Resolve(value.Back, null),
                Resolve(value.Body, FeatureData.DefaultBodySprite),
                Resolve(value.Head, FeatureData.DefaultHeadSprite)
            };
            int[] ids = { value.Back, value.Body, value.Head };
            Bounds bounds = default;
            bool hasBounds = false;
            for (int i = 0; i < sprites.Length; i++)
            {
                var sprite = sprites[i];
                if (!sprite) continue;
                var visible = VisibleBounds(ids[i], sprite);
                if (!hasBounds) { bounds = visible; hasBounds = true; }
                else bounds.Encapsulate(visible);
            }
            for (int i = 0; i < layers.Length; i++)
            {
                if (!layers[i])
                {
                    var rect = AstralWidgets.Rect(transform, new[] { "Back", "Body", "Head" }[i], 0, 0, 1, 1);
                    AstralWidgets.Stretch(rect);
                    layers[i] = rect.gameObject.AddComponent<AstralArenaSprite>();
                    layers[i].raycastTarget = false;
                }
                layers[i].Show(value.Captured ? sprites[i] : null, bounds);
            }
        }

        static Sprite Resolve(int id, Sprite fallback) => id != 0 &&
            GameDictionary.FeatureDic.TryGetValue(id, out var feature) && feature.IconSprite ? feature.IconSprite : fallback;

        static Bounds VisibleBounds(int id, Sprite sprite)
        {
            if (!boundsLoaded)
            {
                boundsLoaded = true;
                var data = Resources.Load<TextAsset>("Astral/icon-bounds");
                if (data)
                    foreach (var entry in JsonUtility.FromJson<AstralIcons.Catalog>(data.text).icons)
                        visibleRects[entry.id] = entry.rect;
            }
            if (!visibleRects.TryGetValue(id, out var rect)) return sprite.bounds;
            var textureSize = new Vector2(sprite.texture.width, sprite.texture.height);
            var min = (Vector2.Scale(rect.min, textureSize) - sprite.rect.position - sprite.pivot) / sprite.pixelsPerUnit;
            var max = (Vector2.Scale(rect.max, textureSize) - sprite.rect.position - sprite.pivot) / sprite.pixelsPerUnit;
            return new Bounds((min + max) * .5f, max - min);
        }
    }

    // Shared bounds preserve the original sprite pivots and relative sizes. Cropping
    // each accessory into a separate icon would detach heads, bodies and wings.
    [RequireComponent(typeof(CanvasRenderer))]
    public sealed class AstralArenaSprite : MaskableGraphic
    {
        Sprite sprite;
        Bounds bounds;
        public override Texture mainTexture => sprite ? sprite.texture : Texture2D.whiteTexture;
        public void Show(Sprite value, Bounds sharedBounds)
        {
            sprite = value; bounds = sharedBounds; SetAllDirty();
        }
        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            if (!sprite) return;
            var rect = rectTransform.rect;
            float scale = Mathf.Min(rect.width / Mathf.Max(.001f, bounds.size.x), rect.height / Mathf.Max(.001f, bounds.size.y));
            var vertices = sprite.vertices;
            var uv = sprite.uv;
            var triangles = sprite.triangles;
            for (int i = 0; i < vertices.Length; i++)
                vh.AddVert(rect.center + (vertices[i] - (Vector2)bounds.center) * scale, color, uv[i]);
            for (int i = 0; i < triangles.Length; i += 3)
                vh.AddTriangle(triangles[i], triangles[i + 1], triangles[i + 2]);
        }
    }
}
