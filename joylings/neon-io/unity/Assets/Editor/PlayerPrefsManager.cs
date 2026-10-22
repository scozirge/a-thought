using UnityEngine;
using UnityEditor;
using System.Collections.Generic;
using System.Linq;

namespace Starbro.NeonIO {
	public class PlayerPrefsManager : MonoBehaviour
	{
        #region Public Field
        [MenuItem("Edit/Clear PlayerPrefs")]
        public static void DeletePlayerPrefs()
        {
            PlayerPrefs.DeleteAll();
            Debug.Log("Clear PlayerPrefs Data!");
        }
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        #endregion

        #region Public Func
        #endregion

        #region Private Func
        #endregion
    }
}
