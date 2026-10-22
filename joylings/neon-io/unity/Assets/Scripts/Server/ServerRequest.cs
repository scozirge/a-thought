using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System;
using Scoz.Func;
namespace Starbro.NeonIO
{
    public partial class ServerRequest : MonoBehaviour
    {

        public static ServerRequest Conn;
        public static bool BackendEnabled => !KongregateAPIBehaviour.UsesLocalProfile && !string.IsNullOrWhiteSpace(NeonServiceSettings.Current?.backendUrl);
        public static bool IsInit = false;
        /// <summary>
        /// 初始化
        /// </summary>
        public void Init()
        {
            if (IsInit)
                return;
            switch (Application.platform)
            {
                case RuntimePlatform.WebGLPlayer:
                    Debug.Log("WebGLPlayer");
                    break;
                case RuntimePlatform.Android:
                    Debug.Log("Android");
                    break;
                case RuntimePlatform.IPhonePlayer:
                    Debug.Log("IPhonePlayer");
                    break;
                case RuntimePlatform.WindowsEditor:
                    Debug.Log("WindowsEditor");
                    MyPlayer.CheckInitPlayerData.Finished = true;
                    MyPlayer.CheckInitPlayerItem.Finished = true;
                    break;
                case RuntimePlatform.OSXEditor:
                    Debug.Log("OSXEditor");
                    MyPlayer.CheckInitPlayerData.Finished = true;
                    MyPlayer.CheckInitPlayerItem.Finished = true;
                    break;
                case RuntimePlatform.WindowsPlayer:
                    Debug.Log("WindowsPlayer");
                    MyPlayer.CheckInitPlayerData.Finished = true;
                    MyPlayer.CheckInitPlayerItem.Finished = true;
                    break;
                default:
                    break;
            }
            Conn = this;
            IsInit = true;
            //切場景不移除物件
            DontDestroyOnLoad(gameObject);
        }

        static string[] SplitLegacyResponse(string text)
        {
            if (string.IsNullOrEmpty(text)) return null;
            int separator = text.IndexOf(':');
            if (separator < 0) return null;
            string status = text.Substring(0, separator).Trim();
            if (status != "Success" && status != "Fail") return null;
            return new[] { status, text.Substring(separator + 1) };
        }

        public static string GetServerURL()
        {
            return NeonServiceSettings.BackendUrl;
        }
    }
}
