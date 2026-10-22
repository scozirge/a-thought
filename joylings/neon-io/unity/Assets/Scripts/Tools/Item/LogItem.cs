using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Scoz.Func
{
    public class LogItem : Item
    {
        #region Public Field
        [SerializeField]
        Text LogText = null;
        #endregion

        #region Private Field
        public string Log { get; private set; }
        #endregion

        #region MonoBehaviour Func
        #endregion

        #region Public Func
        public void Init(string _log)
        {
            Log = _log;
            RefreshItem();
        }
        public override void RefreshItem()
        {
            base.RefreshItem();
            LogText.text = Log;
        }
        #endregion

        #region Private Func
        #endregion
    }
}
