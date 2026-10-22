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
        enum PurchaseClamorCB
        {
            Success,
            Fail,
        }
        public static void PurchaseClamor(bool _isKGPurchase)
        {
            Debug.Log("PurchaseClamor");
            if (Conn == null || !BackendEnabled)
                return;
            Conn.StartCoroutine(Coroutine_PurchaseClamor(_isKGPurchase));
        }

        /// <summary>
        /// µù¥U¦^¶Ç
        /// </summary>
        static IEnumerator Coroutine_PurchaseClamor(bool _isKGPurchase)
        {
            WWWForm form = new WWWForm();
            form.AddField("dbID", MyPlayer.DBID);
            form.AddField("ac_K", MyPlayer.KGName);
            form.AddField("payKreds", MyPlayer.PayKreds);
            form.AddField("star", MyPlayer.Star);
            form.AddField("ownGeneralClamor", MyPlayer.OwnGeneralClamorStr);
            if(_isKGPurchase)
                form.AddField("KGPurchase", 1);
            else
                form.AddField("KGPurchase", 0);
            string url = string.Format("{0}{1}", GetServerURL(), "PurchaseClamor.php");
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
                    switch (MyEnum.ParseEnum<PurchaseClamorCB>(result[0]))
                    {
                        case PurchaseClamorCB.Success:
                            PopupUI.HideLoading();
                            ClamorUI.RefreshUI_Static();
                            Debug.Log("PurchaseClamor Success");
                            break;
                        case PurchaseClamorCB.Fail:
                            PopupUI.HideLoading();
                            PopupUI.ShowClickCancel(StringData.GetString("PurchaseFail"), () => { ScenePlayer.GoToScene_Static(MyScene.Init); });
                            Debug.LogError("PurchaseClamor Error:" + result[1]);
                            Debug.Log(www.downloadHandler.text);
                            break;
                    }
                }
            }
        }

    }
}
