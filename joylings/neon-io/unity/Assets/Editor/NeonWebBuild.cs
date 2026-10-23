using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Neon.Editor
{
    public static class NeonWebBuild
    {
        public static void Build()
        {
            NeonBuild.Prepare();
            NeonBuild.Validate();
            int textures = 0, audio = 0;
            foreach (string guid in AssetDatabase.FindAssets("t:Texture2D", new[] { "Assets/Resources" }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                var importer = AssetImporter.GetAtPath(path) as TextureImporter;
                if (importer == null) continue; // Keep the original PSB rig and slice data.
                var web = importer.GetPlatformTextureSettings("WebGL");
                // Thin lettering needs lossless alpha and full source resolution.
                if(path.StartsWith("Assets/Resources/Astral/Titles/")||path.StartsWith("Assets/Resources/Astral/Symbols/"))
                {
                    int uiSize=path.StartsWith("Assets/Resources/Astral/Symbols/")?1024:4096;
                    if(web.overridden&&web.maxTextureSize==uiSize&&web.format==TextureImporterFormat.RGBA32&&!web.crunchedCompression)continue;
                    web.name="WebGL";web.overridden=true;web.maxTextureSize=uiSize;
                    web.format=TextureImporterFormat.RGBA32;web.textureCompression=TextureImporterCompression.Uncompressed;web.crunchedCompression=false;
                    importer.SetPlatformTextureSettings(web);importer.SaveAndReimport();continue;
                }
                int size = path.Contains("/Textures") ? 512 : 1024;
                textures++;
                if (web.overridden && web.maxTextureSize == size && web.format == TextureImporterFormat.Automatic
                    && web.textureCompression == TextureImporterCompression.CompressedHQ && web.compressionQuality == 80 && web.crunchedCompression) continue;
                web.name = "WebGL"; web.overridden = true;
                web.maxTextureSize = size;
                web.format = TextureImporterFormat.Automatic;
                web.textureCompression = TextureImporterCompression.CompressedHQ;
                web.compressionQuality = 80;
                web.crunchedCompression = true;
                importer.SetPlatformTextureSettings(web);
                importer.SaveAndReimport();
            }
            foreach (string guid in AssetDatabase.FindAssets("t:AudioClip", new[] { "Assets/Resources" }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                var importer = AssetImporter.GetAtPath(path) as AudioImporter;
                if (importer == null) continue;
                bool music = path.Contains("/Music/");
                var web = importer.GetOverrideSampleSettings("WebGL");
                audio++;
                if (importer.ContainsSampleSettingsOverride("WebGL") && web.compressionFormat == AudioCompressionFormat.AAC
                    && Mathf.Approximately(web.quality, music ? .45f : .5f) && web.sampleRateSetting == AudioSampleRateSetting.OverrideSampleRate
                    && web.sampleRateOverride == (music ? 44100u : 22050u) && web.loadType == AudioClipLoadType.DecompressOnLoad) continue;
                web.compressionFormat = AudioCompressionFormat.AAC;
                web.quality = music ? .45f : .5f;
                web.sampleRateSetting = AudioSampleRateSetting.OverrideSampleRate;
                web.sampleRateOverride = music ? 44100u : 22050u;
                // Decode before play so original intro / explosion timing remains precise.
                web.loadType = AudioClipLoadType.DecompressOnLoad;
                importer.SetOverrideSampleSettings("WebGL", web);
                importer.SaveAndReimport();
            }
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.WebGL, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, ManagedStrippingLevel.Minimal);
            var defines = PlayerSettings.GetScriptingDefineSymbols(NamedBuildTarget.WebGL).Split(';')
                .Where(s => !s.StartsWith("PUN_") && s != "PHOTON_UNITY_NETWORKING").Concat(new[] { "FUSION_WEAVER" });
            PlayerSettings.SetScriptingDefineSymbols(NamedBuildTarget.WebGL, string.Join(";", defines.Distinct()));
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true; // GitHub Pages has no custom Content-Encoding headers.
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.nameFilesAsHashes = true;
            PlayerSettings.WebGL.template = "PROJECT:Neon";
            PlayerSettings.WebGL.initialMemorySize = 256;
            PlayerSettings.WebGL.maximumMemorySize = 1024;
            PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.ExplicitlyThrownExceptionsOnly;
            PlayerSettings.bundleVersion = "1.2.2-web";
            // Preserve the original indices for Windows/Web Fusion interoperability.
            var scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
            string output = Path.GetFullPath("../Builds/WebGL");
            Directory.CreateDirectory(output);
            const string oldFontPath = "Assets/Resources/Font/NotoSansCJKtc-Black.ttf";
            byte[] originalFontSettings = File.ReadAllBytes(oldFontPath + ".meta");
            const string excludedFont = "Assets/WebBuildExcluded/NotoSansCJKtc-Black.ttf";
            var originals = new Dictionary<string, byte[]>();
            string oldGuid = AssetDatabase.AssetPathToGUID(oldFontPath);
            string newGuid = AssetDatabase.AssetPathToGUID("Assets/Resources/Astral/Fonts/NotoSansTC-Medium.ttf");
            string backup = Path.GetFullPath("../logs/web-font-source-backup");
            BuildReport report;
            try
            {
                // Web forces includeFontData even when disabled. Temporarily remap
                // the 18 legacy UI references and keep the old font outside Resources.
                // Source bytes are backed up and restored in finally, including scene files.
                EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                foreach (string path in Directory.GetFiles("Assets", "*", SearchOption.AllDirectories)
                    .Where(p=>new[]{".prefab",".unity",".asset"}.Contains(Path.GetExtension(p))))
                {
                    string content = File.ReadAllText(path);
                    if (!content.Contains(oldGuid)) continue;
                    byte[] bytes = File.ReadAllBytes(path); originals[path] = bytes;
                    string copy = Path.Combine(backup, path); Directory.CreateDirectory(Path.GetDirectoryName(copy)); File.WriteAllBytes(copy, bytes);
                    File.WriteAllText(path, content.Replace(oldGuid, newGuid));
                }
                Directory.CreateDirectory("Assets/WebBuildExcluded"); AssetDatabase.Refresh();
                string moveError = AssetDatabase.MoveAsset(oldFontPath, excludedFont);
                if (!string.IsNullOrEmpty(moveError)) throw new Exception(moveError);
                AssetDatabase.Refresh();
                report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                    scenes = scenes, locationPathName = output, target = BuildTarget.WebGL,
                    subtarget = (int)WebGLTextureSubtarget.DXT, options = BuildOptions.None
                });
            }
            finally
            {
                // BuildPipeline may retain memory-mapped prefab handles on Windows.
                // Release them before restoring source files, and replace each file
                // atomically instead of truncating a file still held by an importer.
                AssetDatabase.ReleaseCachedFileHandles();
                if (File.Exists(excludedFont))
                {
                    string moveError = AssetDatabase.MoveAsset(excludedFont, oldFontPath);
                    if (!string.IsNullOrEmpty(moveError)) throw new Exception(moveError);
                }
                AssetDatabase.ReleaseCachedFileHandles();
                foreach (var entry in originals) RestoreSourceBytes(entry.Key, entry.Value);
                RestoreSourceBytes(oldFontPath + ".meta", originalFontSettings);
                AssetDatabase.Refresh();
            }
            if (report.summary.result != BuildResult.Succeeded) throw new Exception("Web build failed: " + report.summary.result);
            string licenses = Path.Combine(output, "ThirdPartyLicenses"); Directory.CreateDirectory(licenses);
            foreach (string path in Directory.GetFiles("Assets/Resources/Astral/Fonts", "*-OFL.txt"))
                File.Copy(path, Path.Combine(licenses, Path.GetFileName(path)), true);
            foreach (string path in Directory.GetFiles("Assets/Photon", "*.txt", SearchOption.AllDirectories).Where(p=>p.IndexOf("license",StringComparison.OrdinalIgnoreCase)>=0 || p.EndsWith("build_info.txt")))
            {
                string target = Path.Combine(licenses, path.Substring("Assets/Photon/".Length));
                Directory.CreateDirectory(Path.GetDirectoryName(target)); File.Copy(path,target,true);
            }
            File.WriteAllText(Path.Combine(output, ".nojekyll"), "");
            Debug.Log($"NEON_WEB_BUILD_OK textures={textures} audio={audio} bytes={report.summary.totalSize}");
        }
        static void RestoreSourceBytes(string path, byte[] bytes)
        {
            string temporary = path + ".neon-restore";
            try
            {
                File.WriteAllBytes(temporary, bytes);
                if (File.Exists(path)) File.Replace(temporary, path, null);
                else File.Move(temporary, path);
            }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
        }
    }
}
