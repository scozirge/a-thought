using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System;
using System.Linq;
namespace Scoz.Func
{
    public partial class GameDictionary : MonoBehaviour
    {
        //字典
        public static Dictionary<string, GameSettingData> GameSettingDic = new Dictionary<string, GameSettingData>();
        public static Dictionary<int, FeatureData> FeatureDic = new Dictionary<int, FeatureData>();

        //Case表
        //public static Dictionary<int, CaseTableData> CaseTableDic;

        //String
        public static Dictionary<int, StringData> String_FeatureDic;
        public static Dictionary<string, StringData> String_UIDic;
        ///// <summary>
        ///// 將Json資料寫入字典裡
        ///// </summary>
        static void LoadJsonDataToDic()
        {
            //字典
            Data.SetKeyValueData<GameSettingData>( "GameSetting");
            Data.SetData(FeatureDic,"Feature");
            FeatureData.Init();

            //EnemyDic = new Dictionary<int, EnemyData>();
            //EnemyData.SetData(EnemyDic, "Enemy");


            //Case
            //CaseTableDic = new Dictionary<int, CaseTableData>();
            //CaseTableData.SetData(CaseTableDic);

            //String
            String_FeatureDic = StringData.GetStringDic_IntKey("String_Feature");
            String_UIDic = StringData.GetStringDic("String_UI");
        }


    }
}
