using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using Starbro.NeonIO;

namespace Scoz.Func
{
    [RequireComponent(typeof(Animator))]
    public class ScenePlayer : MonoBehaviour
    {
        #region Public Field


        #endregion

        #region Private Field
        [SerializeField]
        Animator CutSceneAni = null;
        [SerializeField]
        GameObject LoadingGO = null;
        static MyScene NextScene;
        static List<LoadingCheck> CheckList;
        static bool KeepLoading = false;
        #endregion

        #region MonoBehaviour Func
        private void Start()
        {
            if (CutSceneAni == null)
                CutSceneAni = GetComponent<Animator>();
        }
        private void Update()
        {
            if (!KeepLoading)
                return;
            if (CheckLoadingFinish())
            {
                if (CutSceneAni) CutSceneAni.enabled = true;
                if (LoadingGO) LoadingGO.SetActive(false);
                KeepLoading = false;
                SceneManager.LoadScene((int)NextScene);
            }
        }
        #endregion

        #region Public Func
        public static void GoToScene_Static(MyScene _scene)
        {
            PopupUI.CallCutScene();
            NextScene = _scene;
            if (NextScene == MyScene.Lobby)
            {
                if(AudioPlayer.CheckMusicKeyIfExit("Lobby"))
                    return;
                AudioPlayer.StopAllMusic();
                AudioPlayer.PlayLoopMusicAtSecond_Static(GameDictionary.GetMusic("Lobby"), "Lobby", 8);
            }
        }
        public void GoToScene(MyScene _scene)
        {
            GoToScene_Static(_scene);
        }
        public static void SetCheckList(List<LoadingCheck> _checkList)
        {
            CheckList = _checkList;
        }
        bool CheckLoadingFinish()
        {
            if (CheckList == null)
                return true;
            for (int i = 0; i < CheckList.Count; i++)
            {
                if (!CheckList[i].Finished)
                {
                    return false;
                }
            }
            CheckList.Clear();
            return true;
        }
        public void LoadingHandle()
        {
            if (!CheckLoadingFinish())
            {
                if (CutSceneAni) CutSceneAni.enabled = false;
                if (LoadingGO) LoadingGO.SetActive(true);
                KeepLoading = true;
            }
            else
            {
                SceneManager.LoadScene((int)NextScene);
            }
        }
        #endregion

        #region Private Func
        #endregion
    }
}
