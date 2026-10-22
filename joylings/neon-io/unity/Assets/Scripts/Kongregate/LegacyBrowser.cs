using System.Runtime.InteropServices;
using UnityEngine;

namespace Starbro.NeonIO
{
    /// <summary>Optional bridge for the original Kongregate host page.</summary>
    public static class LegacyBrowser
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        static extern void NeonLegacyEvaluate(string javascript);
#endif

        public static void Evaluate(string javascript)
        {
            if (KongregateAPIBehaviour.UsesLocalProfile) return;
#if UNITY_WEBGL && !UNITY_EDITOR
            NeonLegacyEvaluate(javascript);
#endif
        }
    }
}
