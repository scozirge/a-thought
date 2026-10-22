using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Scoz.Func
{
    public class BattleLogSpawner : ItemSpawner<LogItem>
    {
        #region Public Field
        [SerializeField]
        GameObject LogWindow = null;
        [SerializeField]
        ScrollRect MyScroll = null;
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        #endregion

        #region Public Func
        public void ActiveLogWindow(bool _active)
        {
            LogWindow.SetActive(_active);
        }
        #endregion
        #region Private Func
        public void SpawnLog(string _logString)
        {
            string myLog = _logString;
            LogItem li = Spawn<LogItem>();
            li.Init(myLog);
            MyScroll.verticalNormalizedPosition = 0;
        }
        #endregion
    }
}
