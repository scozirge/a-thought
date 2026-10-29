using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
using LitJson;
using System;

namespace Scoz.Func
{
    public class FeatureData : Data
    {
        #region Public Field
        public string Name
        {
            get
            {
                if (!GameDictionary.String_FeatureDic.ContainsKey(ID))
                {
                    Debug.LogWarning(string.Format("{0}表不包含{1}的文字資料", DataName, ID));
                    return "NullText";
                }
                return string.Format(GameDictionary.String_FeatureDic[ID].GetString(0, MyPlayer.UseLanguage));
            }
        }
        public string Description
        {
            get
            {
                if (!GameDictionary.String_FeatureDic.ContainsKey(ID))
                {
                    Debug.LogWarning(string.Format("{0}表不包含{1}的文字資料", DataName, ID));
                    return "NullText";
                }
                //string valueString = Value.ToString();
                //if (ShowPercentage)
                //valueString = Value + "%";
                return string.Format(GameDictionary.String_FeatureDic[ID].GetString(1, MyPlayer.UseLanguage));
                // return GameDictionary.String_FeatureDic[ID].GetString(MyPlayer.UseLanguage);
            }
            private set { return; }
        }
        public FeatureType MyFeatureType;
        public string SkillPrefabName
        {
            get
            {
                return string.Format("Skill-{0}", MyFeatureType);
            }
        }
        public float Value;
        public bool ShowPercentage;
        public int Star;
        public int Kred;
        public int Fee
        {
            get
            {
                int fee = 0;
                if (SoldType == Currency.Kred)
                    fee = Kred;
                else if (SoldType == Currency.Star)
                    fee = Star;
                return fee;
            }
        }
        // Test access is temporary and never added to the saved purchase list.
        bool owned;
        public bool Owned
        {
            get
            {
#if NEON_TEST_ALL_PARTS
                return true;
#else
                return owned;
#endif
            }
            set { owned = value; }
        }
        public bool ClamorOwned = false;
        public string Content = "";//喊話內容
        public Sprite IconSprite;
        public static Sprite DefaultHeadSprite = null;
        public static Sprite DefaultBodySprite = null;
        public FeaturePart MyFeaturePart;
        public Currency SoldType;
        public static List<FeatureData> HeadFeatureList = new List<FeatureData>();
        public static List<FeatureData> BodyFeatureList = new List<FeatureData>();
        public static List<FeatureData> BackFeatureList = new List<FeatureData>();
        //AI可隨機到技能
        public static List<FeatureData> HeadAIFeatureList = new List<FeatureData>();
        public static List<FeatureData> BodyAIFeatureList = new List<FeatureData>();
        public static List<FeatureData> BackAIFeatureList = new List<FeatureData>();


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
                    case "ID":
                        ID = int.Parse(item[key].ToString());
                        break;
                    case "FeatureType":
                        MyFeatureType = (FeatureType)Enum.Parse(typeof(FeatureType), item[key].ToString());
                        break;
                    case "Value":
                        Value = float.Parse(item[key].ToString());
                        break;
                    case "ShowPercentage":
                        ShowPercentage = bool.Parse(item[key].ToString());
                        break;
                    case "Star":
                        Star = int.Parse(item[key].ToString());
                        break;
                    case "Kred":
                        Kred = int.Parse(item[key].ToString());
                        break;
                    case "Icon":
                        IconSprite = Resources.Load<Sprite>(string.Format("Images/Role/{0}/{1}", MyFeaturePart, item[key].ToString()));
                        if (IconSprite == null)
                            Debug.LogWarningFormat("<color=Red>Images/Role/{0}/{1}</color>", MyFeaturePart, item[key].ToString());
                        break;
                    case "FeaturePart":
                        MyFeaturePart = (FeaturePart)Enum.Parse(typeof(FeaturePart), item[key].ToString());
                        if (MyFeaturePart == FeaturePart.Head)
                            HeadFeatureList.Add(this);
                        else if (MyFeaturePart == FeaturePart.Body)
                            BodyFeatureList.Add(this);
                        else
                            BackFeatureList.Add(this);
                        break;
                    case "AINeglect":
                        if (!bool.Parse(item[key].ToString()))
                        {
                            if (MyFeaturePart == FeaturePart.Head)
                                HeadAIFeatureList.Add(this);
                            else if (MyFeaturePart == FeaturePart.Body)
                                BodyAIFeatureList.Add(this);
                            else
                                BackAIFeatureList.Add(this);
                        }
                        break;
                    case "SoldType":
                        SoldType = (Currency)Enum.Parse(typeof(Currency), item[key].ToString());
                        if (SoldType == Currency.Free)
                            Owned = true;
                        break;
                    default:
                        Debug.LogWarning(string.Format("{0}表有不明屬性:{1}", DataName, key));
                        break;
                }
            }
        }
        public static void Init()
        {
            DefaultHeadSprite=Resources.Load<Sprite>("Images/Role/Head/newbie");
            if (DefaultHeadSprite == null)
                Debug.LogWarningFormat("<color=Red>找不到資源Images/Role/Head/newbie</color>");
            DefaultBodySprite = Resources.Load<Sprite>("Images/Role/Body/newbie");
            if (DefaultBodySprite == null)
                Debug.LogWarningFormat("<color=Red>找不到資源Images/Role/Body/newbie</color>");
        }
        public static Sprite GetIconSprite(int _id)
        {
            if (!GameDictionary.FeatureDic.ContainsKey(_id))
            {
                Debug.LogWarning(string.Format("無此ID資料{0}", _id));
                return null;
            }
            return GameDictionary.FeatureDic[_id].IconSprite;
        }
        public static List<FeatureData> GetAllFeatureDatas()
        {
            return new List<FeatureData>(GameDictionary.FeatureDic.Values);
        }
        public static List<FeatureData> GetAllFeatureDatas(FeaturePart _part)
        {
            switch (_part)
            {
                case FeaturePart.Head:
                    return HeadFeatureList;
                case FeaturePart.Body:
                    return BodyFeatureList;
                case FeaturePart.Back:
                    return BackFeatureList;
                default:
                    return null;
            }
        }
        public static FeatureData GetFeatureData(int _id)
        {
            if (!GameDictionary.FeatureDic.ContainsKey(_id))
            {
                Debug.LogWarning(string.Format("無此ID資料{0}", _id));
                return null;
            }
            return GameDictionary.FeatureDic[_id];
        }
        public static FeatureData GetRandomFeatureData(FeaturePart _part)
        {
            int random = 0;
            switch (_part)
            {
                case FeaturePart.Head:
                    if (HeadFeatureList.Count <= 0)
                        return null;
                    random = UnityEngine.Random.Range(0, HeadFeatureList.Count);
                    return HeadFeatureList[random];
                case FeaturePart.Body:

                    if (BodyFeatureList.Count <= 0)
                        return null;
                    random = UnityEngine.Random.Range(0, BodyFeatureList.Count);
                    return BodyFeatureList[random];
                case FeaturePart.Back:
                    if (BackFeatureList.Count <= 0)
                        return null;
                    random = UnityEngine.Random.Range(0, BackFeatureList.Count);
                    return BackFeatureList[random];
                default:
                    return null;
            }
        }
        public static FeatureData GetRandomOwnedFeatureData(FeaturePart _part)
        {
            int random = 0;
            switch (_part)
            {
                case FeaturePart.Head:
                    List<FeatureData> ownedHeadFeatures = HeadFeatureList.FindAll(x => x.Owned);
                    if (ownedHeadFeatures.Count <= 0)
                        return null;
                    random = UnityEngine.Random.Range(0, ownedHeadFeatures.Count);
                    return ownedHeadFeatures[random];
                case FeaturePart.Body:
                    List<FeatureData> ownedBodyFeatures = BodyFeatureList.FindAll(x => x.Owned);
                    if (ownedBodyFeatures.Count <= 0)
                        return null;
                    random = UnityEngine.Random.Range(0, ownedBodyFeatures.Count);
                    return ownedBodyFeatures[random];
                case FeaturePart.Back:
                    List<FeatureData> ownedBackFeatures = BackFeatureList.FindAll(x => x.Owned);
                    if (ownedBackFeatures.Count <= 0)
                        return null;
                    random = UnityEngine.Random.Range(0, ownedBackFeatures.Count);
                    return ownedBackFeatures[random];
                default:
                    return null;
            }
        }
        public static FeatureData GetAIRoleRandomFeatureData(FeaturePart _part)
        {
            int random = 0;
            switch (_part)
            {
                case FeaturePart.Head:
                    if (HeadAIFeatureList.Count <= 0)
                        return null;
                    random = UnityEngine.Random.Range(0, HeadAIFeatureList.Count);
                    return HeadAIFeatureList[random];
                case FeaturePart.Body:

                    if (BodyAIFeatureList.Count <= 0)
                        return null;
                    random = UnityEngine.Random.Range(0, BodyAIFeatureList.Count);
                    return BodyAIFeatureList[random];
                case FeaturePart.Back:
                    if (BackAIFeatureList.Count <= 0)
                        return null;
                    random = UnityEngine.Random.Range(0, BackAIFeatureList.Count);
                    return BackAIFeatureList[random];
                default:
                    return null;
            }
        }
        public static string GetDescription(int _id)
        {
            if (GameDictionary.FeatureDic.ContainsKey(_id))
            {
                return GameDictionary.FeatureDic[_id].Description;
            }
            else
                Debug.LogWarning("無此FeatureData ID：" + _id);
            return "";
        }
        public void SetOwned()
        {
            Owned = true;
        }
        public void SetClamorOwned()
        {
            ClamorOwned = true;
        }
        public static void SetFeatureOwnedByID(int _id)
        {
            if (GameDictionary.FeatureDic.ContainsKey(_id))
            {
                GameDictionary.FeatureDic[_id].SetOwned();
            }
            else
                Debug.LogWarning("無此FeatureData ID：" + _id);
        }
        /*因為不能消耗低於10Kreds，所以移除這項
        public static void SetFeatureClamorOwnedByID(int _id)
        {
            if (GameDictionary.FeatureDic.ContainsKey(_id))
            {
                GameDictionary.FeatureDic[_id].SetClamorOwned();
            }
            else
                Debug.LogWarning("無此FeatureData ID：" + _id);
        }
        */
        public static string GetFeatureClamor(int _id)
        {
            FeatureData data = GetFeatureData(_id);
            if (data != null)
                return data.Content;
            return "";
        }
        #endregion

        #region Private Func
        #endregion
    }
}
