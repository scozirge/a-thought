using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using UnityEngine.UI;
using System;

namespace Starbro.NeonIO
{
    public class ClamorUI : ItemSpawner<ClamorItem>
    {
        #region Public Field
        #endregion

        #region Private Field
        static ClamorUI Myself;
        [SerializeField]
        ScrollRect MyScroll = null;
        [SerializeField]
        ClamorItem[] ClamorItems = null;
        [SerializeField]
        Button SaveBtn = null;
        [SerializeField]
        float SaveCD = 60;
        MyTimer WaitToSaveTimer;
        [SerializeField]
        Text CoutDownText = null;
        [SerializeField]
        Text HeadSpellClamorTitle;
        [SerializeField]
        Text BodySpellClamorTitle;
        [SerializeField]
        Text BackSpellClamorTitle;
        [SerializeField]
        Button HeadSpellClamorUnlockBtn;
        [SerializeField]
        Button BodySpellClamorUnlockBtn;
        [SerializeField]
        Button BackSpellClamorUnlockBtn;


        List<ClamorItem> SkillClamorItemList = new List<ClamorItem>();
        Dictionary<string, string> ChangedClamorDic = new Dictionary<string, string>();
        bool IsInit = false;
        DateTime SaveTime;
        #endregion

        #region MonoBehaviour Func
        private void OnEnable()
        {
            if (!IsInit)
            {
                Myself = this;
                SpawnItem();
                IsInit = true;
                WaitToSaveTimer = new MyTimer(SaveCD, SetCanSve, UpdateCountDownText, false, false);
            }
            RefreshUI();
            ToStartOfScrollView();
            Myself.ChangedClamorDic.Clear();
            WaitToSaveTimer.SetCurTimer((float)(WaitToSaveTimer.CircleTime - SavePassTime.TotalSeconds));
            CoutDownText.gameObject.SetActive(WaitToSaveTimer.StartRunTimer);
        }
        void Update()
        {
            if (WaitToSaveTimer != null)
                WaitToSaveTimer.RunTimer();
        }
        #endregion

        #region Public Func
        public void ToStartOfScrollView()
        {
            MyScroll.horizontalNormalizedPosition = 0;
        }
        public void ToEndOfScrollView()
        {
            MyScroll.horizontalNormalizedPosition = 1;
        }
        public static void AddChangedClamor(string _key, string _content)
        {

            Debug.Log("key=" + _key + " content=" + _content);
            if (_key == "")
                return;
            if (Myself.ChangedClamorDic.ContainsKey(_key))
            {
                Myself.ChangedClamorDic[_key] = _content;
            }
            else
            {
                Myself.ChangedClamorDic.Add(_key, _content);
            }
        }

        //玩家存活時間
        public TimeSpan SavePassTime
        {
            get
            {
                return new TimeSpan(DateTime.Now.Ticks - SaveTime.Ticks);
            }
        }
        public static void SaveFinish()
        {
            Myself.UpdatePlayerClamorsChange();
            /*
            List<string> keys = new List<string>(Myself.ChangedClamorDic.Keys);
            for(int i=0;i<keys.Count;i++)
            {
                GameDictionary.FeatureDic[int.Parse(keys[i])].Content= Myself.ChangedClamorDic[keys[i]];
                Myself.SkillClamorItemList[int.Parse(keys[i])].ContentInput.text = Myself.ChangedClamorDic[keys[i]];
            }
            */
            Myself.ChangedClamorDic.Clear();
            Myself.WaitToSaveTimer.RestartCountDown();
            Myself.WaitToSaveTimer.StartRunTimer = true;
            Myself.SaveBtn.interactable = false;
            Myself.SaveTime = DateTime.Now;
            Myself.CoutDownText.gameObject.SetActive(true);
        }
        public void Save()
        {
            ServerRequest.SaveClamor(ChangedClamorDic);
        }
        public void PurchaseSpellClamor(int _type)
        {
            if (!KongregateAPIBehaviour.KGIsLogin && !KongregateAPIBehaviour.UsesLocalProfile)//要有登入kongregate才能購買商品
            {
                PopupUI.ShowConfirmCancel(StringData.GetString("KGRigister"), KongregateAPIBehaviour.KGLogin, null);
                return;
            }
            else
            {
                switch ((FeaturePart)_type)
                {
                    case FeaturePart.Head:
                        KongregateAPIBehaviour.PurchaseItem(GameSettingData.HeadSpellClamorKGShopID);
                        break;
                    case FeaturePart.Body:
                        KongregateAPIBehaviour.PurchaseItem(GameSettingData.BodySpellClamorKGShopID);
                        break;
                    case FeaturePart.Back:
                        KongregateAPIBehaviour.PurchaseItem(GameSettingData.BackSpellClamorKGShopID);
                        break;
                }
            }
        }
        #endregion

        #region Private Func

