using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    [System.Serializable]
    public class SoundData
    {
        [Tooltip("特效名稱")]
        [SerializeField]
        public string Name;
        [Tooltip("音效物件")]
        [SerializeField]
        public AudioClip Audio;
    }
}
