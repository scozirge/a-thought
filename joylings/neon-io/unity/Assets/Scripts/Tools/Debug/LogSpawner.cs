using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    public class LogSpawner : ItemSpawner<LogItem>
    {
        #region Public Field
        [SerializeField]
        GameObject LogWindow = null;
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        private void OnEnable()
        {
            Application.logMessageReceived += HandleLog;
        }
        private void OnDisable()
        {
            Application.logMessageReceived -= HandleLog;
        }
        #endregion

        #region Public Func
        public void ActiveLogWindow(bool _active)
        {
            LogWindow.SetActive(_active);
        }
        #endregion
        #region Private Func
        void HandleLog(string logString, string stackTrace, LogType type)
        {
            string myLog = "";
            switch (type)
            {
                case LogType.Log:
                    myLog = string.Format("({0}) {1}", type, logString);
                    break;
                case LogType.Warning:
                    myLog = string.Format("(<color=Orange>{0}</color>) {1}", type, logString);
                    break;
                case LogType.Error:
                    myLog = string.Format("(<color=Red>{0}</color>) {1}", type,logString);
                    break;
                default:
                    myLog = string.Format("(<color=Red>{0}</color>) {1}", type, logString);
                    break;
            }

            LogItem li = Spawn<LogItem>();
            li.Init(myLog);
            LogList.Add(li);
        }
        #endregion
    }
}
