using PlayerPrefs = Neon.ProfilePreferences;
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System;
using Neon.Networking;
using Starbro.NeonIO;
namespace Scoz.Func
{
    public partial class MyPlayer
    {
        public static string Name { get; private set; }
        public static string KGName { get; private set; }
        public static int KGID { get; private set; }
        public static int DBID { get; private set; }
        public static int PayKreds { get; private set; }
        public static int Star { get; private set; }
        public static int ChallengeWinningStreak { get; private set; }
        public static FeatureData[] ChallengeSelectFeatures = new FeatureData[5];
        public static string OwnStarFeatureStr = "";
        public static bool[] ClamorUnlock = new bool[6] { true, false, false, false, false, false, };
        public static string OwnGeneralClamorStr = "";
        public static string[] GeneralClamorContents = new string[6] { "", "", "", "", "", "" };
        public static bool HeadSpellClamorUnlock = false;
        public static bool BodySpellClamorUnlock = false;
        public static bool BackSpellClamorUnlock = false;
        public static int MaxKill { get; private set; }

        public static Language UseLanguage { get; private set; }
        public static int ChooseBattleSong { get; private set; }


        public static LoadingCheck CheckInitPlayerData = new LoadingCheck("InitPlayerData", false);
        public static LoadingCheck CheckInitPlayerItem = new LoadingCheck("InitPlayerItem", false);
        public static LoadingCheck CheckInitKGStatistics = new LoadingCheck("InitKGStatistics", false);

