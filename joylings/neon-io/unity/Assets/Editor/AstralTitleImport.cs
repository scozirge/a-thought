using UnityEditor;
using UnityEngine;

namespace Neon.Editor
{
    public sealed class AstralTitleImport : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            bool symbol = assetPath.StartsWith("Assets/Resources/Astral/Symbols/");
            if (!symbol && !assetPath.StartsWith("Assets/Resources/Astral/Titles/")) return;
            var importer = (TextureImporter)assetImporter;
            importer.textureType = symbol ? TextureImporterType.Default : TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            importer.spritePixelsPerUnit = 100;
            importer.alphaIsTransparency = true;
            importer.mipmapEnabled = false;
            importer.maxTextureSize = symbol ? 1024 : 4096;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.filterMode = FilterMode.Bilinear;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.npotScale = TextureImporterNPOTScale.None;
        }
    }
}
