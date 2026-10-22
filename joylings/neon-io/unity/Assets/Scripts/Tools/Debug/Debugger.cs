using UnityEngine;
using System.Collections;
using UnityEngine.UI;
using Neon.Networking;
using Starbro.NeonIO;
namespace Scoz.Func
{
    public partial class Debugger : MonoBehaviour
    {
        public static bool IsSpawn;
        public GameObject Go_DebugPanel;
        public RectTransform MyTrans;
        //public WarningBox MyLogBox;
        public Text Text_FPS;
        public bool IsLimitFPS;
        public int MaxFPS;
        //Declare these in your class
        int m_frameCounter = 0;
        float m_timeCounter = 0.0f;
        float m_lastFramerate = 0.0f;
        public float m_refreshTime = 0.5f;
        bool AlreadyShowHardwareAcceleration = false;
        MyTimer CheckFPSTimer = null;

        /// <summary>
        /// 初始化
        /// </summary>
        public void Start()
        {
            GetComponent<RectTransform>().sizeDelta = new Vector2(Screen.width, Screen.height);
            //GetComponent<Canvas>().worldCamera = GameObject.FindGameObjectWithTag("UICamera").GetComponent<Camera>();
            IsSpawn = true;
#if UNITY_WEBGL && !UNITY_EDITOR
            CheckFPSTimer = new MyTimer(10, CheckFPSToShowHardwareAccelerationTip, true, true);
#endif
            DontDestroyOnLoad(gameObject);
        }


        /// <summary>
        /// 除錯顯示控制
        /// </summary>
        public void ShowDebugPanel(bool _show)
        {
            Go_DebugPanel.SetActive(_show);
        }
        /// <summary>
        /// FPS顯示控制
        /// </summary>
        public void ShowFPS(bool _show)
        {
            Text_FPS.gameObject.SetActive(_show);
        }
        /// <summary>
        /// 是否限制FPS
        /// </summary>
        public void LimitFPS(bool _limit, int _fps)
        {
            if (_limit)
            {
                //限制FPS在30左右
                QualitySettings.vSyncCount = 0;  // VSync must be disabled
                Application.targetFrameRate = _fps;
            }
            else
            {
                QualitySettings.vSyncCount = 1;
            }
        }
        void CheckFPSToShowHardwareAccelerationTip()
        {
            if (CheckFPSTimer!=null)
            {
                if (Mathf.Round(m_lastFramerate) <30)
                {
                    PopupUI.ShowClickCancel(StringData.GetString("HardwareAcceleration"), null);
                }
                CheckFPSTimer = null;
            }
        }
        void FPSCalc()
        {
            if (Text_FPS == null)
                return;
            LimitFPS(IsLimitFPS, MaxFPS);
            if (m_timeCounter < m_refreshTime)
            {
                m_timeCounter += Time.deltaTime;
                m_frameCounter++;
            }
            else
            {
                //This code will break if you set your m_refreshTime to 0, which makes no sense.
                m_lastFramerate = (float)m_frameCounter / m_timeCounter;
                m_frameCounter = 0;
                m_timeCounter = 0.0f;
            }
            Text_FPS.text = string.Format("FPS:{0}", Mathf.Round(m_lastFramerate).ToString());
        }
        public void ShowLog(string _title, string _log)
        {
            //MyLogBox.ShowLog(_title, _log);
        }
        string InputFeatureString = "";
        public void SetCurInputFeatureStr(string _str)
        {
            InputFeatureString = _str;
        }
        public void GetFeature()
        {
            if (int.TryParse(InputFeatureString, out int _id))
            {
                if(PhotonNetwork.IsConnected)
                    BattleManager.BM.MyPlayerRole.photonView.RPC("GetFeature", RpcTarget.All, FeaturePart.Head, _id);
                 else
                    BattleManager.BM.MyPlayerRole.GetFeature(FeaturePart.Head,_id);
            }
            else
                Debug.LogWarning("要輸入數字");
        }
        void Update()
        {
            FPSCalc();
            KeyDetector();
            if (CheckFPSTimer != null)
                CheckFPSTimer.RunTimer();
        }
    }
}
