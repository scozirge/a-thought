using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Scoz.Func
{
    //Casting and receiving shadows is disabled on SpriteRenderer by default, because it's not a common use case.
    //And This script is aim to active casting and receiving shadow.
    public class SpriteShadow : MonoBehaviour
    {
        public ShadowCastingMode CastShadow = ShadowCastingMode.Off;
        public bool ReceiveShadow = false;
        // Start is called before the first frame update
        void Start()
        {
            if (GetComponent<Renderer>() == null)
                return;
            if (CastShadow != ShadowCastingMode.Off)
            {
                GetComponent<Renderer>().shadowCastingMode = CastShadow;
            }
            if (ReceiveShadow)
            {
                GetComponent<Renderer>().receiveShadows = ReceiveShadow;
            }

        }
    }
}
