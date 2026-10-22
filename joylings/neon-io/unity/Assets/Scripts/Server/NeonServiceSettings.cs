using UnityEngine;

namespace Starbro.NeonIO
{
    [CreateAssetMenu(menuName = "Neon IO/Optional legacy services")]
    public sealed class NeonServiceSettings : ScriptableObject
    {
        [Tooltip("Requires the original Kongregate host integration and a working PHP backend.")]
        public bool enableLegacyServices;
        public string backendUrl = "";
        [Range(3, 30)] public int requestTimeoutSeconds = 10;
        static NeonServiceSettings cached;
        static bool loaded;

        public static NeonServiceSettings Current
        {
            get
            {
                if (!loaded)
                {
                    cached = Resources.Load<NeonServiceSettings>("NeonServiceSettings");
                    loaded = true;
                }
                return cached;
            }
        }
        public static bool LegacyEnabled => Current != null && Current.enableLegacyServices;
        public static int TimeoutSeconds => Current != null ? Mathf.Clamp(Current.requestTimeoutSeconds, 3, 30) : 10;
        public static string BackendUrl => Current != null ? Current.backendUrl.TrimEnd('/') + "/" : "";
    }
}
