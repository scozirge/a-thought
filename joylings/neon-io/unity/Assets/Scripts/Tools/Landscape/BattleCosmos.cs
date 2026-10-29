using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Rendering;

namespace Starbro.NeonIO
{
    // One texture-free backdrop draw. No full-screen bloom or additional particles.
    [RequireComponent(typeof(Camera))]
    public sealed class BattleCosmos : MonoBehaviour
    {
        Camera view;
        Mesh mesh;
        Material material;
        CommandBuffer draw;
        static readonly int Aspect = Shader.PropertyToID("_Aspect");
        static readonly int Offset = Shader.PropertyToID("_Drift");

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register()
        {
            SceneManager.sceneLoaded -= Loaded;
            SceneManager.sceneLoaded += Loaded;
        }
        static void Loaded(Scene scene, LoadSceneMode mode)
        {
            if (scene.name != "Battle" && scene.name != "Challenge") return;
            ReplaceLegacyFill(scene);
            foreach (var root in scene.GetRootGameObjects())
            foreach (var camera in root.GetComponentsInChildren<Camera>(true))
                if (camera.CompareTag("MainCamera")) Ensure(camera);
        }
        public static void ReplaceLegacyFill(Scene scene)
        {
            // The old finite blue rectangle would hide the new backdrop at map centre
            // and leave a visible seam when crossing its edge. Scenery stays intact.
            foreach (var root in scene.GetRootGameObjects())
            foreach (var sprite in root.GetComponentsInChildren<SpriteRenderer>(true))
                if (sprite.name == "BattleBGArea") sprite.enabled = false;
        }
        public static void Ensure(Camera camera)
        {
            if (camera && (camera.gameObject.scene.name == "Battle" || camera.gameObject.scene.name == "Challenge") &&
                !camera.GetComponent<BattleCosmos>()) camera.gameObject.AddComponent<BattleCosmos>();
        }

        void OnEnable()
        {
            view = GetComponent<Camera>();
            var shader = Resources.Load<Shader>("Astral/BattleCosmos");
            if (!shader) return;
            material = new Material(shader) { name = "Battle cosmos - quiet navy" };
            mesh = new Mesh { name = "Cosmos screen quad" };
            mesh.vertices = new[] { new Vector3(-.5f,-.5f,0), new Vector3(.5f,-.5f,0), new Vector3(.5f,.5f,0), new Vector3(-.5f,.5f,0) };
            mesh.uv = new[] { Vector2.zero, Vector2.right, Vector2.one, Vector2.up };
            mesh.triangles = new[] { 0,2,1,0,3,2 }; mesh.RecalculateBounds();
            draw = new CommandBuffer { name = "Distant cosmos" };
            view.AddCommandBuffer(CameraEvent.BeforeForwardOpaque, draw);
            RefreshView();
        }
        void OnPreCull() { RefreshView(); }
        public void RefreshView()
        {
            if (draw == null || !view) return;
            float depth = Mathf.Max(view.nearClipPlane + 1, 20);
            float height = view.orthographic ? view.orthographicSize * 2 : 2 * depth * Mathf.Tan(view.fieldOfView * .5f * Mathf.Deg2Rad);
            material.SetFloat(Aspect, view.aspect);
            // World anchored parallax: no clock-driven movement or distracting animation.
            material.SetVector(Offset, new Vector4(view.transform.position.x * .000025f, view.transform.position.y * .000025f, 0, 0));
            var matrix = Matrix4x4.TRS(view.transform.TransformPoint(0, 0, depth), view.transform.rotation,
                new Vector3(height * view.aspect * 1.002f, height * 1.002f, 1));
            draw.Clear(); draw.DrawMesh(mesh, matrix, material, 0, 0);
        }
        void OnDisable()
        {
            if (draw != null) { if (view) view.RemoveCommandBuffer(CameraEvent.BeforeForwardOpaque, draw); draw.Release(); draw = null; }
            Release(mesh); Release(material);
            mesh = null; material = null;
        }
        static void Release(Object value)
        {
            if (!value) return;
            if (Application.isPlaying) Destroy(value); else DestroyImmediate(value);
        }
    }
}
