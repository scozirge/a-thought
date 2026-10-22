using System.Collections;
using UnityEngine;
using Scoz.Func;

namespace Starbro.NeonIO
{
    public partial class KongregateAPIBehaviour
    {
        static bool localFallback;
        public static bool UsesLocalProfile => !NeonServiceSettings.LegacyEnabled || localFallback;

        public static void CompleteLocalStartup()
        {
            localFallback = true;
            KGIsLogin = false;
            Relogin = false;
            EndLogin = true;
            MyPlayer.GetLocoData();
            MyPlayer.CheckInitPlayerData.Finished = true;
            MyPlayer.CheckInitPlayerItem.Finished = true;
            MyPlayer.CheckInitKGStatistics.Finished = true;
        }

        IEnumerator WaitForLegacyStartup()
        {
            yield return new WaitForSecondsRealtime(NeonServiceSettings.TimeoutSeconds + 2);
            if (!MyPlayer.CheckInitPlayerData.Finished || !MyPlayer.CheckInitPlayerItem.Finished)
            {
                Debug.LogWarning("Legacy account services did not respond. Continuing with the local profile.");
                CompleteLocalStartup();
            }
        }

        public static void ShowLegacyServiceUnavailable()
        {
            PopupUI.HideLoading();
            string message = MyPlayer.UseLanguage == Language.English
                ? "The original payment service is not configured. Your local progress is saved; no payment was made."
                : "尚未設定原版付款服務。本機進度已保留，沒有進行付款。";
            PopupUI.ShowClickCancel(message, null);
        }

        IEnumerator WaitForLegacyPurchase()
        {
            yield return new WaitForSecondsRealtime(NeonServiceSettings.TimeoutSeconds);
            PopupUI.HideLoading();
        }
    }
}
