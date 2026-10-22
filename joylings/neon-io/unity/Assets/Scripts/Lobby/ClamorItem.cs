using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using UnityEngine.UI;

namespace Starbro.NeonIO
{
    public class ClamorItem : Item
    {
        #region Public Field
        public Text NameText = null;
        public InputField ContentInput = null;
        public Button LockBtn = null;
        public FeatureData MyFeatureData;
        public int PurchaseClamorID = 0;
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        void OnEnable()
        {
            RefreshItem();
        }
        #endregion

        #region Public Func

        public void Init(FeatureData _featureData)
        {
            MyFeatureData = _featureData;
            NameText.text = MyFeatureData.Name;
            ContentInput.text = MyFeatureData.Content;
            if (_featureData != null)
                PurchaseClamorID = _featureData.ID;
        }
        public override void RefreshItem()
        {
            base.RefreshItem();
            if (MyFeatureData == null)
                return;
            switch (MyFeatureData.MyFeaturePart)
            {
                case FeaturePart.Head:
                    ContentInput.interactable = MyPlayer.HeadSpellClamorUnlock;
                    break;
                case FeaturePart.Body:
                    ContentInput.interactable = MyPlayer.BodySpellClamorUnlock;
                    break;
                case FeaturePart.Back:
                    ContentInput.interactable = MyPlayer.BackSpellClamorUnlock;
                    break;
            }
            //LockBtn.gameObject.SetActive(!MyFeatureData.ClamorOwned);
            RefreshText();
        }
        public void RefreshText()
        {
            NameText.text = MyFeatureData.Name;
            ContentInput.text = MyFeatureData.Content;
        }
        public void Purchase()
        {
            if (MyFeatureData == null)
            {
                PopupUI.ShowConfirmCancel(string.Format(StringData.GetString("PurchaseClamorConfirm"), GameSettingData.GeneralClamorStar), PurchaseConfirm, null);
            }
            else
            {
                if (!KongregateAPIBehaviour.KGIsLogin && !KongregateAPIBehaviour.UsesLocalProfile)//要有登入kongregate才能購買商品
                {
                    PopupUI.ShowConfirmCancel(StringData.GetString("KGRigister"), KongregateAPIBehaviour.KGLogin, null);
                    return;
                }
                else
                    KongregateAPIBehaviour.PurchaseItem(string.Format("{0}{1}", "spellclamor", PurchaseClamorID));
            }
        }
        public void PurchaseConfirm()
        {
            if (MyPlayer.Star >= GameSettingData.GeneralClamorStar)
                MyPlayer.PurchaseClamor(PurchaseClamorID);
            else
                PopupUI.ShowClickCancel(StringData.GetString("NotEnoughStar"), null);
        }
        public void SaveContentChange(string _content)
        {
            string key = "";
            if (MyFeatureData == null)
            {
                key = PurchaseClamorID.ToString();
            }
            else
            {
                key = string.Format("{0}{1}", "spellclamor", PurchaseClamorID);
            }
            ClamorUI.AddChangedClamor(key, _content);
        }
        #endregion

        #region Private Func

        #endregion
    }
}
