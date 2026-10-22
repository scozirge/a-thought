using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using System;
namespace Starbro.NeonIO
{
    public class GameManager : MonoBehaviour
    {
        #region Public Field
        public static LoadingCheck InitCheck = new LoadingCheck("GameManager", false);
        public static GameManager Myself;

        #endregion

        #region Private Field
        [LabelOverride("除錯工具物件")]
        [SerializeField]
        Debugger DebuggerPrefab = null;
        [LabelOverride("遊戲字典物件")]
        [SerializeField]
        GameDictionary GameDicPrefab = null;
        [LabelOverride("彈出視窗物件")]
        [SerializeField]
        PopupUI PopUIPrefab = null;
        [LabelOverride("KG Script")]
        [SerializeField]
        KongregateAPIBehaviour KG=null;
        [LabelOverride("ServerRequest Script")]
        [SerializeField]
        ServerRequest MyServerRequest = null;
        #endregion

        #region MonoBehaviour Func
        void OnApplicationPause(bool paused)
        {
            if (paused) MyPlayer.SaveLocalProgress();
        }
        void OnApplicationQuit()
        {
            MyPlayer.SaveLocalProgress();
        }
        #endregion

        #region Public Func
        public static void DeployGameManager()
        {
            GameManager gmPrefab = Resources.Load<GameManager>("Gameobjects/GameManager");
            GameManager gm = Instantiate(gmPrefab, Vector3.zero, Quaternion.identity) as GameManager;
            gm.transform.position = Vector3.zero; ;
            gm.Init();
        }
        
        #endregion

        #region Private Func
        void Init()
        {
            if (InitCheck.Finished)
                return;
            Myself = this;
            if (!Debugger.IsSpawn)
                DeployDebugger();
            if (!GameDictionary.IsInit)
                DeployGameDictionary();
            if (!PopupUI.IsInit)
                DeployPopupUI();
            AudioPlayer.InstantiateAudioManager();
            if (!ServerRequest.IsInit && MyServerRequest != null)
                MyServerRequest.Init();
            if (!KongregateAPIBehaviour.IsInit && KG != null)
                KG.Init();
            DontDestroyOnLoad(gameObject);
            InitCheck.Finished = true;
            UnityAnalyst.SendEnterGame();
            Debug.Log("GameManager Inited");
        }
        void DeployDebugger()
        {
            GameObject go = Instantiate(DebuggerPrefab.gameObject, Vector3.zero, Quaternion.identity) as GameObject;
            go.transform.position = Vector3.zero;
        }
        void DeployGameDictionary()
        {
            GameObject go = Instantiate(GameDicPrefab.gameObject, Vector3.zero, Quaternion.identity) as GameObject;
            go.transform.position = Vector3.zero;
            go.GetComponent<GameDictionary>().InitDic();
        }
        void DeployPopupUI()
        {
            PopupUI ppui = Instantiate(PopUIPrefab, Vector3.zero, Quaternion.identity) as PopupUI;
            ppui.transform.position = Vector3.zero; ;
            ppui.Init();
        }
        #endregion
    }
}
