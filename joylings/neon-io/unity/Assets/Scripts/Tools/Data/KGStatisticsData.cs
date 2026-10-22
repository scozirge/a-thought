using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
using LitJson;
using System;

namespace Scoz.Func
{
    public class KGStatisticsData : Data
    {
        #region Public Field
        public string Name;
        public int Score;
        public int Rank;
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        #endregion

        #region Public Func
        protected override void GetDataFromJson(JsonData _item)
        {
            JsonData item = _item;
            foreach (string key in item.Keys)
            {
                switch (key)
                {
                    case "username":
                        Name = item[key].ToString();
                        break;
                    case "score":
                        Score = int.Parse(item[key].ToString());
                        break;
                }
            }
        }
        #endregion

        #region Private Func
        #endregion
    }
}
