using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    public class ResourceGetter : MonoBehaviour
    {
        #region Public Field
        public static Sprite GetSprite(string _location)
        {
            Sprite s = Resources.Load<Sprite>(_location);
            return s;
        }
        public static AudioClip GetAudioClip(string _name)
        {
            return Resources.Load<AudioClip>(string.Format("Sounds/{0}", _name));
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
