using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System;
using Scoz.Func;
using UnityEngine.Networking;
namespace Starbro.NeonIO
{
    public partial class ServerRequest : MonoBehaviour
    {
        enum PurchaseFeatureCB
        {
            Success,
            Fail,
        }
        static int CurPurchaseFeatureID=0;
        /// <summary>
        /// 註冊，傳入帳密
        /// </summary>
        public static void PurchaseFeature(int _featureID)
        {
            Debug.Log("PurchaseFeature");
            CurPurchaseFeatureID = _featureID;
            if (Conn == null || !BackendEnabled)
                return;
            Conn.StartCoroutine(Coroutine_PurchaseFeature());
        }

        /// <summary>
        /// 註冊回傳
        /// </summary>
        static IEnumerator Coroutine_PurchaseFeature()
        {
            WWWForm form = new WWWForm();
            form.AddField("dbID", MyPlayer.DBID);
            form.AddField("ac_K", MyPlayer.KGName);
            form.AddField("payKreds", MyPlayer.PayKreds);
            form.AddField("star", MyPlayer.Star);
            form.AddField("ownStarFeature", MyPlayer.OwnStarFeatureStr);
            if(FeatureData.GetFeatureData(CurPurchaseFeatureID).SoldType==Currency.Kred)
                form.AddField("KGPurchase", 1);
            else
                form.AddField("KGPurchase", 0);
            string url = string.Format("{0}{1}", GetServerURL(), "PurchaseFeature.php");
            PopupUI.ShowLoading(StringData.GetString("Loading"));
            using (UnityWebRequest www = UnityWebRequest.Post(url, form))
            {
                www.timeout = NeonServiceSettings.TimeoutSeconds;
                yield return www.SendWebRequest();
                PopupUI.HideLoading();

                if (www.result != UnityWebRequest.Result.Success)
                    Debug.LogError(www.error);
                else
                {
                    string[] result = SplitLegacyResponse(www.downloadHandler.text);
                    if (result == null)
                    {
                        Debug.LogWarning("Legacy backend returned an invalid response.");
                        
                        yield break;
                    }
                    switch (MyEnum.ParseEnum<PurchaseFeatureCB>(result[0]))
                    {
                        case PurchaseFeatureCB.Success:
                            PopupUI.HideLoading();
                            ShopUI.PlayPurchaseEffect(CurPurchaseFeatureID);
                            Debug.Log("PurchaseFeature Success");
                            break;
                        case PurchaseFeatureCB.Fail:
                            PopupUI.HideLoading();
                            PopupUI.ShowClickCancel(StringData.GetString("PurchaseFail"), () => { ScenePlayer.GoToScene_Static(MyScene.Init); });
                            Debug.LogError("PurchaseFeature Error:" + result[1]);
                            Debug.Log(www.downloadHandler.text);
                            break;
                    }
                }
            }
        }

    }
}
