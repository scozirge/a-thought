using System.Collections;
using System.Collections.Generic;
using UnityEngine;

using Scoz.Func;
using Starbro.NeonIO;

public class UnityAnalyst : MonoBehaviour
{
    // Analytics are opt-in; an integrator can attach a Unity 6 compatible event sink.
    public static event System.Action<string, Dictionary<string, object>> EventRecorded;
    static void Record(string eventName, Dictionary<string, object> data = null)
    {
        EventRecorded?.Invoke(eventName, data);
    }
    public static bool CnaSendAnalysis = false;
    public static bool ShowLog = false;
    public static void SendEnterGame()
    {
        if (ShowLog)
            Debug.Log("Analysis-SendEnterGame");
        if (!CnaSendAnalysis)
            return;
        Record("EnterGame");
    }
    public static void SendStartGame()
    {
        if (ShowLog)
            Debug.Log("Analysis-SendStartGame");
        if (!CnaSendAnalysis)
            return;
        Record("StartGame");
    }
    public static void SendStartChallenge()
    {
        if (ShowLog)
            Debug.Log("Analysis-SendStartChallenge");
        if (!CnaSendAnalysis)
            return;
        Record("SendStartChallenge");
    }
    public static void SendLeaveRoom()
    {
        if (ShowLog)
            Debug.Log("Analysis-SendLeaveRoom");
        if (!CnaSendAnalysis)
            return;
        Record("LeaveRoom");
    }
    public static void SendDisconnected()
    {
        if (ShowLog)
            Debug.Log("Analysis-Disconnected");
        if (!CnaSendAnalysis)
            return;
        Record("Disconnected");
    }
    public static void SendWatchTutorial()
    {
        if (ShowLog)
            Debug.Log("Analysis-SendWatchTutorial");
        if (!CnaSendAnalysis)
            return;
        Record("WatchTutorial");
    }
    public static void SendChangeLanguage(Language _language)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendChangeLanguage");
        if (!CnaSendAnalysis)
            return;
        Record("ChangeLanguage", new Dictionary<string, object>
        {
            { "language", _language.ToString() }
        });
    }
    public static void SendPlayerLogin(string _name)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendPlayerLogin");
        if (!CnaSendAnalysis)
            return;
        Record("PlayerLogin", new Dictionary<string, object>
        {
            { "name", _name }
        });
    }
    public static void SendClickFullScreen()
    {
        if (ShowLog)
            Debug.Log("Analysis-SendClickFullScreen");
        if (!CnaSendAnalysis)
            return;
        Record("ClickFullScreen");
    }
    public static void SendMatchResult(int _level, int _kill, int _star, int _survivalTime)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendMatchResult");
        if (!CnaSendAnalysis)
            return;
        Record("MatchResult", new Dictionary<string, object>
        {
            { "level", _level },
            { "kill", _kill },
            { "star", _star },
            { "survivalTime(s)", _survivalTime }
        });
    }
    public static void SendChallengeResult(int _level, int _kill, int _star, int _survivalTime)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendChallengeResult");
        if (!CnaSendAnalysis)
            return;
        Record("ChallengeResult", new Dictionary<string, object>
        {
            { "level", _level },
            { "kill", _kill },
            { "star", _star },
            { "survivalTime(s)", _survivalTime }
        });
    }
    public static void SendPurchaseRevive(string _buyer, int _kreds)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendPurchaseRevive");
        if (!CnaSendAnalysis)
            return;
        Record("Purchase-Revive", new Dictionary<string, object>
        {
            { "buyer", _buyer },
            { "cost", _kreds }
        });
    }
    public static void SendPurchasePremium(string _buyer, int _kreds)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendPurchasePremium");
        if (!CnaSendAnalysis)
            return;
        Record("Purchase-Premium", new Dictionary<string, object>
        {
            { "buyer", _buyer },
            { "cost", _kreds }
        });
    }
    public static void SendPurchaseStarItem(string _buyer, int _itemID, int _stars)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendPurchaseStarItem");
        if (!CnaSendAnalysis)
            return;
        Record("Purchase-StarItem", new Dictionary<string, object>
        {
            { "buyer", _buyer },
            { "itemID", _itemID },
            { "cost", _stars }
        });
    }
    public static void SendPurchaseKredItem(string _buyer, int _itemID, int _kreds)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendPurchaseKredItem");
        if (!CnaSendAnalysis)
            return;
        Record("Purchase-KredItem", new Dictionary<string, object>
        {
            { "buyer", _buyer },
            { "itemID", _itemID },
            { "cost", _kreds }
        });
    }
    public static void SendPurchaseStarClamor(string _buyer, int _clamorID, int _stars)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendPurchaseStarClamor");
        if (!CnaSendAnalysis)
            return;
        Record("Purchase-StarClamor", new Dictionary<string, object>
        {
            { "buyer", _buyer },
            { "clamorID", _clamorID },
            { "cost", _stars }
        });
    }
    public static void SendPurchaseKredClamor(string _buyer, int _clamorID, int _kreds)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendPurchaseKredClamor");
        if (!CnaSendAnalysis)
            return;
        Record("Purchase-KredClamor", new Dictionary<string, object>
        {
            { "buyer", _buyer },
            { "clamorID", _clamorID },
            { "cost", _kreds }
        });
    }
    public static void SendRegion(string _region, int _ping)
    {
        if (ShowLog)
            Debug.Log("Analysis-SendRegion");
        if (!CnaSendAnalysis)
            return;
        Record("Region", new Dictionary<string, object>
        {
            { "region", _region },
            { "ping(ms)", _ping },
        });
    }
    /*做不到，因為網頁可以按X關閉網頁，所以不可能知道玩家玩多久
    public static void SendPlayInfo(double _playTime, int _playTimes, int _kill, int _die, int _gainStar, int _saveClamorTimes)
    {
        Debug.Log("Analysis-SendPlayInfo");
        if (!CnaSendAnalysis)
            return;
        Record("PlayInfo", new Dictionary<string, object>
        {
            { "playTime(minutes)", _playTime },
            { "playTimes", _playTimes },
            { "kill", _kill },
            { "die", _die },
            { "gainStar", _gainStar },
            { "saveClamorTimes", _saveClamorTimes }
        });
    }
    */
}
