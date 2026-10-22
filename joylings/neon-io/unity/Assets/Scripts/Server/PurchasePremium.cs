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
        enum PurchasePremiumCB
        {
            Success,
            Fail,
        }
        /// <summary>
        /// 註冊，傳入帳密
        /// </summary>
        public static void PurchasePremium()
        {
            Debug.Log("PurchasePremium");
            if (Conn == null || !BackendEnabled)
                return;
            Conn.StartCoroutine(Coroutine_PurchasePremium());
        }

        /// <summary>
        /// 註冊回傳
        /// </summary>
        static IEnumerator Coroutine_PurchasePremium()
        {
            WWWForm form = new WWWForm();
            form.AddField("dbID", MyPlayer.DBID);
            form.AddField("ac_K", MyPlayer.KGName);
            form.AddField("payKreds", MyPlayer.PayKreds);
            string url = string.Format("{0}{1}", GetServerURL(), "PurchasePremium.php");
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
                    switch (MyEnum.ParseEnum<PurchasePremiumCB>(result[0]))
                    {
                        case PurchasePremiumCB.Success:
                            Debug.Log("PurchasePremium Success");
                            break;
                        case PurchasePremiumCB.Fail:
                            Debug.LogError("PurchasePremium Error:" + result[1]);
                            Debug.Log(www.downloadHandler.text);
                            break;
                    }
                }
            }
        }

    }
}
