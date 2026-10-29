using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Starbro.NeonIO
{
    // Instance-only shading: shared materials and the Init opening remain untouched.
    public sealed class BackgroundEffectBrightness : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register()
        {
            SceneManager.sceneLoaded -= OnSceneLoaded;
            SceneManager.sceneLoaded += OnSceneLoaded;
        }

        static void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            if (scene.name != "Lobby" && scene.name != "Battle" && scene.name != "Challenge") return;
            var host = new GameObject("Background effect brightness");
            SceneManager.MoveGameObjectToScene(host, scene);
            host.AddComponent<BackgroundEffectBrightness>();
        }

        IEnumerator Start()
        {
            // Landscape tiles instantiate their meteor systems during Start.
            yield return null;
            ApplyToScene(gameObject.scene);
        }

        public static void ApplyToScene(Scene scene)
        {
            var block = new MaterialPropertyBlock();
            foreach (var root in scene.GetRootGameObjects())
            foreach (var renderer in root.GetComponentsInChildren<ParticleSystemRenderer>(true))
            {
                float brightness = Brightness(renderer.transform);
                if (brightness >= 1) continue;
                var materials = renderer.sharedMaterials;
                for (int i = 0; i < materials.Length; i++)
                {
                    var material = materials[i];
                    if (!material) continue;
                    block.Clear();
                    renderer.GetPropertyBlock(block, i);
                    if (material.HasProperty("_Intensity"))
                        block.SetFloat("_Intensity", material.GetFloat("_Intensity") * brightness);
                    else
                    {
                        string tint = material.HasProperty("_TintColor") ? "_TintColor" : "_Color";
                        if (!material.HasProperty(tint)) continue;
                        Color color = material.GetColor(tint);
                        color.r *= brightness; color.g *= brightness; color.b *= brightness;
                        block.SetColor(tint, color);
                    }
                    renderer.SetPropertyBlock(block, i);
                }
            }
        }

        static float Brightness(Transform particle)
        {
            // Exact environment roots only: never match skill stars or pickup effects.
            bool environment = false;
            for (var node = particle; node; node = node.parent)
            {
                string name = node.name.Replace("(Clone)", "").Trim();
                if (name == "NeonSpotLight" || name == "GodGlow_loop") return .16f;
                if (name == "meteorShowerLobby" || name == "meteorShowerBattle" || name == "hugeMeteor")
                    environment = true;
            }
            if (!environment) return 1;
            return particle.name.StartsWith("flyManShiny", System.StringComparison.Ordinal) ? .10f : .42f;
        }
    }
}
