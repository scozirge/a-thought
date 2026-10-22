using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace Neon.Validation
{
    // Explicit test utility for the project's Built-in Render Pipeline.
    // No startup hooks and no WaitForEndOfFrame: callers must invoke it outside a render callback.
    public static class NeonRenderCapture
    {
        [Serializable] sealed class CameraInfo
        {
            public string name, hierarchy, targetTexture, clearFlags;
            public bool enabled, active, selected;
            public Vector3 position;
            public float z, depth;
            public int cullingMask, targetDisplay;
        }
        [Serializable] sealed class CanvasInfo
        {
            public string hierarchy, renderMode, camera;
            public bool root;
            public int sortingLayer, sortingOrder, targetDisplay;
        }
        [Serializable] sealed class ImageInfo
        {
            public string hierarchy, type;
            public bool enabled, active;
            public Color color;
            public float fillAmount, rendererAlpha;
            public Vector2 size;
        }
        [Serializable] sealed class CaptureInfo
        {
            public int width, height, frame, activeCameraCount, nonBlackPixels;
            public bool captured;
            public string failure;
            public CameraInfo[] cameras;
            public CanvasInfo[] activeCanvases;
            public ImageInfo[] transitionAndBlackImages;
        }
        sealed class CanvasState
        {
            readonly Canvas canvas;
            readonly RenderMode mode;
            readonly Camera camera;
            readonly float distance;
            readonly RectTransform rect;
            readonly Vector2 anchorMin, anchorMax, pivot, size;
            readonly Vector3 position, scale;
            readonly Quaternion rotation;

            public CanvasState(Canvas value)
            {
                canvas = value;
                mode = value.renderMode;
                camera = value.worldCamera;
                distance = value.planeDistance;
                rect = value.transform as RectTransform;
                anchorMin = rect.anchorMin;
                anchorMax = rect.anchorMax;
                pivot = rect.pivot;
                size = rect.sizeDelta;
                position = rect.anchoredPosition3D;
                scale = rect.localScale;
                rotation = rect.localRotation;
            }
            public void Restore()
            {
                if (!canvas) return;
                canvas.renderMode = mode;
                canvas.worldCamera = camera;
                canvas.planeDistance = distance;
                rect.anchorMin = anchorMin;
                rect.anchorMax = anchorMax;
                rect.pivot = pivot;
                rect.sizeDelta = size;
                rect.anchoredPosition3D = position;
                rect.localScale = scale;
                rect.localRotation = rotation;
            }
        }

        // Writes path.png plus path.render.json. Throws on missing cameras, graphics
        // failure or an entirely black image, so a smoke test cannot silently pass.
        public static void Capture(string path)
        {
            string fullPath = Path.GetFullPath(path);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath));
            Camera[] allCameras = Object.FindObjectsByType<Camera>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            Camera[] cameras = allCameras.Where(IsScreenCamera).OrderBy(x => x.depth).ThenBy(x => x.GetInstanceID()).ToArray();
            Canvas[] canvases = Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None).Where(x => x.isActiveAndEnabled).ToArray();
            Canvas[] overlays = canvases.Where(x => x.isRootCanvas && x.renderMode == RenderMode.ScreenSpaceOverlay && x.targetDisplay == 0).ToArray();
            var info = new CaptureInfo
            {
                width = Screen.width > 0 ? Screen.width : 1280,
                height = Screen.height > 0 ? Screen.height : 720,
                frame = Time.frameCount,
                activeCameraCount = cameras.Length,
                cameras = allCameras.Select(x => new CameraInfo
                {
                    name = x.name, hierarchy = Hierarchy(x.transform), enabled = x.enabled,
                    active = x.gameObject.activeInHierarchy, selected = IsScreenCamera(x),
                    position = x.transform.position, z = x.transform.position.z, depth = x.depth,
                    cullingMask = x.cullingMask, targetDisplay = x.targetDisplay,
                    targetTexture = x.targetTexture ? x.targetTexture.name : "", clearFlags = x.clearFlags.ToString()
                }).ToArray(),
                activeCanvases = canvases.Select(x => new CanvasInfo
                {
                    hierarchy = Hierarchy(x.transform), renderMode = x.renderMode.ToString(),
                    camera = x.worldCamera ? Hierarchy(x.worldCamera.transform) : "",
                    root = x.isRootCanvas, sortingLayer = x.sortingLayerID,
                    sortingOrder = x.sortingOrder, targetDisplay = x.targetDisplay
                }).ToArray(),
                transitionAndBlackImages = Object.FindObjectsByType<Image>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                    .Where(IsTransitionOrBlackImage).Select(x => new ImageInfo
                    {
                        hierarchy = Hierarchy(x.transform), type = x.type.ToString(),
                        enabled = x.enabled, active = x.gameObject.activeInHierarchy,
                        color = x.color, fillAmount = x.fillAmount, rendererAlpha = x.canvasRenderer.GetAlpha(),
                        size = x.rectTransform.rect.size
                    }).ToArray()
            };
            RenderTexture previousActive = RenderTexture.active;
            RenderTexture target = null;
            Texture2D pixels = null;
            GameObject overlayObject = null;
            var canvasStates = new List<CanvasState>();
            var originalLayers = new Dictionary<GameObject, int>();
            try
            {
                if (cameras.Length == 0)
                    throw new InvalidOperationException("No originally active screen camera. Capture will not enable inactive gameplay cameras.");
                if (SystemInfo.graphicsDeviceType == GraphicsDeviceType.Null)
                    throw new InvalidOperationException("A graphics device is required for image capture; remove -nographics.");
                if (GraphicsSettings.currentRenderPipeline != null)
                    throw new NotSupportedException("NeonRenderCapture currently supports this project's Built-in Render Pipeline only.");

                Debug.Log("NEON_CAPTURE_BEGIN cameras=" + cameras.Length + " overlays=" + overlays.Length);
                // Batch-mode has no regular display loop; refresh active UI portraits
                // before capturing overlays that sample their render textures.
                foreach (Camera offscreen in allCameras.Where(x => x.isActiveAndEnabled && x.targetTexture)) offscreen.Render();
                target = RenderTexture.GetTemporary(info.width, info.height, 24, RenderTextureFormat.ARGB32);
                RenderTexture.active = target;
                GL.Clear(true, true, Color.black);
                // Only cameras originally drawing to display 0 participate, with
                // their existing depth, culling mask, clear flags and effects.
                foreach (Camera camera in cameras) camera.targetTexture = target;
                Canvas.ForceUpdateCanvases();
                foreach (Camera camera in cameras) camera.Render();

                if (overlays.Length > 0)
                {
                    // Isolate converted overlay UI from all existing scene layers;
                    // world-space and screen-camera UI were already rendered above.
                    int layer = UnusedSceneLayer();
                    overlayObject = new GameObject("Explicit capture overlay camera") { hideFlags = HideFlags.HideAndDontSave };
                    Camera overlayCamera = overlayObject.AddComponent<Camera>();
                    overlayCamera.enabled = false;
                    overlayCamera.orthographic = true;
                    overlayCamera.orthographicSize = info.height * 0.5f;
                    overlayCamera.nearClipPlane = 0.01f;
                    overlayCamera.farClipPlane = 1000;
                    overlayCamera.clearFlags = CameraClearFlags.Depth;
                    overlayCamera.cullingMask = 1 << layer;
                    overlayCamera.allowHDR = false;
                    overlayCamera.allowMSAA = false;
                    overlayCamera.useOcclusionCulling = false;
                    overlayCamera.targetTexture = target;
                    foreach (Canvas canvas in overlays)
                    {
                        canvasStates.Add(new CanvasState(canvas));
                        foreach (Transform child in canvas.GetComponentsInChildren<Transform>(true))
                        {
                            if (!originalLayers.ContainsKey(child.gameObject))
                                originalLayers.Add(child.gameObject, child.gameObject.layer);
                            child.gameObject.layer = layer;
                        }
                        canvas.renderMode = RenderMode.ScreenSpaceCamera;
                        canvas.worldCamera = overlayCamera;
                        canvas.planeDistance = 100;
                    }
                    Canvas.ForceUpdateCanvases();
                    overlayCamera.Render();
                }

                RenderTexture.active = target;
                pixels = new Texture2D(info.width, info.height, TextureFormat.RGBA32, false);
                pixels.ReadPixels(new Rect(0, 0, info.width, info.height), 0, 0, false);
                pixels.Apply(false, false);
                foreach (Color32 pixel in pixels.GetPixels32())
                    if (pixel.r > 3 || pixel.g > 3 || pixel.b > 3) info.nonBlackPixels++;
                File.WriteAllBytes(fullPath, pixels.EncodeToPNG());
                if (info.nonBlackPixels == 0)
                    throw new InvalidOperationException("The rendered capture is entirely black; inspect camera and transition diagnostics.");
                info.captured = true;
                Debug.Log("NEON_CAPTURE_OK nonBlackPixels=" + info.nonBlackPixels);
            }
            catch (Exception error)
            {
                info.failure = error.Message;
                throw;
            }
            finally
            {
                foreach (CanvasState state in canvasStates) state.Restore();
                foreach (KeyValuePair<GameObject, int> entry in originalLayers)
                    if (entry.Key) entry.Key.layer = entry.Value;
                foreach (Camera camera in cameras)
                    if (camera) camera.targetTexture = null; // Selection above requires an original null target.
                if (overlayObject)
                {
                    overlayObject.GetComponent<Camera>().targetTexture = null;
                    Object.Destroy(overlayObject);
                }
                Canvas.ForceUpdateCanvases();
                RenderTexture.active = previousActive;
                if (target) RenderTexture.ReleaseTemporary(target);
                if (pixels) Object.Destroy(pixels);
                File.WriteAllText(Path.ChangeExtension(fullPath, ".render.json"), JsonUtility.ToJson(info, true));
            }
        }

        static bool IsScreenCamera(Camera camera)
        {
            return camera.isActiveAndEnabled && camera.targetDisplay == 0 && !camera.targetTexture;
        }
        static string Hierarchy(Transform value)
        {
            string path = value.name;
            while (value.parent) { value = value.parent; path = value.name + "/" + path; }
            return path;
        }
        static bool IsTransitionOrBlackImage(Image image)
        {
            string path = Hierarchy(image.transform);
            return path.IndexOf("Cutscene", StringComparison.OrdinalIgnoreCase) >= 0
                || path.IndexOf("Fade", StringComparison.OrdinalIgnoreCase) >= 0
                || path.IndexOf("Black", StringComparison.OrdinalIgnoreCase) >= 0
                || image.isActiveAndEnabled && image.color.a > 0 && image.color.r < 0.02f && image.color.g < 0.02f && image.color.b < 0.02f;
        }
        static int UnusedSceneLayer()
        {
            uint used = 0;
            foreach (Transform item in Object.FindObjectsByType<Transform>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                used |= 1u << item.gameObject.layer;
            for (int layer = 31; layer >= 8; layer--)
                if ((used & (1u << layer)) == 0) return layer;
            throw new InvalidOperationException("No unused scene layer is available to isolate overlay capture.");
        }
    }
}
