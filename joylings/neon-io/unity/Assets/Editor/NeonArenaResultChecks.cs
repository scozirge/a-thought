using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Neon.Astral;
using Neon.Networking;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace Neon.Editor
{
    // Editor-only presentation fixtures; never enters Play Mode or connects to Photon.
    public static class NeonArenaResultChecks
    {
        const BindingFlags Private = BindingFlags.Instance | BindingFlags.NonPublic;
        public static void ValidateAndPreview()
        {
            NeonBuild.Validate();
            NeonArenaSpectatorChecks.Run();
            var previous = GameDictionary.FeatureDic;
            var language = typeof(MyPlayer).GetProperty("UseLanguage");
            var previousLanguage = MyPlayer.UseLanguage;
            try
            {
                GameDictionary.FeatureDic = new Dictionary<int, FeatureData>();
                Data.SetData(GameDictionary.FeatureDic, "Feature");
                FeatureData.Init();
                var appearance = new ArenaAppearance { Captured = true };
                Require(appearance.IsValid && !default(ArenaAppearance).IsValid, "Default accessories and missing snapshots must differ.");
                appearance.Head = GameDictionary.FeatureDic.Values.First(f => f.MyFeaturePart == FeaturePart.Body).ID;
                Require(!appearance.IsValid, "Cross-part snapshot accepted.");
                appearance.Head = -1;
                Require(!appearance.IsValid, "Invalid snapshot ID accepted.");
                foreach (var feature in GameDictionary.FeatureDic.Values)
                {
                    Require(feature.IconSprite && feature.IconSprite.vertices.Length > 0, "Missing accessory mesh: " + feature.ID);
                    var original = new ArenaAppearance { Captured = true };
                    if (feature.MyFeaturePart == FeaturePart.Head) original.Head = feature.ID;
                    else if (feature.MyFeaturePart == FeaturePart.Body) original.Body = feature.ID;
                    else original.Back = feature.ID;
                    var saved = new ArenaEntry { Rank = 3, Appearance = original, Stars = 17 };
                    original = default; // Live role can be cleared without mutating the saved appearance.
                    Require(saved.Appearance.IsValid && saved.Stars == 17, "Death snapshot was not retained.");
                }
                foreach (var size in new[] { new Vector2(1440, 1000), new Vector2(844, 390), new Vector2(667, 300), new Vector2(390, 844) })
                {
                    bool touch = size.x < 1000;
                    var layout = new ArenaResultLayout(touch, size.x, size.y);
                    Require(layout.Podium > 90 && layout.Stats > 0 && layout.InnerWidth > 240, "Unusable result geometry.");
                    Require(layout.Viewport + layout.Header + layout.Footer <= layout.Height, "Pinned footer overlaps content.");
                    foreach (Language locale in new[] { Language.Chinese, Language.English })
                    {
                        language.SetValue(null, locale);
                        Render(size, layout, locale, false);
                        Render(size, layout, locale, true);
                    }
                }
                language.SetValue(null, Language.Chinese);
                Render(new Vector2(844, 390), new ArenaResultLayout(true, 844, 390), Language.Chinese, true);
                Debug.Log("NEON_ARENA_RESULTS_CHECKS_OK 95 accessory snapshots; 8 locale/viewport layouts; pending standings update");
            }
            finally { GameDictionary.FeatureDic = previous; language.SetValue(null, previousLanguage); }
        }

        static void Render(Vector2 size, ArenaResultLayout layout, Language locale, bool pending)
        {
            var scene = EditorSceneManager.NewPreviewScene();
            var root = new GameObject("Arena results fixture");
            SceneManager.MoveGameObjectToScene(root, scene);
            RenderTexture target = null;
            Texture2D image = null;
            var oldTarget = RenderTexture.active;
            try
            {
                var camera = new GameObject("Preview camera").AddComponent<Camera>();
                camera.transform.SetParent(root.transform);
                camera.scene = scene;
                camera.transform.position = new Vector3(0, 0, -10);
                camera.orthographic = true; camera.orthographicSize = size.y * .5f;
                camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = AstralWidgets.Night;
                camera.cullingMask = 1 << 30; camera.enabled = false;
                target = new RenderTexture((int)size.x * 2, (int)size.y * 2, 24);
                target.Create(); camera.targetTexture = target;
                var canvas = new GameObject("Canvas", typeof(RectTransform), typeof(Canvas)).GetComponent<Canvas>();
                canvas.transform.SetParent(root.transform);
                canvas.renderMode = RenderMode.WorldSpace;
                canvas.GetComponent<RectTransform>().sizeDelta = size;
                canvas.worldCamera = camera;
                var page = AstralWidgets.Rect(canvas.transform, "Page", 0, 0, size.x, size.y);
                var owner = new GameObject("Presentation fixture");
                owner.transform.SetParent(root.transform); owner.SetActive(false);
                var presenter = owner.AddComponent<AstralPresentation>();
                typeof(AstralPresentation).GetField("page", Private).SetValue(presenter, page);
                int[] heads = Part(FeaturePart.Head), bodies = Part(FeaturePart.Body), backs = Part(FeaturePart.Back);
                var entries = new ArenaEntry[3];
                for (int i = 0; i < 3; i++) entries[i] = new ArenaEntry
                {
                    Rank = i + 1, Name = new[] { "Guest", "Nova321_2", "Luna872_3" }[i], Kills = 3, Damage = 4589, Stars = 24,
                    Appearance = new ArenaAppearance { Captured = true, Head = heads[i * 5], Body = bodies[i * 5], Back = backs[i * 5] }
                };
                bool resolved = !pending;
                Func<int, (int, ArenaEntry)> lookup = rank => resolved ? (rank - 1, entries[rank - 1]) : (-1, default);
                var local = entries[0];
                if (pending) local.Rank = 9;
                bool left = false, watched = false;
                typeof(AstralPresentation).GetMethod("BuildArenaResultContent", Private).Invoke(presenter, new object[] {
                    layout, local, pending ? -10 : 30, 0, lookup, (UnityEngine.Events.UnityAction)(() => left = true),
                    pending ? (UnityEngine.Events.UnityAction)(() => watched = true) : null });
                var callbacks = (List<Action>)typeof(AstralPresentation).GetField("live", Private).GetValue(presenter);
                foreach (var update in callbacks) update();
                foreach (Transform child in root.GetComponentsInChildren<Transform>(true)) child.gameObject.layer = 30;
                Canvas.ForceUpdateCanvases();
                var scroll = page.GetComponentInChildren<ScrollRect>();
                if (layout.Scrolls) Require(scroll && scroll.verticalNormalizedPosition > .99f, "Short-screen results must open at the podium.");
                var podiums = page.GetComponentsInChildren<AstralArenaAvatar>();
                Require(podiums.Length == 3, "Results must contain three podium positions.");
                var ordered = podiums.OrderBy(p => p.transform.position.x).ToArray();
                Require(((RectTransform)ordered[1].transform).rect.height > ((RectTransform)ordered[0].transform).rect.height &&
                    ((RectTransform)ordered[0].transform).rect.height > ((RectTransform)ordered[2].transform).rect.height, "Podium size/order changed.");
                var buttons = page.GetComponentsInChildren<Button>();
                var exit = buttons.Single(b => b.name == "Arena return");
                exit.onClick.Invoke(); Require(left && exit.interactable, "Visible return-to-lobby button unavailable.");
                Require(!buttons.Any(b => b.name == "Arena exit"), "Result exit must use the visible footer.");
                if (pending)
                {
                    var watchButton = buttons.Single(b => b.name == "Arena watch");
                    var returnRect = (RectTransform)exit.transform;
                    var watchRect = (RectTransform)watchButton.transform;
                    Require(watchRect.anchoredPosition.x + watchRect.rect.width * .5f < returnRect.anchoredPosition.x - returnRect.rect.width * .5f,
                        "Early-result actions overlap.");
                }
                left = false;
                var button = buttons.Single(b => b.name == (pending ? "Arena watch" : "Arena return"));
                button.onClick.Invoke();
                Require(button.interactable && (pending ? watched && !left : left && !watched), "Result action routed incorrectly.");
                foreach (var text in page.GetComponentsInChildren<Text>())
                {
                    Require(text.rectTransform.rect.width > 0 && text.rectTransform.rect.height > 0, "Invalid text bounds: " + text.name);
                    if (!text.resizeTextForBestFit && !string.IsNullOrEmpty(text.text))
                        Require(text.preferredHeight <= text.rectTransform.rect.height + 2, "Clipped text: " + text.name + " " + text.preferredHeight + "/" + text.rectTransform.rect.height + " in " + size + "/" + locale);
                }
                camera.Render(); Canvas.ForceUpdateCanvases(); camera.Render();
                RenderTexture.active = target;
                image = new Texture2D(target.width, target.height, TextureFormat.RGB24, false);
                image.ReadPixels(new Rect(0, 0, target.width, target.height), 0, 0); image.Apply();
                string directory = Path.GetFullPath(Path.Combine(Application.dataPath, "../../logs/arena-results"));
                Directory.CreateDirectory(directory);
                File.WriteAllBytes(Path.Combine(directory, $"{(int)size.x}x{(int)size.y}-{locale}{(pending ? "-pending" : "")}.png"), image.EncodeToPNG());
                if (pending)
                {
                    Require(podiums.All(p => p.GetComponentsInChildren<AstralArenaSprite>().Length == 0), "Pending podium invented a winner.");
                    resolved = true;
                    foreach (var update in callbacks) update();
                    Require(podiums.All(p => p.GetComponentsInChildren<AstralArenaSprite>().Length == 3), "Final standings did not update in place.");
                }
            }
            finally
            {
                RenderTexture.active = oldTarget;
                if (image) Object.DestroyImmediate(image);
                Object.DestroyImmediate(root);
                if (target) { target.Release(); Object.DestroyImmediate(target); }
                EditorSceneManager.ClosePreviewScene(scene);
            }
        }

        static int[] Part(FeaturePart part) => GameDictionary.FeatureDic.Values.Where(f => f.MyFeaturePart == part).OrderBy(f => f.ID).Select(f => f.ID).ToArray();
        static void Require(bool ok, string message) { if (!ok) throw new InvalidOperationException(message); }
    }
}
