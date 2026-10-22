using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class EffectPlayer : MonoBehaviour
    {
        public List<EffectData> EffectList;

        void Start()
        {
            if (EffectList != null)
            {
                for (int i = 0; i < EffectList.Count; i++)
                {
                    if (EffectList[i].StartEmit)
                    {
                        Emit(EffectList[i]);
                    }

                }
            }
        }

        public void PlayEffect(string _effectKey)
        {
            if (EffectList == null)
            {
                Debug.LogWarning("EffectList is null");
                return;
            }
            for (int i = 0; i < EffectList.Count; i++)
            {
                if (EffectList[i].Name == _effectKey)
                {
                    Emit(EffectList[i]);
                    break;
                }
            }
        }

        void Emit(EffectData effect)
        {
            Force? side=Neon.Astral.FactionVisuals.TryForce(transform,out var force)?force:(Force?)null;
            EffectEmitter.EmitParticle(effect.Particle,effect.Offset,effect.Roration,effect.TargetParent,side);
        }
    }
}
