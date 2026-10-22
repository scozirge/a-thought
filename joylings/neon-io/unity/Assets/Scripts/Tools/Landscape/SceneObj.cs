using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;

namespace Scoz.Func
{
    public class SceneObj : MonoBehaviour
    {
        public bool IsFG;
        public bool ToTransparent = true;

        SpriteRenderer[] MySRs;

        private void Awake()
        {
            if (IsFG)
            {
                MySRs = GetComponentsInChildren<SpriteRenderer>();
            }

        }

        public void SetToTransparent(bool _bool)
        {
            if (!ToTransparent)
                return;
            if (MySRs == null)
                return;
            float transparency = 1;
            if (_bool)
                transparency = 0.4f;
            for (int i = 0; i < MySRs.Length; i++)
            {
                MySRs[i].color = new Color(1f, 1f, 1f, transparency);
            }
        }
    }
}
