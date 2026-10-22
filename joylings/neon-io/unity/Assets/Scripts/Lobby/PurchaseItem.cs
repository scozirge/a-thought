using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using UnityEngine.UI;

namespace Starbro.NeonIO
{
    public class PurchaseItem : Item
    {
        #region Public Field
        public FeatureData MyFeatureData;
        #endregion

        #region Private Field
        [SerializeField]
        Text NameText = null;
        [SerializeField]
        Text DescriptionText = null;
        [SerializeField]
        Image IconImg = null;
        [SerializeField]
        Image CurrencyImg = null;
        [SerializeField]
        Text FeeText = null;
        [SerializeField]
        Button PurchaseBtn = null;
        #endregion

        #region MonoBehaviour Func
        private void OnDestroy()
        {
            MyText.RemoveRefreshFunc(RefreshText);
        }
        #endregion

        #region Public Func

        public void Init(FeatureData _data)
        {
            MyFeatureData = _data;
            RefreshItem();
            MyText.AddRefreshFunc(RefreshText);
        }
        public override void RefreshItem()
        {
            base.RefreshItem();
            RefreshText();
            IconImg.sprite = MyFeatureData.IconSprite;
            switch (MyFeatureData.MyFeaturePart)
            {
                case FeaturePart.Head:
                    IconImg.transform.localScale = new Vector2(2, 2);
                    IconImg.transform.localPosition = new Vector2(0, 60);
                    break;
                case FeaturePart.Body:
                    IconImg.transform.localScale = Vector2.one;
                    IconImg.transform.localPosition = new Vector2(0, 27);
                    break;
                case FeaturePart.Back:
                    IconImg.transform.localScale = Vector2.one;
                    IconImg.transform.localPosition = new Vector2(0, 5);
                    break;
            }
            if (MyFeatureData.Owned)
            {
                CurrencyImg.gameObject.SetActive(false);
                PurchaseBtn.interactable = false;
            }
            else
            {
                PurchaseBtn.interactable = true;
                FeeText.text = MyFeatureData.Fee.ToString();
                switch (MyFeatureData.SoldType)
                {
                    case Currency.Star:
                        CurrencyImg.sprite = GameDictionary.GetSprite("Star").MySprite;
                        break;
                    case Currency.Kred:
                        CurrencyImg.sprite = GameDictionary.GetSprite("Kred").MySprite;
                        break;
                }
            }
        }
        public void RefreshText()
        {
            NameText.text = MyFeatureData.Name;
            DescriptionText.text = MyFeatureData.Description;
            if (MyFeatureData.Owned)
                FeeText.text = StringData.GetString("Owned");
        }
        public void Purchase()
        {
            switch (MyFeatureData.SoldType)
            {
                case Currency.Star:
                    PopupUI.ShowConfirmCancel(string.Format(StringData.GetString("PurchaseConfirm"), MyFeatureData.Star), PurchaseConfirm, null);
                    break;
                case Currency.Kred:
                    if (!KongregateAPIBehaviour.KGIsLogin && !KongregateAPIBehaviour.UsesLocalProfile)//要有登入kongregate才能購買商品
                    {
                        PopupUI.ShowConfirmCancel(StringData.GetString("KGRigister"), KongregateAPIBehaviour.KGLogin, null);
                        return;
                    }
                    else
                        KongregateAPIBehaviour.PurchaseItem(MyFeatureData.ID.ToString());
                    //PopupUI.ShowClickCancel(StringData.GetString("NotKGVersion"));
                    break;
            }
        }
        public void PurchaseConfirm()
        {
            if (MyPlayer.Star >= MyFeatureData.Star)
                MyPlayer.PurchaseFeature(MyFeatureData.ID);
            else
                PopupUI.ShowClickCancel(StringData.GetString("NotEnoughStar"), null);
        }
        public void PlayPurchaseEffect()
        {
            RefreshItem();
            LobbyUI.RefreshStar();
            EffectEmitter.EmitParticleFromDic("Upgrade", Vector3.zero, Vector3.zero, transform);
        }
        #endregion

        #region Private Func
        #endregion
    }
}
