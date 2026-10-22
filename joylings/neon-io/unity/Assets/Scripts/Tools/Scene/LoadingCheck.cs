using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    public class LoadingCheck
    {
        #region Public Field
        public string Name = "Undefined";
        public bool Finished = false;
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        #endregion

        #region Public Func
        public LoadingCheck(string _name, bool _check)
        {
            Name = _name;
            Finished = _check;
        }
        #endregion

        #region Private Func
        #endregion
    }
}