        void SpawnItem()
        {
            HeadSpellClamorTitle.transform.SetAsLastSibling();
            //Head
            List<FeatureData> featureDatas = FeatureData.GetAllFeatureDatas(FeaturePart.Head);
            for (int i = 0; i < featureDatas.Count; i++)
            {
                ClamorItem ci = Spawn<ClamorItem>();
                ci.Init(featureDatas[i]);
                SkillClamorItemList.Add(ci);
            }
            //Body
            BodySpellClamorTitle.transform.SetAsLastSibling();
            featureDatas = FeatureData.GetAllFeatureDatas(FeaturePart.Body);
            for (int i = 0; i < featureDatas.Count; i++)
            {
                ClamorItem ci = Spawn<ClamorItem>();
                ci.Init(featureDatas[i]);
                SkillClamorItemList.Add(ci);
            }
            //Back
            BackSpellClamorTitle.transform.SetAsLastSibling();
            featureDatas = FeatureData.GetAllFeatureDatas(FeaturePart.Back);
            for (int i = 0; i < featureDatas.Count; i++)
            {
                ClamorItem ci = Spawn<ClamorItem>();
                ci.Init(featureDatas[i]);
                SkillClamorItemList.Add(ci);
            }
        }
        public static void RefreshUI_Static()
        {
            Myself.RefreshUI();
        }
        void RefreshUI()
        {
            for (int i = 0; i < SkillClamorItemList.Count; i++)
            {
                SkillClamorItemList[i].gameObject.SetActive(SkillClamorItemList[i].MyFeatureData.Owned);
                SkillClamorItemList[i].RefreshItem();
            }
            RefreshClamorItems();
            LobbyUI.RefreshStar();
        }
        void RefreshClamorItems()
        {
            //技能喊話
            for (int i=0;i< SkillClamorItemList.Count;i++)
            {
                SkillClamorItemList[i].RefreshItem();
            }
            //技能喊話的解鎖按鈕
            if (MyPlayer.HeadSpellClamorUnlock)
                HeadSpellClamorTitle.color = new Color(HeadSpellClamorTitle.color.r, HeadSpellClamorTitle.color.g, HeadSpellClamorTitle.color.b, 1);
            else
                HeadSpellClamorTitle.color = new Color(HeadSpellClamorTitle.color.r, HeadSpellClamorTitle.color.g, HeadSpellClamorTitle.color.b, 0.35f);
            if (MyPlayer.BodySpellClamorUnlock)
                BodySpellClamorTitle.color = new Color(BodySpellClamorTitle.color.r, BodySpellClamorTitle.color.g, BodySpellClamorTitle.color.b, 1);
            else
                BodySpellClamorTitle.color = new Color(BodySpellClamorTitle.color.r, BodySpellClamorTitle.color.g, BodySpellClamorTitle.color.b, 0.35f);
            if (MyPlayer.BackSpellClamorUnlock)
                BackSpellClamorTitle.color = new Color(BackSpellClamorTitle.color.r, BackSpellClamorTitle.color.g, BackSpellClamorTitle.color.b, 1);
            else
                BackSpellClamorTitle.color = new Color(BackSpellClamorTitle.color.r, BackSpellClamorTitle.color.g, BackSpellClamorTitle.color.b, 0.35f);
            HeadSpellClamorUnlockBtn.gameObject.SetActive(!MyPlayer.HeadSpellClamorUnlock);
            BodySpellClamorUnlockBtn.gameObject.SetActive(!MyPlayer.BodySpellClamorUnlock);
            BackSpellClamorUnlockBtn.gameObject.SetActive(!MyPlayer.BackSpellClamorUnlock);

            //一班喊話文字
            for (int i = 0; i < ClamorItems.Length; i++)
            {
                ClamorItems[i].ContentInput.interactable = MyPlayer.ClamorUnlock[i];
                ClamorItems[i].LockBtn.gameObject.SetActive(!MyPlayer.ClamorUnlock[i]);
                if (MyPlayer.ClamorUnlock[i])
                {
                    if (MyPlayer.GeneralClamorContents[i] == "")
                        ClamorItems[i].ContentInput.text = StringData.GetString(string.Format("GeneralClamor{0}", i));
                    else
                        ClamorItems[i].ContentInput.text = MyPlayer.GeneralClamorContents[i];
                }
                else
                {
                    ClamorItems[i].ContentInput.text = "";
                }
            }
        }
        void UpdateCountDownText()
        {
            CoutDownText.text = string.Format("({0})", Mathf.RoundToInt(WaitToSaveTimer.CurTimer).ToString());
        }
        void SetCanSve()
        {
            CoutDownText.gameObject.SetActive(false);
            SaveBtn.interactable = true;
        }
        void UpdatePlayerClamorsChange()
        {
            List<string> keys = new List<string>(ChangedClamorDic.Keys);
            for (int i = 0; i < keys.Count; i++)
            {
                string key = keys[i];
                string content = ChangedClamorDic[keys[i]];
                if (key.Contains("spellclamor"))//技能喊話
                {
                    int featureID = int.Parse(key.Replace("spellclamor", ""));
                    FeatureData featureData = FeatureData.GetFeatureData(featureID);
                    if (featureData != null)
                        featureData.Content = content;
                }
                else//一般喊話
                {
                    int triggerID = int.Parse(key);
                    MyPlayer.GeneralClamorContents[triggerID] = content;
                }
            }
        }
        #endregion
    }


}
