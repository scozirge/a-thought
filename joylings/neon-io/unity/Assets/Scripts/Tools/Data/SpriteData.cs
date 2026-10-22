using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    [System.Serializable]
    public class SpriteData
    {
        [Tooltip("圖像名稱")]
        [SerializeField]
        public string Name;
        [Tooltip("粒子物件")]
        [SerializeField]
        public Sprite MySprite;
    }
}
