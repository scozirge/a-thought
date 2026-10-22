using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using LitJson;
namespace Scoz.Func
{
    public class StringData
    {
        public static bool ShowLoadTime = true;
        public string ID { get; private set; }
        public Dictionary<Language, string> StringDic = new Dictionary<Language, string>();
        public string ZH_TW { get; protected set; }
        public string ZH_CN { get; protected set; }
        public string EN { get; protected set; }
        public string StringType { get; protected set; }

        public StringData(JsonData _item, string _stringType)
        {
            try
            {
                JsonData item = _item;
                StringType = _stringType;
                foreach (string key in item.Keys)
                {
                    switch (key)
                    {
                        case "ID":
                            ID = item[key].ToString();
                            break;
                        case "Chinese":
                            StringDic.Add(Language.Chinese, item[key].ToString());
                            break;
                        case "English":
                            StringDic.Add(Language.English, item[key].ToString());
                            break;
                        default:
                            Debug.LogWarning(string.Format("{0}表有不明屬性:{1}", StringType, key));
                            break;
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogException(ex);
            }
        }

        /// <summary>
        /// 傳入String表名稱，並依string表資料回傳字典
        /// </summary>
        public static Dictionary<string, StringData> GetStringDic(string _dataName)
        {
            DateTime startTime = DateTime.Now;
            string jsonStr = Resources.Load<TextAsset>(string.Format("Json/{0}", _dataName)).ToString();
            JsonData jd = JsonMapper.ToObject(jsonStr);
            JsonData items = jd[_dataName];
            Dictionary<string, StringData> dic = new Dictionary<string, StringData>();
            for (int i = 0; i < items.Count; i++)
            {
                StringData data = new StringData(items[i], _dataName);
                string name = items[i]["ID"].ToString();
                if (dic.ContainsKey(name))
                {
                    Debug.LogWarning(string.Format("{0}的主屬性名稱重複", _dataName));
                    break;
                }
                dic.Add(name, data);
            }
            DateTime endTime = DateTime.Now;
            if (ShowLoadTime)
            {
                TimeSpan spendTime = new TimeSpan(endTime.Ticks - startTime.Ticks);
                Debug.LogFormat("<color=Blue>Load {0}.json:{1}s</color>", _dataName, spendTime.TotalSeconds);
            }
            return dic;
        }
        /// <summary>
        /// 傳入String表名稱，並依string表資料回傳字典
        /// </summary>
        public static Dictionary<int , StringData> GetStringDic_IntKey(string _dataName)
        {
            DateTime startTime = DateTime.Now;
            string jsonStr = Resources.Load<TextAsset>(string.Format("Json/{0}", _dataName)).ToString();
            JsonData jd = JsonMapper.ToObject(jsonStr);
            JsonData items = jd[_dataName];
            Dictionary<int, StringData> dic = new Dictionary<int, StringData>();
            for (int i = 0; i < items.Count; i++)
            {
                StringData data = new StringData(items[i], _dataName);
                int id = int.Parse(items[i]["ID"].ToString());
                if (dic.ContainsKey(id))
                {
                    Debug.LogWarning(string.Format("{0}的主屬性名稱重複", _dataName));
                    break;
                }
                dic.Add(id, data);
            }
            DateTime endTime = DateTime.Now;
            if (ShowLoadTime)
            {
                TimeSpan spendTime = new TimeSpan(endTime.Ticks - startTime.Ticks);
                Debug.LogFormat("<color=Blue>Load {0}.json:{1}s</color>", _dataName, spendTime.TotalSeconds);
            }
            return dic;
        }
        /// <summary>
        /// 取得文字
        /// </summary>
        public string GetString(Language _language)
        {
            if (StringDic.ContainsKey(_language))
                return StringDic[_language];
            else
            {
                Debug.LogWarning("無此語系文字:" + _language);
                return "Undifined";
            }
        }
        public string GetString(int _index, Language _language)
        {
            if (!StringDic.ContainsKey(_language))
            {
                Debug.LogWarning("無此語系文字:" + _language);
                return "Undifined";
            }
            return GetComplexString(_index, StringDic[_language]);
        }
        string GetComplexString(int _index, string _str)
        {
            if (_str == null || _str == "")
            {
                Debug.LogWarning("傳入字串為空值");
                return "";
            }
            string[] stringArray = TextManager.StringSplitToStringArray(_str, '/');
            if (stringArray.Length - 1 < _index || _index < 0)
            {
                Debug.LogWarning("取複合文字時發生錯誤的資料");
                return "nullText";
            }
            return stringArray[_index];
        }
        public static string GetString(string _stringKey)
        {
            if (GameDictionary.String_UIDic.ContainsKey(_stringKey))
                return GameDictionary.String_UIDic[_stringKey].GetString(MyPlayer.UseLanguage);
            else
            {
                Debug.LogWarning("不存在的文字字典索引:" + _stringKey + "。");
                return "";
            }
        }
        public enum GodClamorType
        {
            Kill,
            Die,
            Hit,
            BeHit,
            Debut,
            Spell,
        }
        public static string GetGodClamor(GodClamorType _type)
        {
            string clamor = "";
            string[] strs = null;
            switch(_type)
            {
                case GodClamorType.Kill:
                    strs = GetString("GodKillClamor").Split('/');
                    break;
                case GodClamorType.Die:
                    strs = GetString("GodDieClamor").Split('/');
                    break;
                case GodClamorType.Hit:
                    strs = GetString("GodHitClamor").Split('/');
                    break;
                case GodClamorType.BeHit:
                    strs = GetString("GodBeHitClamor").Split('/');
                    break;
                case GodClamorType.Debut:
                    strs = GetString("GodDebutClamor").Split('/');
                    break;
                case GodClamorType.Spell:
                    strs = GetString("GodSpellClamor").Split('/');
                    break;
            }
            int rand = UnityEngine.Random.Range(0, strs.Length);
            clamor = strs[rand];
            return clamor;
        }
    }
}