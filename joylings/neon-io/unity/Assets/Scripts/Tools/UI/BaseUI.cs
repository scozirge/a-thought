using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using UnityEngine.UI;

namespace Starbro.NeonIO
{
    public class BaseUI : MonoBehaviour
    {
        public static BaseUI Myself = null;
        public bool IsInit = false;


        protected virtual void OnEnable()
        {
            if (!IsInit)
            {
                Myself = this;
                IsInit = true;
                MyText.AddRefreshFunc(RefreshText);
            }
            RefreshText();
        }
        protected virtual void OnDisable()
        {

        }
        protected virtual void OnDestroy()
        {
            MyText.RemoveRefreshFunc(RefreshText);
        }
        protected virtual void Update()
        { 
        }
        public virtual void RefreshText()
        {
        }

        public virtual void SetActive(bool _bool)
        {
            gameObject.SetActive(_bool);
        }
    }
}
