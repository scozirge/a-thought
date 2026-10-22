using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using LitJson;
namespace Scoz.Func
{

    public class Data
    {
        public static bool ShowLoadTime = true;
        public int ID;
        public string DataName;
        /// <summary>
        /// 將字典傳入，依json表設定資料，字典索引類型為int
        /// </summary>
        public static void SetData<T>(Dictionary<int, T> _dic, string _dataName) where T : Data, new()
        {
            DateTime startTime = DateTime.Now;
            string jsonStr = Resources.Load<TextAsset>(string.Format("Json/{0}", _dataName)).ToString();
            JsonData jd = JsonMapper.ToObject(jsonStr);
            JsonData items = jd[_dataName];
            for (int i = 0; i < items.Count; i++)
            {
                T data = new T();
                data.DataName = _dataName;
                data.GetDataFromJson(items[i]);
                int id = int.Parse(items[i]["ID"].ToString());
                _dic.Add(id, data as T);
            }
            DateTime endTime = DateTime.Now;
            if (ShowLoadTime)
            {
                TimeSpan spendTime = new TimeSpan(endTime.Ticks - startTime.Ticks);
                Debug.LogFormat("<color=Blue>Load {0}.json:{1}s</color>", _dataName, spendTime.TotalSeconds);
            }
        }
        /// <summary>
        /// 將字典傳入，依json表設定資料，字典索引類型為string
        /// </summary>
        public static void SetData<T>(Dictionary<string, T> _dic, string _dataName) where T : Data, new()
        {
            DateTime startTime = DateTime.Now;
            string jsonStr = Resources.Load<TextAsset>(string.Format("Json/{0}", _dataName)).ToString();
            JsonData jd = JsonMapper.ToObject(jsonStr);
            JsonData items = jd[_dataName];
            for (int i = 0; i < items.Count; i++)
            {
                T data = new T();
                data.DataName = _dataName;
                data.GetDataFromJson(items[i]);
                string id = items[i]["ID"].ToString();
                _dic.Add(id, data as T);
            }
            DateTime endTime = DateTime.Now;
            if (ShowLoadTime)
            {
                TimeSpan spendTime = new TimeSpan(endTime.Ticks - startTime.Ticks);
                Debug.LogFormat("<color=Blue>Load {0}.json:{1}s</color>", _dataName, spendTime.TotalSeconds);
            }
        }
        /// <summary>
        /// 依json表設定資料，不建立字典
        /// </summary>
        public static void SetData<T>(string _dataName) where T : Data, new()
        {
            DateTime startTime = DateTime.Now;
            string jsonStr = Resources.Load<TextAsset>(string.Format("Json/{0}", _dataName)).ToString();
            JsonData jd = JsonMapper.ToObject(jsonStr);
            JsonData items = jd[_dataName];
            for (int i = 0; i < items.Count; i++)
            {
                T data = new T();
                data.DataName = _dataName;
                data.GetDataFromJson(items[i]);
            }
            DateTime endTime = DateTime.Now;
            if (ShowLoadTime)
            {
                TimeSpan spendTime = new TimeSpan(endTime.Ticks - startTime.Ticks);
                Debug.LogFormat("<color=Blue>Load {0}.json:{1}s</color>", _dataName, spendTime.TotalSeconds);
            }
        }
        /// <summary>
        /// 將字典傳入，依json表設定資料
        /// </summary>
        public static void SetKeyValueData<T>(string _dataName) where T : Data, new()
        {
            DateTime startTime = DateTime.Now;
            string jsonStr = Resources.Load<TextAsset>(string.Format("Json/{0}", _dataName)).ToString();
            JsonData jd = JsonMapper.ToObject(jsonStr);
            JsonData items = jd[_dataName];
            for (int i = 0; i < items.Count; i++)
            {
                T data = new T();
                data.DataName = _dataName;
                data.GetDataFromJson(items[i]);
            }
            DateTime endTime = DateTime.Now;
            if (ShowLoadTime)
            {
                TimeSpan spendTime = new TimeSpan(endTime.Ticks - startTime.Ticks);
                Debug.LogFormat("<color=Blue>Load {0}.json:{1}s</color>", _dataName, spendTime.TotalSeconds);
            }
        }
        protected virtual void GetDataFromJson(JsonData _item)
        {
        }
        public static List<T> GetDataList<T>(string _dataName, string _jsonStr) where T : Data, new()
        {
            List<T> list = new List<T>();
            JsonData jd = JsonMapper.ToObject(_jsonStr);
            JsonData items = jd[_dataName];
            for (int i = 0; i < items.Count; i++)
            {
                T data = new T();
                data.DataName = _dataName;
                data.GetDataFromJson(items[i]);
                list.Add(data);
            }
            return list;
        }
    }
}
