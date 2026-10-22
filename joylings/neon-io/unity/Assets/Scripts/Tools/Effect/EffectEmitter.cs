using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
using Neon.Astral;
namespace Scoz.Func
{
    public class EffectEmitter : MonoBehaviour
    {
        static Transform MySelf;

        void Awake()
        {
            MySelf = transform;
        }
        public static ParticleManager EmitParticleFromDic(string _effectName, Vector3 _pos, Vector3 _dir, Transform _parent, Force? visualForce = null)
        {
            EffectData ed = GameDictionary.GetEffect(_effectName);
            if (ed == null)
            {
                Debug.LogWarning("Unknown effect: " + _effectName);
                return null;
            }
            ParticleManager pm = EmitParticle(ed.Particle, _pos, _dir, _parent, visualForce);
            AudioPlayer.PlaySound(ed.Audio);
            return pm;
        }
        public static ParticleManager EmitParticle(string _effectName, Vector3 _pos, Vector3 _dir, Transform _parent, Force? visualForce = null)
        {
            ParticleSystem particlePrefab = Resources.Load<ParticleSystem>(string.Format("Particles/{0}/{0}", _effectName)) as ParticleSystem;
            if (particlePrefab == null)
            {
                Debug.LogWarning("No particle prefab are assigned:" + string.Format("Particles/{0}/{0}", _effectName));
                return null;
            }
            return EmitParticle(particlePrefab, _pos, _dir, _parent, visualForce);
        }
        public static ParticleManager EmitParticle(ParticleSystem _particle, Vector3 _pos, Vector3 _dir, Transform _parent, Force? visualForce = null)
        {
            if (_particle == null)
            {
                return null;
            }
            ParticleSystem particle = Instantiate(_particle, Vector3.zero, Quaternion.identity) as ParticleSystem;
            if (_parent)
                particle.transform.SetParent(_parent);
            else
                particle.transform.SetParent(MySelf);

            particle.transform.localPosition = _pos;
            particle.transform.localRotation = Quaternion.Euler(_dir);
            ParticleManager pm = particle.gameObject.GetComponent<ParticleManager>();
            if (pm == null)
                pm = particle.gameObject.AddComponent<ParticleManager>();
            pm.Init();
            if(visualForce.HasValue) FactionVisuals.Apply(particle.transform,visualForce.Value);
            else if(FactionVisuals.TryForce(_parent,out var inherited)) FactionVisuals.Apply(particle.transform,inherited);
            return pm;
        }
        public static void EmitParticleOnCircle(ParticleSystem _particle, Transform _parent, Vector2 _center, float _radius, int _number)
        {
            if (_particle == null)
            {
                return;
            }
            if (_number <= 0) return;
            float intervalAngle = 360f / _number;
            float currentAngle = 0;
            Vector2 pos = Vector2.zero;
            for (int i = 0; i < _number; i++)
            {
                pos = MyMath.GetEulerFromAngle(currentAngle).normalized * _radius;
                ParticleSystem particle = Instantiate(_particle, Vector3.zero, Quaternion.identity) as ParticleSystem;
                if (_parent)
                    particle.transform.SetParent(_parent);
                else
                    particle.transform.SetParent(MySelf);

                particle.transform.localPosition = _center + pos;
                ParticleManager pm = particle.gameObject.GetComponent<ParticleManager>();
                if (pm == null)
                    pm = particle.gameObject.AddComponent<ParticleManager>();
                pm.Init();
                currentAngle += intervalAngle;
            }
            return;
        }
    }
}
