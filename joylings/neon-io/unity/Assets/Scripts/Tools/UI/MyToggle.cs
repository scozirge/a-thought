using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
namespace Scoz.Func
{
    public class MyToggle : Toggle
    {

        public Graphic OffGraphic;
        public string UIString;

        protected override void OnEnable()
        {
            base.OnEnable();
            if (!Application.isPlaying)
                return;
        }
        public void ValueChange()
        {
            OffGraphic.gameObject.SetActive(!isOn);
        }
    }
}
