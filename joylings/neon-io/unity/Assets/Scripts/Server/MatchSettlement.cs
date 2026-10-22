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
        enum MatchSettlementCB
        {
            Success,
            Fail,
        }
        /// <summary>
        /// 註冊，傳入帳密
        /// </summary>
        public static void MatchSettlement()
        {
            Debug.Log("MatchSettlement");
            if (Conn == null || !BackendEnabled)
                return;
            Conn.StartCoroutine(Coroutine_MatchSettlement());
        }

        /// <summary>
        /// 註冊回傳
        /// </summary>
        static IEnumerator Coroutine_MatchSettlement()
        {
            WWWForm form = new WWWForm();
            form.AddField("dbID", MyPlayer.DBID);
            form.AddField("ac_K", MyPlayer.KGName);
            form.AddField("star", MyPlayer.Star);
            form.AddField("maxKill", MyPlayer.MaxKill);
            form.AddField("winningStreak", MyPlayer.ChallengeWinningStreak);
            string url = string.Format("{0}{1}", GetServerURL(), "MatchSettlement.php");
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
                    switch (MyEnum.ParseEnum<MatchSettlementCB>(result[0]))
                    {
                        case MatchSettlementCB.Success:
                            Debug.Log("MatchSettlement Success");
                            break;
                        case MatchSettlementCB.Fail:
                            Debug.LogError("MatchSettlement Error:" + result[1]);
                            Debug.Log(www.downloadHandler.text);
                            break;
                    }
                }
            }
        }

    }
}
