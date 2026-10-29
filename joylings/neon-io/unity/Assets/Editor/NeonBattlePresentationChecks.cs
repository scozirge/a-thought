using System;
using System.IO;
using Starbro.NeonIO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using Object = UnityEngine.Object;

namespace Neon.Editor
{
    // Editor fixtures only: no Play Mode, Photon runner, or device session.
    public static class NeonBattlePresentationChecks
    {
        public static void ValidateBotAndFog()
        {
            NeonBuild.Validate();
            CheckArenaFog(1920, 1080);
            CheckArenaFog(844, 390);
            Debug.Log("NEON_BOT_FOG_OK editor decision fixtures; fog shader rendered at desktop/mobile sizes; safe interior clear, unsafe boundary dark, deep fog opaque, zero radius covered; no Play Mode or network session");
        }

        static void CheckArenaFog(int width, int height)
        {
            var scene = EditorSceneManager.NewPreviewScene();
            var root = new GameObject("Arena fog shader fixture");
            SceneManager.MoveGameObjectToScene(root, scene);
            RenderTexture output = null; Texture2D image = null; Material material = null;
            var previous = RenderTexture.active;
            try
            {
                var shader = Resources.Load<Shader>("Astral/ArenaFog");
                Require(shader && shader.isSupported && !ShaderUtil.ShaderHasError(shader), "Arena fog shader compilation failed.");
                material = new Material(shader);
                var plane = GameObject.CreatePrimitive(PrimitiveType.Quad);
                plane.transform.SetParent(root.transform, false);
                plane.transform.localScale = Vector3.one * 80000;
                plane.GetComponent<MeshRenderer>().sharedMaterial = material;
                var view = new GameObject("Fog camera").AddComponent<Camera>();
                view.transform.SetParent(root.transform, false);
                view.scene = scene; view.orthographic = true; view.orthographicSize = 200;
                view.clearFlags = CameraClearFlags.SolidColor;
                view.backgroundColor = new Color(.3f, .4f, .5f, 1);
                view.enabled = false;
                output = new RenderTexture(width, height, 24); output.Create(); view.targetTexture = output;
                image = new Texture2D(width, height, TextureFormat.RGB24, false);
                foreach (float radius in new[] { 4000f, 100f, 0f })
                {
                    view.transform.position = new Vector3(radius, 0, -10);
                    material.SetFloat("_Radius", radius);
                    plane.SetActive(false);
                    view.Render(); Capture();
                    float baseline = Sample(radius).grayscale;
                    plane.SetActive(true);
                    view.Render(); Capture();
                    if (radius > 0)
                        Require(Mathf.Abs(Sample(radius - 100).grayscale - baseline) < .01f, "Fog obscured the safe interior.");
                    Require(Sample(radius + 5).grayscale < baseline * .5f, "Unsafe boundary remains too transparent.");
                    Require(Sample(radius + 150).grayscale < baseline * .15f, "Deep forbidden zone is not dark enough.");
                    if (radius == 0)
                        Require(Sample(0).grayscale < baseline * .15f, "Closed safe zone left a transparent hole.");
                    string folder = Path.GetFullPath("../logs/bot-fog-preview");
                    Directory.CreateDirectory(folder);
                    File.WriteAllBytes(Path.Combine(folder, $"fog-{width}x{height}-r{radius:0}.png"), image.EncodeToPNG());
                }
                void Capture()
                {
                    RenderTexture.active = output;
                    image.ReadPixels(new Rect(0, 0, width, height), 0, 0); image.Apply();
                }
                Color Sample(float worldX)
                {
                    var point = view.WorldToViewportPoint(new Vector3(worldX, 0, 0));
                    return image.GetPixel(Mathf.Clamp(Mathf.RoundToInt(point.x * (width - 1)), 0, width - 1), height / 2);
                }
            }
            finally
            {
                RenderTexture.active = previous;
                Object.DestroyImmediate(root);
                if (material) Object.DestroyImmediate(material);
                if (image) Object.DestroyImmediate(image);
                if (output) { output.Release(); Object.DestroyImmediate(output); }
                EditorSceneManager.ClosePreviewScene(scene);
            }
        }