        public static void GetLocoData()
        {
            Language fallbackLanguage = Application.systemLanguage == SystemLanguage.Chinese
                || Application.systemLanguage == SystemLanguage.ChineseTraditional
                || Application.systemLanguage == SystemLanguage.ChineseSimplified ? Language.Chinese : Language.English;
            int savedLanguage = PlayerPrefs.GetInt(LocoData.UseLanguage.ToString(), (int)fallbackLanguage);
            UseLanguage = Enum.IsDefined(typeof(Language), savedLanguage) ? (Language)savedLanguage : fallbackLanguage;
            Name = StringData.GetString("Guest");
            KGName = "";
            for (int i = 0; i < GeneralClamorContents.Length; i++)
                GeneralClamorContents[i] = StringData.GetString(string.Format("GeneralClamor{0}", i));
            //讀取本機音樂
            if (PlayerPrefs.HasKey(LocoData.MusicVolume.ToString()))
                AudioPlayer.SetMusicVolume(PlayerPrefs.GetFloat(LocoData.MusicVolume.ToString()));
            else
                SetMusicVolume(1f);
            //讀取本機音效
            if (PlayerPrefs.HasKey(LocoData.SoundVolume.ToString()))
                AudioPlayer.SetSoundVolume(PlayerPrefs.GetFloat(LocoData.SoundVolume.ToString()));
            else
                SetSoundVolume(0.5f);
            //讀取本機戰鬥音樂選擇
            if (PlayerPrefs.HasKey(LocoData.ChooseBattleSong.ToString()))
                ChooseBattleSong = PlayerPrefs.GetInt(LocoData.ChooseBattleSong.ToString());
            else
                SetChooseBattleSong(1);
            //讀取本機挑戰選擇技能
            ChallengeSelectFeatures = ParseChallengeLoadout(PlayerPrefs.GetString(LocoData.ChallengeSelectFeature.ToString(), ""));
            //如果沒有登入KG才抓取本機資料
            if (!KongregateAPIBehaviour.KGIsLogin)
            {
                if (PlayerPrefs.HasKey(LocoData.Name.ToString()))
                {
                    Name = PlayerPrefs.GetString(LocoData.Name.ToString());
                }
                if (PlayerPrefs.HasKey(LocoData.Star.ToString()))
                {
                    Star = Mathf.Max(0, PlayerPrefs.GetInt(LocoData.Star.ToString()));
                }
                if (PlayerPrefs.HasKey(LocoData.FeatureData.ToString()))
                {
                    OwnStarFeatureStr = PlayerPrefs.GetString(LocoData.FeatureData.ToString());
                    SetStarFeatureFromStr(OwnStarFeatureStr);
                }
                if (PlayerPrefs.HasKey(LocoData.ClamorData.ToString()))
                {
                    OwnGeneralClamorStr = PlayerPrefs.GetString(LocoData.ClamorData.ToString());
                    SetOwnGeneralClamorFromStr(OwnGeneralClamorStr);
                }
            }
            if (KongregateAPIBehaviour.UsesLocalProfile) LoadLocalProgress();
            for (int slot = 0; slot < ChallengeSelectFeatures.Length; slot++)
            {
                var selected = ChallengeSelectFeatures[slot];
                if (selected == null || !selected.Owned)
                {
                    int fallback = selected == null ? 5 : selected.MyFeaturePart == FeaturePart.Body ? 103 : selected.MyFeaturePart == FeaturePart.Back ? 213 : 5;
                    ChallengeSelectFeatures[slot] = FeatureData.GetFeatureData(fallback);
                }
            }
            PhotonNetwork.NickName = Name;
            Debug.Log("Loading LocoData done");
        }
        static void SetOwnGeneralClamorFromStr(string _str)
        {
            if (_str == "")
                return;
            string[] unlockClarmorIds = _str.Split('/');
            for (int i = 0; i < unlockClarmorIds.Length; i++)
            {
                int clamorId;
                if (int.TryParse(unlockClarmorIds[i], out clamorId) && clamorId < ClamorUnlock.Length && clamorId >= 0)
                    ClamorUnlock[clamorId] = true;
                else
                    Debug.LogError("OwnedGeneralClamorStr錯誤:" + _str);
            }
        }
        static void SetStarFeatureFromStr(string _str)
        {
            if (_str != "")
            {
                string[] featureIDs = _str.Split('/');
                for (int i = 0; i < featureIDs.Length; i++)
                {
                    int id;
                    if (int.TryParse(featureIDs[i], out id) && GameDictionary.FeatureDic.ContainsKey(id))
                        FeatureData.SetFeatureOwnedByID(id);
                }
            }
        }
        /// <summary>
        /// 設定語言
        /// </summary>
        public static void SetLanguage(Language _language)
        {
            if (!Enum.IsDefined(typeof(Language), _language)) return;
            if (UseLanguage == _language)
                return;
            UseLanguage = _language;
            MyText.RefreshActivityTexts();
            PlayerPrefs.SetInt(LocoData.UseLanguage.ToString(), (int)UseLanguage);
            UnityAnalyst.SendChangeLanguage(UseLanguage);
        }
        public static void SetName(string _name)
        {
            Name = _name;
            PlayerPrefs.SetString(LocoData.Name.ToString(), _name);
            PhotonNetwork.NickName = _name;
        }
        public static void SetSoundVolume(float _volume)
        {
            AudioPlayer.SetSoundVolume(_volume);
            PlayerPrefs.SetFloat(LocoData.SoundVolume.ToString(), _volume);
        }
        public static void SetMusicVolume(float _volume)
        {
            AudioPlayer.SetMusicVolume(_volume);
            PlayerPrefs.SetFloat(LocoData.MusicVolume.ToString(), _volume);
        }
        public static void SetChooseBattleSong(int _index)
        {
            ChooseBattleSong = _index;
            PlayerPrefs.SetInt(LocoData.ChooseBattleSong.ToString(), ChooseBattleSong);
        }
        public static void ClearLocoData()
        {
            PlayerPrefs.DeleteAll();
            /*
            foreach (int i in Enum.GetValues(typeof(LocoData)))
            {
                PlayerPrefs.DeleteKey(((LocoData)i).ToString());
            }
             */
            Debug.Log("Clear PlayerPrefs Data!");
        }
        public static void SetChallengeSelectFeatures(FeatureData[] _datas)
        {
            if (_datas.Length != 5)
                return;
            string str = "";
            for (int i = 0; i < _datas.Length; i++)
            {

                if (!GameDictionary.FeatureDic.ContainsKey(_datas[i].ID))
                    return;
                else
                {
                    if (i != 0)
                        str += ",";
                    str += _datas[i].ID.ToString();
                }
            }
            ChallengeSelectFeatures = _datas;
            PlayerPrefs.SetString(LocoData.ChallengeSelectFeature.ToString(), str);
        }
        public static void AddPayKreds(int _value)
        {
            if (_value == 0)
                return;
            PayKreds += _value;
        }
        public static void SetPayKreds(int _value)
        {
            PayKreds = _value;
        }
        public static void AddStar(int _value)
        {
            if (_value == 0)
                return;
            Star += _value;
            if (Star < 0)
                Star = 0;
            if (!KongregateAPIBehaviour.KGIsLogin)
                PlayerPrefs.SetInt(LocoData.Star.ToString(), Star);
        }
        public static void SetStar(int _value)
        {
            Star = Mathf.Max(0, _value);
            if (!KongregateAPIBehaviour.KGIsLogin)
                PlayerPrefs.SetInt(LocoData.Star.ToString(), Star);
        }
        public static void SetMaxKill(int _kill)
        {
            if (_kill > MaxKill)
            {
                MaxKill = _kill;
            }
        }
        public static void AddChallengeWinningStreak(int _value)
        {
            ChallengeWinningStreak = Mathf.Max(0, ChallengeWinningStreak + _value);
            SaveLocalProgress();
        }
        public static void SetChallengeWinningStreak(int _value)
        {
            ChallengeWinningStreak = Mathf.Max(0, _value);
            SaveLocalProgress();
        }
        public static void SetKongregateUserData(string _userName, int _id)
        {
            KGName = _userName;
            KGID = _id;
            Name = KGName;
            PhotonNetwork.NickName = Name;
        }
        public static void InitKGUserItem(string _dataStr)
        {
            if (_dataStr != "")
            {
                //163697,1,,/163698,2,,/164105,3,,
                //Debug.Log(_dataStr);
                string[] items = _dataStr.Split('/');
                Dictionary<int, int> payTypeCount = new Dictionary<int, int>();
                for (int i = 0; i < items.Length; i++)
                {
                    string[] itemData = items[i].Split(',');
                    string id = itemData[0];
                    if (id == GameSettingData.HeadSpellClamorKGShopID)//解鎖技能喊話
                    {
                        HeadSpellClamorUnlock = true;
                    }
                    else if (id == GameSettingData.BodySpellClamorKGShopID)//解鎖技能喊話
                    {
                        BodySpellClamorUnlock = true;
                    }
                    else if (id == GameSettingData.BackSpellClamorKGShopID)//解鎖技能喊話
                    {
                        BackSpellClamorUnlock = true;
                    }
                    else
                    {
                        int number;
                        bool isNumeric = int.TryParse(id, out number);
                        if (isNumeric)
                        {
                            FeatureData.SetFeatureOwnedByID(number);
                        }
                    }
                }
            }
            CheckInitPlayerItem.Finished = true;
            Debug.Log("InitPlayerItemFinish!");
        }
        public static void InitPlayerData(string[] _data)
        {
            DBID = int.Parse(_data[0]);
            SetPayKreds(int.Parse(_data[1]));
            SetStar(int.Parse(_data[2]));
            //Feature
            OwnStarFeatureStr = _data[3];
            SetStarFeatureFromStr(OwnStarFeatureStr);
            //MaxKill
            MaxKill = int.Parse(_data[4]);
            //GeneralClamor
            OwnGeneralClamorStr = _data[5];
            string clamorsStr = _data[6];
            ChallengeWinningStreak = int.Parse(_data[7]);
            if (clamorsStr != "")
            {
                string[] clamorsData = clamorsStr.Split('/');
                for (int i = 0; i < clamorsData.Length; i++)
                {
                    string[] clamorPairs = clamorsData[i].Split('-');
                    if (clamorPairs[0].Contains("spellclamor"))//技能喊話
                    {
                        int triggerID = int.Parse(clamorPairs[0].Replace("spellclamor", ""));
                        FeatureData featureData = FeatureData.GetFeatureData(triggerID);
                        if (featureData != null)
                            featureData.Content = clamorPairs[1];
                    }
                    else//一般喊話
                    {
                        int triggerID = 0;
                        bool isNumeric = int.TryParse(clamorPairs[0], out triggerID);
                        if (isNumeric)
                            GeneralClamorContents[triggerID] = clamorPairs[1];
                    }
                }
            }
            SetOwnGeneralClamorFromStr(OwnGeneralClamorStr);
            CheckInitPlayerData.Finished = true;
            Debug.Log("InitPlayerDataFinish!");
        }
        public static void PurchaseFeature(int _id)
        {
            if (!GameDictionary.FeatureDic.ContainsKey(_id))
                return;
            FeatureData featureData = FeatureData.GetFeatureData(_id);
            if (featureData == null || featureData.Owned) return;
            if (featureData.SoldType == Currency.Star && Star < featureData.Star) return;
            if (featureData.SoldType == Currency.Kred && KongregateAPIBehaviour.UsesLocalProfile)
            {
                KongregateAPIBehaviour.ShowLegacyServiceUnavailable();
                return;
            }
            FeatureData.SetFeatureOwnedByID(_id);

            switch (featureData.SoldType)
            {
                case Currency.Star:
                    AddStar(-featureData.Star);
                    //設定擁有的遊戲幣Feature字串
                    if (OwnStarFeatureStr != "")
                        OwnStarFeatureStr += "/";
                    OwnStarFeatureStr += _id.ToString();
                    UnityAnalyst.SendPurchaseStarItem(MyPlayer.KGName, _id, featureData.Star);
                    break;
                case Currency.Kred:
                    AddPayKreds(featureData.Kred);
                    break;
            }

            if (KongregateAPIBehaviour.KGIsLogin)
                ServerRequest.PurchaseFeature(_id);
            else if (featureData.SoldType == Currency.Star)
            {
                PlayerPrefs.SetString(LocoData.FeatureData.ToString(), OwnStarFeatureStr);
                SaveLocalProgress();
                ShopUI.PlayPurchaseEffect(_id);
            }

        }
        public static void PurchaseClamor(int _id)
        {
                if (_id <= 0 || _id >= ClamorUnlock.Length || ClamorUnlock[_id]
                    || Star < GameSettingData.GeneralClamorStar)
                    return;
                AddStar(-GameSettingData.GeneralClamorStar);
                //設定擁有的遊戲幣Feature字串
                if (OwnGeneralClamorStr != "")
                    OwnGeneralClamorStr += "/";
                OwnGeneralClamorStr += _id.ToString();
                SetOwnGeneralClamorFromStr(OwnGeneralClamorStr);
                UnityAnalyst.SendPurchaseStarClamor(MyPlayer.KGName, _id, GameSettingData.GeneralClamorStar);
            if (!KongregateAPIBehaviour.KGIsLogin)
            {
                PlayerPrefs.SetString(LocoData.ClamorData.ToString(), OwnGeneralClamorStr);
                SaveLocalProgress();
                ClamorUI.RefreshUI_Static();
            }
            else
            {
                ServerRequest.PurchaseClamor(false);
            }
            ClamorUI.RefreshUI_Static();
        }
        public static void PurchaseSpellClamor(string _purchaseID)
        {
            switch (_purchaseID)
            {
                case "headspellclamorkreds":
                    HeadSpellClamorUnlock = true;
                    AddPayKreds(GameSettingData.HeadSpellClamorKreds);
                    ServerRequest.PurchaseClamor(true);
                    break;
                case "bodyspellclamorkreds":
                    BodySpellClamorUnlock = true;
                    AddPayKreds(GameSettingData.BodySpellClamorKreds);
                    ServerRequest.PurchaseClamor(true);
                    break;
                case "backspellclamorkreds":
                    BackSpellClamorUnlock = true;
                    AddPayKreds(GameSettingData.BackSpellClamorKreds);
                    ServerRequest.PurchaseClamor(true);
                    break;
            }
        }
        public static void PurchaseRevive()
        {
            AddPayKreds(GameSettingData.ReviveKreds);//要改這個要連同kongregate上的item價錢一起改
            if (KongregateAPIBehaviour.KGIsLogin)
                ServerRequest.PurchaseRevive();
        }
        public static void PurchasePremium()
        {
            AddPayKreds(GameSettingData.PremiumKreds);//要改這個要連同kongregate上的item價錢一起改
            if (KongregateAPIBehaviour.KGIsLogin)
                ServerRequest.PurchasePremium();
        }
        public static void MatchSettlement(int _addStar, int _kill)
        {
            AddStar(_addStar);
            SetMaxKill(_kill);
            SaveLocalProgress();
            if (KongregateAPIBehaviour.KGIsLogin)
                ServerRequest.MatchSettlement();
        }
        public static void ChallengeSettlement(int _addStar)
        {
            AddStar(_addStar);
            SaveLocalProgress();
            if (KongregateAPIBehaviour.KGIsLogin)
                ServerRequest.MatchSettlement();
        }
    }
}
