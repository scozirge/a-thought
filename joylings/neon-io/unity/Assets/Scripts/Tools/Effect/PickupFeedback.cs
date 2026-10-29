using UnityEngine;
using Starbro.NeonIO;

namespace Scoz.Func
{
    // Ephemeral feedback is played by the existing reliable GainExp RPC on every viewer.
    // Keep all sub-emitters above scenery, but beneath the arena fog and HUD.
    public sealed class PickupFeedback : MonoBehaviour
    {
        public int Plays { get; private set; }
        public int VisibleRenderers { get; private set; }
        public float LastPlayed { get; private set; }
        public int PeakParticles { get; private set; }
        ParticleSystem[] systems;
        void Update()
        {
            if (systems == null) return;
            int count = 0;
            foreach (var system in systems) if (system) count += system.particleCount;
            PeakParticles = Mathf.Max(PeakParticles, count);
        }
        public static void Play(Role role, ParticleSystem prefab, AudioClip sound)
        {
            var tracker = role.GetComponent<PickupFeedback>();
            if (!tracker) tracker = role.gameObject.AddComponent<PickupFeedback>();
            var effect = EffectEmitter.EmitParticle(prefab, Vector3.zero, Vector3.zero, role.transform, role.MyForce);
            tracker.VisibleRenderers = 0;
            if (effect)
            {
                effect.name = "Star pickup feedback";
                foreach (var renderer in effect.GetComponentsInChildren<ParticleSystemRenderer>(true))
                {
                    renderer.sortingLayerName = "Foreground";
                    renderer.sortingOrder = 30000;
                    renderer.enabled = true;
                    tracker.VisibleRenderers++;
                }
                // The legacy root emitter had a different sorting layer from its children.
                // Explicitly restart every child so remote viewers get the same visible burst.
                effect.MyParticle.Play(true);
                tracker.systems = effect.GetComponentsInChildren<ParticleSystem>(true);
                tracker.PeakParticles = 0;
                tracker.Plays++; tracker.LastPlayed = Time.unscaledTime;
            }
            // Nearby opponents remain visible without their pickups spamming the local UI sound.
            if (sound && role.MyForce == Force.Player) AudioPlayer.PlaySound(sound);
        }
    }
}