        public static void ValidateAndPreview()
        {
            NeonArenaResultChecks.ValidateAndPreview();
            CheckArrow();
            RenderCosmos(1920, 1080);
            RenderCosmos(844, 390);
            Debug.Log("NEON_BATTLE_PRESENTATION_OK movement arrows independent of aim; eight headings and stationary hold; desktop/mobile cosmos; visible result actions");
        }
        static void CheckArrow()
        {
            var parent = new GameObject("Arrow facing fixture");
            var sprite = new GameObject("Arrow sprite");
            sprite.transform.SetParent(parent.transform, false);
            try
            {
                for (int aim = 0; aim < 360; aim += 45)
                for (int movement = 0; movement < 360; movement += 45)
                {
                    parent.transform.rotation = Quaternion.Euler(0, 0, aim);
                    parent.transform.localScale = new Vector3(.6f, .6f, 1);
                    var direction = (Vector2)(Quaternion.Euler(0, 0, movement) * Vector3.up);
                    float heading = RoleMovementArrow.MovementHeading(direction * 600, 17);
                    RoleMovementArrow.ApplyPose(sprite.transform, parent.transform, new Vector3(0,60,0), Quaternion.identity, heading);
                    Require(Vector2.Dot(sprite.transform.up, direction) > .9999f, "Arrow points away from movement.");
                    Require(Vector2.Dot(sprite.transform.position.normalized, direction) > .9999f, "Arrow offset still follows aim.");
                    Require(Mathf.Abs(Mathf.DeltaAngle(parent.transform.eulerAngles.z, aim)) < .001f, "Movement cue changed the attack collider direction.");
                }
                Require(RoleMovementArrow.MovementHeading(Vector2.zero, 71) == 71, "Stopped arrow lost its direction.");
            }
            finally { Object.DestroyImmediate(parent); }
        }
        static void RenderCosmos(int width, int height)
        {
            var scene = EditorSceneManager.NewPreviewScene();
            var root = new GameObject("Battle cosmos fixture");
            SceneManager.MoveGameObjectToScene(root, scene);
            RenderTexture output = null; Texture2D image = null;
            var previous = RenderTexture.active;
            try
            {
                var view = new GameObject("Cosmos camera").AddComponent<Camera>();
                view.transform.SetParent(root.transform, false);
                view.scene = scene; view.orthographic = true; view.orthographicSize = 540;
                view.transform.position = new Vector3(0,0,-10);
                view.clearFlags = CameraClearFlags.SolidColor; view.backgroundColor = Color.black;
                view.enabled = false;
                output = new RenderTexture(width, height, 24); output.Create(); view.targetTexture = output;
                var cosmos = view.gameObject.AddComponent<BattleCosmos>();
                // MonoBehaviour callbacks need explicit invocation outside Play Mode.
                if (view.GetCommandBuffers(CameraEvent.BeforeForwardOpaque).Length == 0) cosmos.SendMessage("OnEnable");
                cosmos.RefreshView();
                Require(view.GetCommandBuffers(CameraEvent.BeforeForwardOpaque).Length == 1, "Missing or duplicated cosmos draw.");
                var oldFill = new GameObject("BattleBGArea").AddComponent<SpriteRenderer>();
                oldFill.transform.SetParent(root.transform, false);
                var retainedCloud = new GameObject("Cloud1_bg").AddComponent<SpriteRenderer>();
                retainedCloud.transform.SetParent(root.transform, false);
                BattleCosmos.ReplaceLegacyFill(scene);
                Require(!oldFill.enabled && retainedCloud.enabled, "Legacy fill replacement changed scenery.");
                var prefab = Resources.Load<GameObject>("Particles_n/meteorShower/meteorShowerBattle");
                var meteors = Object.Instantiate(prefab, root.transform, false);
                meteors.transform.localPosition = Vector3.zero;
                BackgroundEffectBrightness.ApplyToScene(scene);
                foreach (var particles in meteors.GetComponentsInChildren<ParticleSystem>())
                {
                    particles.useAutoRandomSeed = false; particles.randomSeed = 1525;
                    particles.Simulate(14, false, true, true); particles.Pause(false);
                }
                var shader = Resources.Load<Shader>("Astral/BattleCosmos");
                Require(shader && !ShaderUtil.ShaderHasError(shader), "Cosmos shader compilation failed.");
                view.Render();
                RenderTexture.active = output;
                image = new Texture2D(width,height,TextureFormat.RGB24,false);
                image.ReadPixels(new Rect(0,0,width,height),0,0); image.Apply();
                var center = image.GetPixel(width/2,height/2);
                Require(center.b > .025f && center.b > center.r, "Battle backdrop is missing or black.");
                string folder = Path.GetFullPath("../logs/battle-presentation");
                Directory.CreateDirectory(folder);
                File.WriteAllBytes(Path.Combine(folder,$"cosmos-{width}x{height}.png"),image.EncodeToPNG());
                cosmos.SendMessage("OnDisable");
                Require(view.GetCommandBuffers(CameraEvent.BeforeForwardOpaque).Length == 0, "Cosmos camera leaked a command buffer.");
            }
            finally
            {
                RenderTexture.active = previous;
                Object.DestroyImmediate(root);
                if (image) Object.DestroyImmediate(image);
                if (output) { output.Release(); Object.DestroyImmediate(output); }
                EditorSceneManager.ClosePreviewScene(scene);
            }
        }
        static void Require(bool ok, string message) { if (!ok) throw new InvalidOperationException(message); }
    }
}
