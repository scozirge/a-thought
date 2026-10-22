using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
namespace Scoz.Func
{
    public class ClearSight : MonoBehaviour
    {
        void OnTriggerEnter2D(Collider2D _col)
        {
            if (_col.gameObject.tag == "SceneObj")
            {
                _col.transform.parent.GetComponent<SceneObj>().SetToTransparent(true);
            }
        }
        void OnTriggerExit2D(Collider2D _col)
        {
            if (_col.gameObject.tag == "SceneObj")
            {
                _col.transform.parent.GetComponent<SceneObj>().SetToTransparent(false);
            }
        }
    }
}
