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
        enum SaveClamorCB
        {
            Success,
            Fail,
        }

        /// <summary>
        /// 註冊，傳入帳密
        /// </summary>
        public static void SaveClamor(Dictionary<string,string> _keyContents)
        {
            Debug.Log("SaveClamor");
            if (KongregateAPIBehaviour.UsesLocalProfile)
            {
                MyPlayer.SaveLocalClamors(_keyContents);
                ClamorUI.SaveFinish();
                PopupUI.ShowClickCancel(StringData.GetString("SaveClamorSuccess"), null);
                return;
            }
            if (Conn == null || !BackendEnabled)
                return;
            Conn.StartCoroutine(Coroutine_SaveClamor(_keyContents));
        }

        /// <summary>
        /// 註冊回傳
        /// </summary>
        static IEnumerator Coroutine_SaveClamor(Dictionary<string, string> _keyContents)
        {
            WWWForm form = new WWWForm();
            form.AddField("dbID", MyPlayer.DBID);
            form.AddField("ac_K", MyPlayer.KGName);

            List<string> keyBuff = new List<string>(_keyContents.Keys);
            string triggerIDs = "", contents = "";
            for (int i = 0; i < keyBuff.Count; i++)
            {
                if(i!=0)
                {
                    triggerIDs += ",";
                    contents += ",";
                }
                triggerIDs += keyBuff[i];
                contents += _keyContents[keyBuff[i]];
            }
            form.AddField("triggerIDs", triggerIDs);
            form.AddField("contents", contents);
            string url = string.Format("{0}{1}", GetServerURL(), "SaveClamor.php");
            PopupUI.ShowLoading(StringData.GetString("Loading"));
            using (UnityWebRequest www = UnityWebRequest.Post(url, form))
            {
                www.timeout = NeonServiceSettings.TimeoutSeconds;
                yield return www.SendWebRequest();
                PopupUI.HideLoading();
                //Debug.Log(www.downloadHandler.text);
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
                    switch (MyEnum.ParseEnum<SaveClamorCB>(result[0]))
                    {
                        case SaveClamorCB.Success:
                            PopupUI.ShowClickCancel(StringData.GetString("SaveClamorSuccess"), null);
                            PopupUI.HideLoading();
                            ClamorUI.SaveFinish();
                            Debug.Log("SaveClamor Success");
                            break;
                        case SaveClamorCB.Fail:
                            PopupUI.HideLoading();
                            PopupUI.ShowClickCancel(StringData.GetString("SaveClamorFail"), null);
                            Debug.LogError("SaveClamor Error:" + result[1]);
                            Debug.Log(www.downloadHandler.text);
                            break;
                    }
                }
            }
        }

    }
}
