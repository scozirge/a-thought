using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using UnityEngine.UI;

namespace Starbro.NeonIO
{
    public class ShopUI : ItemSpawner<PurchaseItem>
    {
        #region Public Field
        public FeaturePart CurSelectedPart = FeaturePart.Head;

        #endregion

        #region Private Field
        static ShopUI Myself;
        [SerializeField]
        ScrollRect MyScroll = null;
        Dictionary<FeaturePart, List<PurchaseItem>> ItemDic = new Dictionary<FeaturePart, List<PurchaseItem>>();
        Dictionary<int, PurchaseItem> ItemIDDic = new Dictionary<int, PurchaseItem>();
        List<PurchaseItem> HeadItemList = new List<PurchaseItem>();
        List<PurchaseItem> BodyItemList = new List<PurchaseItem>();
        List<PurchaseItem> BackItemList = new List<PurchaseItem>();
        [SerializeField]
        Image HeadImage = null;
        [SerializeField]
        Image BodyImage = null;
        [SerializeField]
        Image BackImage = null;
        [SerializeField]
        Transform LineBG = null;
        bool IsInit = false;
        #endregion

        #region MonoBehaviour Func
        private void OnEnable()
        {
            if (!IsInit)
            {
                Myself = this;
                SpawnItem();
                IsInit = true;
            }
            ToStartOfScrollView();
            LobbyUI.RefreshStar();
            FilterItems(0);
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
        public void FilterItems(int _filter)
        {
            if (_filter == 0)
            {
                HeadImage.transform.SetSiblingIndex(3);
                BodyImage.transform.SetSiblingIndex(1);
                BackImage.transform.SetSiblingIndex(0);
                HeadImage.color = Color.white;
                BodyImage.color = Color.gray;
                BackImage.color = Color.gray;
                LineBG.SetSiblingIndex(2);
            }
            else if (_filter == 1)
            {
                HeadImage.transform.SetSiblingIndex(1);
                BodyImage.transform.SetSiblingIndex(3);
                BackImage.transform.SetSiblingIndex(0);
                HeadImage.color = Color.gray;
                BodyImage.color = Color.white;
                BackImage.color = Color.gray;
                LineBG.SetSiblingIndex(2);
            }
            else if (_filter == 2)
            {
                HeadImage.transform.SetSiblingIndex(0);
                BodyImage.transform.SetSiblingIndex(1);
                BackImage.transform.SetSiblingIndex(3);
                HeadImage.color = Color.gray;
                BodyImage.color = Color.gray;
                BackImage.color = Color.white;
                LineBG.SetSiblingIndex(2);
            }
            foreach (var item in ItemDic[FeaturePart.Head])
            {
                item.gameObject.SetActive(((FeaturePart)_filter == FeaturePart.Head));
            }
            foreach (var item in ItemDic[FeaturePart.Body])
            {
                item.gameObject.SetActive(((FeaturePart)_filter == FeaturePart.Body));
            }
            foreach (var item in ItemDic[FeaturePart.Back])
            {
                item.gameObject.SetActive(((FeaturePart)_filter == FeaturePart.Back));
            }
            CurSelectedPart = (FeaturePart)_filter;
            ToStartOfScrollView();
        }
        public static void PlayPurchaseEffect(int _featureID)
        {
            if (Myself.ItemIDDic.ContainsKey(_featureID))
            {
                Myself.ItemIDDic[_featureID].PlayPurchaseEffect();
            }

        }
        #endregion
        #region Private Func
        void SpawnItem()
        {
            List<FeatureData> headDatas = FeatureData.GetAllFeatureDatas(FeaturePart.Head);
            List<FeatureData> bodyDatas = FeatureData.GetAllFeatureDatas(FeaturePart.Body);
            List<FeatureData> backDatas = FeatureData.GetAllFeatureDatas(FeaturePart.Back);
            for (int i = 0; i < headDatas.Count; i++)
            {
                PurchaseItem pi = Spawn<PurchaseItem>();
                pi.Init(headDatas[i]);
                HeadItemList.Add(pi);
                ItemIDDic.Add(headDatas[i].ID, pi);
            }
            ItemDic.Add(FeaturePart.Head, HeadItemList);
            for (int i = 0; i < bodyDatas.Count; i++)
            {
                PurchaseItem pi = Spawn<PurchaseItem>();
                pi.Init(bodyDatas[i]);
                BodyItemList.Add(pi);
                ItemIDDic.Add(bodyDatas[i].ID, pi);
            }
            ItemDic.Add(FeaturePart.Body, BodyItemList);
            for (int i = 0; i < backDatas.Count; i++)
            {
                PurchaseItem pi = Spawn<PurchaseItem>();
                pi.Init(backDatas[i]);
                BackItemList.Add(pi);
                ItemIDDic.Add(backDatas[i].ID, pi);
            }
            ItemDic.Add(FeaturePart.Back, BackItemList);
            FilterItems((int)CurSelectedPart);
        }
        #endregion
    }
}
