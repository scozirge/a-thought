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
        enum GetClamorCB
        {
            Success,
            Fail,
        }
        /// <summary>
        /// 傳入KGName取得喊話
        /// </summary>
        public static void GetClamor(string ac_K)
        {
            if (Conn == null || !BackendEnabled)
                return;
            Conn.StartCoroutine(Coroutine_GetClamor(ac_K));
        }

        /// <summary>
        /// 註冊回傳
        /// </summary>
        static IEnumerator Coroutine_GetClamor(string ac_K)
        {
            WWWForm form = new WWWForm();
            form.AddField("ac_K", ac_K);
            string url = string.Format("{0}{1}", GetServerURL(), "GetClamor.php");
            using (UnityWebRequest www = UnityWebRequest.Post(url, form))
            {
                www.timeout = NeonServiceSettings.TimeoutSeconds;
                yield return www.SendWebRequest();
                PopupUI.HideLoading();

                if (www.result != UnityWebRequest.Result.Success)
                    Debug.LogError(www.error);
                else
                {
                    //Debug.Log(www.downloadHandler.text);
                    string[] result = SplitLegacyResponse(www.downloadHandler.text);
                    if (result == null)
                    {
                        Debug.LogWarning("Legacy backend returned an invalid response.");
                        
                        yield break;
                    }
                    switch (MyEnum.ParseEnum<GetClamorCB>(result[0]))
                    {
                        case GetClamorCB.Success:
                            if(result[1]!="")
                            {
                                string[] data = result[1].Split(',');
                                BattleManager.GetPlayerNameAndClamor_CB(data[0], data[1]);
                            }
                            break;
                        case GetClamorCB.Fail:
                            Debug.LogError("GetClamor Error:" + result[1]);
                            Debug.Log(www.downloadHandler.text);
                            break;
                    }
                }
            }
        }

    }
}
