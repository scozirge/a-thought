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
        enum LoginCB
        {
            Success,
            Fail,
        }
        /// <summary>
        /// 註冊，傳入帳密
        /// </summary>
        public static void Login()
        {
            Debug.Log("Login");
            if (Conn == null || !BackendEnabled)
            {
                KongregateAPIBehaviour.CompleteLocalStartup();
                return;
            }
            Conn.StartCoroutine(Coroutine_Login());
        }

        /// <summary>
        /// 註冊回傳
        /// </summary>
        static IEnumerator Coroutine_Login()
        {
            WWWForm form = new WWWForm();
            form.AddField("ac_K", MyPlayer.KGName);
            form.AddField("userID_K", MyPlayer.KGID);
            form.AddField("star", MyPlayer.Star);
            form.AddField("ownStarFeature", MyPlayer.OwnStarFeatureStr);
            form.AddField("maxKill", MyPlayer.MaxKill);
            form.AddField("ownGeneralClamor", MyPlayer.OwnGeneralClamorStr);
            form.AddField("winningStreak", MyPlayer.ChallengeWinningStreak);
            string url = string.Format("{0}{1}", GetServerURL(), "Login.php");
            using (UnityWebRequest www = UnityWebRequest.Post(url, form))
            {
                www.timeout = NeonServiceSettings.TimeoutSeconds;
                yield return www.SendWebRequest();
                PopupUI.HideLoading();
                MyPlayer.CheckInitPlayerData.Finished = true;

                if (www.result != UnityWebRequest.Result.Success)
                {
                    Debug.LogWarning(www.error);
                    KongregateAPIBehaviour.CompleteLocalStartup();
                }
                else
                {
                    Debug.Log(www.downloadHandler.text);
                    string[] result = SplitLegacyResponse(www.downloadHandler.text);
                    if (result == null)
                    {
                        Debug.LogWarning("Legacy backend returned an invalid response.");
                        KongregateAPIBehaviour.CompleteLocalStartup();
                        yield break;
                    }
                    switch (MyEnum.ParseEnum<LoginCB>(result[0]))
                    {
                        case LoginCB.Success:
                            string[] data = result[1].Split(',');
                            if (!MyPlayer.TryInitLegacyPlayerData(data))
                                KongregateAPIBehaviour.CompleteLocalStartup();
                            break;
                        case LoginCB.Fail:
                            KongregateAPIBehaviour.CompleteLocalStartup();
                            Debug.LogError("Login Error:" + result[1]);
                            Debug.Log(www.downloadHandler.text);
                            break;
                    }
                }
            }
        }

    }
}
