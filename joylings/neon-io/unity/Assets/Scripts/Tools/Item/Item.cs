using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class Item : MonoBehaviour
    {
        public virtual void OnPress()
        {
        }
        public virtual void Filter(EquipType _type)
        {
        }
        public virtual void RefreshItem()
        {
        }
        public virtual void SelfDestroy()
        {
            Destroy(gameObject);
        }

    }
}
