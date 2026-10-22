using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Starbro.NeonIO {
	public class ParticleCallback : MonoBehaviour
	{
		#region Public Field
		#endregion
		
		#region Private Field
		#endregion

		#region MonoBehaviour Func
        void OnParticleSystemStopped()
        {
            Debug.LogFormat("特效{0}的遊戲物件(Gameobject)上的OnParticleSystemStopped()函式被呼叫了", name);
        }
        #endregion

        #region Public Func
        #endregion

        #region Private Func
        #endregion
    }
}
