using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    [System.Serializable]
    public class KeyWeight
    {
        [SerializeField]
        public string Key;
        [SerializeField]
        public byte Weight;
    }
}