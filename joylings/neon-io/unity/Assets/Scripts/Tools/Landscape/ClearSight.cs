using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
namespace Scoz.Func
{
    public class ClearSight : MonoBehaviour
    {
        readonly Dictionary<Collider2D, SceneObj> contacts = new Dictionary<Collider2D, SceneObj>();
        void OnTriggerEnter2D(Collider2D _col)
        {
            if (_col.CompareTag("SceneObj"))
            {
                var scenery = _col.GetComponentInParent<SceneObj>();
                if (!scenery) return;
                contacts[_col] = scenery;
                scenery.SetToTransparent(true);
            }
        }
        void OnTriggerExit2D(Collider2D _col)
        {
            if (!contacts.TryGetValue(_col, out var scenery)) return;
            contacts.Remove(_col);
            if (scenery && !contacts.ContainsValue(scenery)) scenery.SetToTransparent(false);
        }
        void OnDisable()
        {
            foreach (var scenery in contacts.Values) if (scenery) scenery.SetToTransparent(false);
            contacts.Clear();
        }
    }
}
