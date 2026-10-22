using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using UnityEngine.UI;

namespace Starbro.NeonIO
{
    public class SelectItem : Item
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
        Button SelectBtn = null;
        [SerializeField]
        Text SelectText = null;
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
            SelectBtn.interactable = MyFeatureData.Owned;
        }
        public void RefreshText()
        {
            NameText.text = MyFeatureData.Name;
            DescriptionText.text = MyFeatureData.Description;
            if (MyFeatureData.Owned)
                SelectText.text = StringData.GetString("SelectSkill");
            else
                SelectText.text = StringData.GetString("NotOwned");
        }
        public void Select()
        {
            ((ChallengeUI)ChallengeUI.Myself).SetFeature( MyFeatureData);
            ((ChallengeUI)ChallengeUI.Myself).ActiveSelectUI(false);
        }
        #endregion

        #region Private Func
        #endregion
    }
}
