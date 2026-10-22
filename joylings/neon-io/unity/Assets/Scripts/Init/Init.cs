using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
namespace Starbro.NeonIO
{
    public class Init : MonoBehaviour
    {
        #region Public Field
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        private void Start()
        {
            if (!GameManager.InitCheck.Finished)
                GameManager.DeployGameManager();
            List<LoadingCheck> checkList = new List<LoadingCheck>();
            checkList.Add(GameManager.InitCheck);
            checkList.Add(MyPlayer.CheckInitPlayerItem);
            checkList.Add(MyPlayer.CheckInitPlayerData);
            // Optional remote leaderboards load independently; they must not block entering the game.
            ScenePlayer.SetCheckList(checkList);
            AudioPlayer.StopAllMusic();
            AudioPlayer.PlayLoopMusic_Static(GameDictionary.GetMusic("Lobby"), "Lobby");
            //PhotonLauncher.Connect();
        }
        #endregion

        #region Public Func
        #endregion

        #region Private Func
        #endregion
    }
}
