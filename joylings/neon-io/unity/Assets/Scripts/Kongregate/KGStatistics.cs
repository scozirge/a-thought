using UnityEngine;
using System.Collections;
using UnityEngine.Networking;
using System;
using Scoz.Func;
using System.Collections.Generic;

namespace Starbro.NeonIO
{

    public enum KGRangeType
    {
        lifetime,
        weekly,
        daily
    }
    public partial class KongregateAPIBehaviour
    {
        static string URL = "https://api.kongregate.com/api/high_scores/{0}/{1}.json?{3}_page={2}";//右邊是範例https://api.kongregate.com/api/high_scores/lifetime/22544.json?lifetime_page=4
        public static Dictionary<KGStatistics, Dictionary<KGRangeType, List<KGStatisticsData>>> KGStatisticsDic = new Dictionary<KGStatistics, Dictionary<KGRangeType, List<KGStatisticsData>>>();

        static int CurPage = 1;
        static int MaxPage = 1;
        static int InitSetProcess = 0;



        public static void SendKGStatistics(string _name, int _value)
        {
            if (UsesLocalProfile) return;
            if (_name == null)
                return;
            if (_value < 0)
                return;
            LegacyBrowser.Evaluate(@"
        kongregate.stats.submit('" + _name + @"'," + _value + @");");
        }

        static void InitSetPlayerListFromKGStatistics()
        {
            InitSetProcess = 0;
            KGStatisticsDic.Clear();
            CurPage = 0;
            MaxPage = 4;
            NextInitSetFromKGStatistics();
        }
        static void NextInitSetFromKGStatistics()
        {
            CurPage++;
            if (CurPage <= MaxPage)
                InitStatistics();
            else
            {
                CurPage = 1;
                InitSetProcess++;
                InitStatistics();
            }
        }
        static void InitStatistics()
        {
            switch (InitSetProcess)
            {
                case 0:
                    instance.StartCoroutine(Coroutine_InitSetPlayerListFromKGStatistics(KGRangeType.lifetime, KGStatistics.Killing, CurPage));
                    break;
                case 1:
                    instance.StartCoroutine(Coroutine_InitSetPlayerListFromKGStatistics(KGRangeType.lifetime, KGStatistics.StarCollecting, CurPage));
                    break;
                case 2:
                    instance.StartCoroutine(Coroutine_InitSetPlayerListFromKGStatistics(KGRangeType.lifetime, KGStatistics.SurvivalTime, CurPage));
                    break;
                case 3:
                    instance.StartCoroutine(Coroutine_InitSetPlayerListFromKGStatistics(KGRangeType.weekly, KGStatistics.Killing, CurPage));
                    break;
                case 4:
                    instance.StartCoroutine(Coroutine_InitSetPlayerListFromKGStatistics(KGRangeType.weekly, KGStatistics.StarCollecting, CurPage));
                    break;
                case 5:
                    instance.StartCoroutine(Coroutine_InitSetPlayerListFromKGStatistics(KGRangeType.weekly, KGStatistics.SurvivalTime, CurPage));
                    break;
            }
        }
        /// <summary>
        /// 回傳
        /// </summary>
        static IEnumerator Coroutine_InitSetPlayerListFromKGStatistics(KGRangeType _rangeType, KGStatistics _type, int _page)
        {
            string rangeTypePageStr = _rangeType.ToString();
            if (_rangeType == KGRangeType.daily)
                rangeTypePageStr = "today";
            string getStrs = string.Format(URL, _rangeType, (int)_type, _page, rangeTypePageStr);
            UnityWebRequest www = UnityWebRequest.Get(getStrs);
            www.timeout = NeonServiceSettings.TimeoutSeconds;
            yield return www.SendWebRequest();
            if (www.result != UnityWebRequest.Result.Success)
            {
                Debug.LogWarning(www.error);
                MyPlayer.CheckInitKGStatistics.Finished = true;
            }
            else
            {
                string jsonDataName = _rangeType.ToString();
                if (_rangeType == KGRangeType.daily)
                    jsonDataName = "today";
                jsonDataName += "_scores";
                try
                {
                    SetStatisticsDataList(_type, _rangeType, jsonDataName, www.downloadHandler.text);
                }
                catch (Exception error)
                {
                    Debug.LogWarning("Legacy leaderboard data is unavailable: " + error.Message);
                    MyPlayer.CheckInitKGStatistics.Finished = true;
                }
                NextInitSetFromKGStatistics();
                if (InitSetProcess == 5 && _page== MaxPage)
                {
                    MyPlayer.CheckInitKGStatistics.Finished = true;
                }

                //Debug.Log(www.downloadHandler.text);
            }
            www.Dispose();
        }
        static void SetStatisticsDataList(KGStatistics _type, KGRangeType _rangeType, string _jsonDataName, string _jsonStr)
        {
            List<KGStatisticsData> dataList = Data.GetDataList<KGStatisticsData>(_jsonDataName, _jsonStr);
            if (!KGStatisticsDic.ContainsKey(_type))
            {
                KGStatisticsDic.Add(_type, new Dictionary<KGRangeType, List<KGStatisticsData>>());
                KGStatisticsDic[_type].Add(_rangeType, dataList);
            }
            else
            {
                if (!KGStatisticsDic[_type].ContainsKey(_rangeType))
                {
                    KGStatisticsDic[_type].Add(_rangeType, dataList);
                }
                else
                {
                    KGStatisticsDic[_type][_rangeType].AddRange(dataList);
                }
            }
        }

        public static List<KGStatisticsData> GetStatisticsDataList(KGStatistics _type, KGRangeType _rangeType)
        {
            if (KGStatisticsDic.ContainsKey(_type) && KGStatisticsDic[_type].ContainsKey(_rangeType))
            {
                return KGStatisticsDic[_type][_rangeType];
            }
            return new List<KGStatisticsData>();
        }
        public static string GetRandomPlayerNameFromStatistics(KGStatistics _type, KGRangeType _rangeType)
        {
            if (KGStatisticsDic.ContainsKey(_type) && KGStatisticsDic[_type].ContainsKey(_rangeType))
            {
                if (KGStatisticsDic[_type][_rangeType].Count == 0)
                {
                    Debug.LogErrorFormat("Type={0} RangeType={1}", _type, _rangeType);
                    return "";                   
                }
                int rand = UnityEngine.Random.Range(0, KGStatisticsDic[_type][_rangeType].Count);
                return KGStatisticsDic[_type][_rangeType][rand].Name;
            }
            else
            {
                Debug.LogErrorFormat("Type={0} RangeType={1}", _type, _rangeType);
            }
            return "";
        }
        public static string GetRandomPlayerNameFromKGStatistics(KGRangeType _rangeType)
        {
            if (UsesLocalProfile) return "Neon Bot " + UnityEngine.Random.Range(1, 1000);
            string name = "";
            int random = UnityEngine.Random.Range(0, 3);
            switch (random)
            {
                case 0:
                    name = GetRandomPlayerNameFromStatistics(KGStatistics.Killing, _rangeType);
                    break;
                case 1:
                    name = GetRandomPlayerNameFromStatistics(KGStatistics.StarCollecting, _rangeType);
                    break;
                case 2:
                    name = GetRandomPlayerNameFromStatistics(KGStatistics.SurvivalTime, _rangeType);
                    break;
            }
            return name;
        }

    }
}
