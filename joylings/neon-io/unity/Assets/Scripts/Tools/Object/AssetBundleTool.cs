#if UNITY_EDITOR
using System.Collections.Generic;
using System.Linq;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace Scoz.Func
{
    public static class BuilderExample
    {
        [MenuItem("Assets/ExportAssetBundle(Windows64)")]
        static void BuildWindows64()
        {
            var path = Path.GetFullPath(Application.dataPath + "/../Builds/Windows64/" + Application.productName + ".exe");
            BuildProject(path, BuildTarget.StandaloneWindows64);
        }
        [MenuItem("Tools/Build Android")]
        static void BuildAndroid()
        {
            var path = Path.GetFullPath(Application.dataPath + "/../Builds/Android/" + Application.productName + ".apk");
            BuildProject(path, BuildTarget.Android);
        }
        const string AssetBundleExtension = ".assetbundle";
        const string ScenesAssetBundleName = "scenes";
        static string GetEntryScenePath()
        {
            return EditorBuildSettings.scenes.Where(v => v.enabled).Select(v => v.path).First();
        }
        static string[] CollectScenesPathWithoutEntry()
        {
            var paths = new List<string>(EditorBuildSettings.scenes.Where(v => v.enabled).Select(v => v.path));
            paths.RemoveAt(0);
            return paths.ToArray();
        }
        static void BuildProject(string outputPath, BuildTarget target = BuildTarget.Android, BuildOptions buildOptions = BuildOptions.None, BuildAssetBundleOptions buildAssetBundleOptions = BuildAssetBundleOptions.None)
        {
            // Check output path
            var bundleOutputDir = Path.GetFullPath(Path.GetDirectoryName(outputPath));
            var playerOutputPath = outputPath;
            if (!Directory.Exists(bundleOutputDir))
            {
                Directory.CreateDirectory(bundleOutputDir);
            }
            // Collect & Build assetbundles
            var bundleManifestPath = bundleOutputDir + Path.DirectorySeparatorChar + Path.GetFileName(bundleOutputDir) + ".manifest";
            var assetBundleBuilds = new AssetBundleBuild[] {
         new AssetBundleBuild {
            assetBundleName = ScenesAssetBundleName + AssetBundleExtension,
            assetNames = CollectScenesPathWithoutEntry(),
         }
      };
            BuildPipeline.BuildAssetBundles(bundleOutputDir, assetBundleBuilds, buildAssetBundleOptions, target);
            // Build Player
            var buildPlayerOptions = new BuildPlayerOptions()
            {
                target = target,
                scenes = new string[] { GetEntryScenePath() },
                options = buildOptions,
                locationPathName = playerOutputPath,
                assetBundleManifestPath = bundleManifestPath,
            };
            var result = BuildPipeline.BuildPlayer(buildPlayerOptions);
            Debug.Log(result.name);
            Debug.Log(result.steps);
            Debug.Log(result.strippingInfo);
            Debug.Log(result.summary);
            /*
            if (!string.IsNullOrEmpty(result))
            {
                throw new System.Exception(result);
            }
             */
            // Open folder if not batch mode
            if (!UnityEditorInternal.InternalEditorUtility.inBatchMode)
            {
                System.Diagnostics.Process.Start(bundleOutputDir);
            }
        }
    }
}
#endif