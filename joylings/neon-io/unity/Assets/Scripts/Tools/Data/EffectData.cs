using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    [System.Serializable]
    public class EffectData
    {
        [Tooltip("特效名稱")]
        [SerializeField]
        public string Name;
        [Tooltip("粒子物件")]
        [SerializeField]
        public ParticleSystem Particle;
        [Tooltip("音效物件")]
        [SerializeField]
        public AudioClip Audio;
        [Tooltip("產生在目標身上")]
        [SerializeField]
        public Transform TargetParent;
        [Tooltip("產生相對位置")]
        [SerializeField]
        public Vector2 Offset;
        [Tooltip("旋轉")]
        [SerializeField]
        public Vector2 Roration;
        [Tooltip("有勾的話，不用被呼叫就會自動被產生")]
        public bool StartEmit = false;
    }
}
