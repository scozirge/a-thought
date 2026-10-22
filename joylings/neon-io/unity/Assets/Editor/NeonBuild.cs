using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using Fusion;
using Fusion.Editor;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Neon.Editor
{
    public static class NeonBuild
    {
        static readonly string[] Scenes = { "Init", "Lobby", "Battle", "Challenge" };
        static Type RuntimeType(string name) => Type.GetType("Neon.Networking." + name + ", Assembly-CSharp", true);

        [MenuItem("Neon IO/Prepare Fusion project")]
        public static void Prepare()
        {
            AstralAssets.Prepare();
            PaletteInventory.Write();
            Directory.CreateDirectory("Assets/Resources/Networking");
            AssetDatabase.Refresh();
            var viewType = RuntimeType("PhotonView");
            var entityType = RuntimeType("NeonFusionEntity");
            var roleStateType = RuntimeType("NeonFusionRoleState");
            var catalog = new List<GameObject>();
            foreach (var guid in AssetDatabase.FindAssets("t:Prefab", new[] { "Assets/Resources" }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (prefab == null || prefab.name == "GameManager" || prefab.GetComponentInChildren(viewType, true) == null) continue;
                var contents = PrefabUtility.LoadPrefabContents(path);
                try
                {
                    foreach (Component view in contents.GetComponentsInChildren(viewType, true))
                    {
                        var go = view.gameObject;
                        var network = go.GetComponent<NetworkObject>() ?? go.AddComponent<NetworkObject>();
                        if (!go.GetComponent(entityType)) go.AddComponent(entityType);
                        bool role = go.GetComponent<Starbro.NeonIO.Role>() != null;
                        if (role && !go.GetComponent(roleStateType)) go.AddComponent(roleStateType);
                        bool player = go.GetComponent<Starbro.NeonIO.PlayerRole>() != null;
                        network.Flags = player ? NetworkObjectFlags.DestroyWhenStateAuthorityLeaves : NetworkObjectFlags.MasterClientObject;
                    }
                    PrefabUtility.SaveAsPrefabAsset(contents, path);
                }
                finally { PrefabUtility.UnloadPrefabContents(contents); }
                prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                new NetworkObjectBakerEditTime().Bake(prefab);
                EditorUtility.SetDirty(prefab);
                AssetDatabase.SetLabels(prefab, AssetDatabase.GetLabels(prefab).Concat(new[] { "FusionPrefab" }).Distinct().ToArray());
                catalog.Add(prefab);
            }
            const string sessionPath = "Assets/Resources/Networking/NeonPlayerSession.prefab";
            var session = new GameObject("NeonPlayerSession");
            session.AddComponent<NetworkObject>().Flags = NetworkObjectFlags.DestroyWhenStateAuthorityLeaves;
            session.AddComponent(RuntimeType("NeonPlayerSession"));
            var sessionPrefab = PrefabUtility.SaveAsPrefabAsset(session, sessionPath);
            Object.DestroyImmediate(session);
            new NetworkObjectBakerEditTime().Bake(sessionPrefab);
            EditorUtility.SetDirty(sessionPrefab);
            AssetDatabase.SetLabels(sessionPrefab, new[] { "FusionPrefab" });

            const string catalogPath = "Assets/Resources/Networking/NeonPrefabCatalog.asset";
            var data = AssetDatabase.LoadAssetAtPath<ScriptableObject>(catalogPath);
            if (!data) { data = ScriptableObject.CreateInstance(RuntimeType("NeonPrefabCatalog")); AssetDatabase.CreateAsset(data, catalogPath); }
            data.GetType().GetField("Prefabs").SetValue(data, catalog.ToArray());
            EditorUtility.SetDirty(data);

            EditorBuildSettings.scenes = Scenes.Select(name => new EditorBuildSettingsScene("Assets/Scenes/" + name + ".unity", true)).ToArray();
            PlayerSettings.productName = "Neon Impact";
            PlayerSettings.companyName = "Starbro";
            PlayerSettings.bundleVersion = "1.1.5-fusion";
            PlayerSettings.defaultScreenWidth = 1280;
            PlayerSettings.defaultScreenHeight = 800;
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.runInBackground = true;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            PlayerSettings.SetApiCompatibilityLevel(NamedBuildTarget.Standalone, ApiCompatibilityLevel.NET_Standard);
            PlayerSettings.SetApiCompatibilityLevel(NamedBuildTarget.WebGL, ApiCompatibilityLevel.NET_Standard);
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.dataCaching = true;
            var defines = PlayerSettings.GetScriptingDefineSymbols(NamedBuildTarget.Standalone).Split(';').Where(s => !s.StartsWith("PUN_") && s != "PHOTON_UNITY_NETWORKING").Concat(new[] { "FUSION_WEAVER" });
            PlayerSettings.SetScriptingDefineSymbols(NamedBuildTarget.Standalone, string.Join(";", defines.Distinct()));
            AssetDatabase.SaveAssets();
            NetworkProjectConfigUtilities.RebuildPrefabTable();
            AssetDatabase.SaveAssets();
            Debug.Log("NEON_PREPARE_OK prefabs=" + catalog.Count);
        }

        [MenuItem("Neon IO/Validate content")]
        public static void Validate()
        {
            int missing = 0;
            foreach (var guid in AssetDatabase.FindAssets("t:Prefab", new[] { "Assets/Resources" }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                foreach (var transform in prefab.GetComponentsInChildren<Transform>(true))
                {
                    int count = GameObjectUtility.GetMonoBehavioursWithMissingScriptCount(transform.gameObject);
                    if (count > 0) { Debug.LogError("Missing script: " + path + " / " + transform.name); missing += count; }
                }
            }
            foreach (var name in Scenes)
            {
                var scene = EditorSceneManager.OpenScene("Assets/Scenes/" + name + ".unity", OpenSceneMode.Single);
                foreach (var root in scene.GetRootGameObjects())
                foreach (var transform in root.GetComponentsInChildren<Transform>(true))
                {
                    int count = GameObjectUtility.GetMonoBehavioursWithMissingScriptCount(transform.gameObject);
                    if (count > 0) { Debug.LogError("Missing scene script: " + name + " / " + transform.name); missing += count; }
                }
            }
            if (missing > 0) throw new Exception("Content contains " + missing + " missing script references.");
            NeonContentValidation.Validate();
            Neon.Networking.NeonProtocolChecks.Run();
            foreach (var guid in AssetDatabase.FindAssets("t:Shader", new[] { "Assets/Resources/Astral" }))
            {
                var shader = AssetDatabase.LoadAssetAtPath<Shader>(AssetDatabase.GUIDToAssetPath(guid));
                if (ShaderUtil.ShaderHasError(shader)) throw new Exception("Astral shader has compilation errors: " + shader.name);
            }
            var timeline = Resources.Load<UnityEngine.Timeline.TimelineAsset>("Animator/God/GodTimeline");
            if (timeline == null || timeline.outputTrackCount == 0)
                throw new Exception("Original God lobby animation requires the Timeline package and its animation track.");
            var features = Resources.Load<TextAsset>("Json/Feature");
            if (features == null || LitJson.JsonMapper.ToObject(features.text)["Feature"].Count != 95) throw new Exception("Original 95 feature definitions are required.");
            Debug.Log("NEON_CONTENT_OK 95 features; all resource prefabs and 4 scenes have scripts.");
        }

        [MenuItem("Neon IO/Build Windows")]
        public static void Windows()
        {
            BuildWindows(BuildOptions.None);
        }

        [MenuItem("Neon IO/Build Windows development")]
        public static void WindowsDevelopment()
        {
            BuildWindows(BuildOptions.Development);
        }

        static void BuildWindows(BuildOptions options)
        {
            Prepare();
            Validate();
            var output = Path.GetFullPath("../Builds/Windows/NeonImpact.exe");
            Directory.CreateDirectory(Path.GetDirectoryName(output));
            var report = BuildPipeline.BuildPlayer(EditorBuildSettings.scenes, output, BuildTarget.StandaloneWindows64, options);
            if (report.summary.result != BuildResult.Succeeded) throw new Exception("Windows build failed: " + report.summary.result);
            CopyLicenses(Path.GetDirectoryName(output));
            Debug.Log("NEON_WINDOWS_BUILD_OK " + output);
        }

        static void CopyLicenses(string output)
        {
            var target = Path.Combine(output, "ThirdPartyLicenses");
            Directory.CreateDirectory(target);
            var fontLicenses = Path.Combine(target, "AstralFonts");
            Directory.CreateDirectory(fontLicenses);
            foreach (var path in Directory.GetFiles("Assets/Resources/Astral/Fonts", "*-OFL.txt"))
                File.Copy(path, Path.Combine(fontLicenses, Path.GetFileName(path)), true);
            foreach (var path in Directory.GetFiles("Assets/Photon", "*.txt", SearchOption.AllDirectories).Where(p => p.IndexOf("license", StringComparison.OrdinalIgnoreCase) >= 0 || p.EndsWith("build_info.txt")))
            {
                var relative = path.Substring("Assets/Photon/".Length);
                var dest = Path.Combine(target, relative);
                Directory.CreateDirectory(Path.GetDirectoryName(dest));
                File.Copy(path, dest, true);
            }
        }
    }
}
