using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    public static class Vector
	{
        #region Public Field
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        #endregion

        #region Public Func
        public static Vector3 GetCenterOfVectors(params Vector3[] vectors)
        {
            Vector3 sum = Vector3.zero;
            if (vectors == null || vectors.Length == 0)
            {
                return sum;
            }

            foreach (Vector3 vec in vectors)
            {
                sum += vec;
            }
            return sum / vectors.Length;
        }
        #endregion

        #region Private Func
        #endregion
    }
}
