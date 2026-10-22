using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class OnPlayActive : MonoBehaviour
    {
        public bool IsOnPlayActive = false;
        // Start is called before the first frame update
        void Start()
        {
            gameObject.SetActive(IsOnPlayActive);
        }
    }
}
