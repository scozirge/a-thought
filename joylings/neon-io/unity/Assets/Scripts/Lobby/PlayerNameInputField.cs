using PlayerPrefs = Neon.ProfilePreferences;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Neon.Networking;
using Scoz.Func;
namespace Starbro.NeonIO
{
    /// <summary>
    /// Player name input field. Let the user input his name, will appear above the player in the game.
    /// </summary>
    [RequireComponent(typeof(InputField))]
    public class PlayerNameInputField : MonoBehaviour
    {
        #region Public Field
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        /// <summary>
        /// MonoBehaviour method called on GameObject by Unity during initialization phase.
        /// </summary>
        void Start()
        {
            string defaultName = string.Empty;
            InputField _inputField = this.GetComponent<InputField>();
            if (_inputField != null)
            {
                if (PlayerPrefs.HasKey(LocoData.Name.ToString()))
                {
                    defaultName = PlayerPrefs.GetString(LocoData.Name.ToString());
                    _inputField.text = defaultName;
                }
            }

            PhotonNetwork.NickName = defaultName;
        }
        #endregion

        #region Public Func
        /// <summary>
        /// Sets the name of the player, and save it in the PlayerPrefs for future sessions.
        /// </summary>
        /// <param name="value">The name of the Player</param>
        public void SetPlayerName(string value)
        {
            // #Important
            if (string.IsNullOrEmpty(value))
            {
                Debug.LogError("Player Name is null or empty");
                return;
            }
            PhotonNetwork.NickName = value;
            PlayerPrefs.SetString(LocoData.Name.ToString(), value);
        }
        #endregion

        #region Private Func
        #endregion
    }
}
