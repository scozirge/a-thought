using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;

namespace Starbro.NeonIO
{


    public partial class KongregateAPIBehaviour : MonoBehaviour
    {
        protected static KongregateAPIBehaviour instance;
        public static bool KGIsInit;//是否初始化過
        public static bool KGIsLogin = false;
        public static bool EndLogin;
        static bool Test = false;
        public static bool IsInit = false;
        public static bool Relogin;//是否為遊戲進行到一半時登入

        public void Init()
        {
            if (IsInit)
                return;
            if (instance == null)
            {
                instance = this;
            }
            else if (instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Debug.Log("StartInitKongregateAPI...");
            Object.DontDestroyOnLoad(gameObject);
            gameObject.name = "GameManager";
            if (UsesLocalProfile)
            {
                CompleteLocalStartup();
                IsInit = true;
                return;
            }
            StartCoroutine(WaitForLegacyStartup());
            //取排行榜玩家資料
            InitSetPlayerListFromKGStatistics();
            LegacyBrowser.Evaluate(
    @"if(typeof(kongregateUnitySupport) != 'undefined'){
            console.log(kongregateUnitySupport);
            kongregateUnitySupport.initAPI('GameManager', 'OnKongregateAPILoaded');
          };");

            if (Test)
            {
                //OnKongregateUserInfo("1|scozirge");
                OnKongregateAPILoaded("41605611|starbrogamemaker");
                //OnKongregateUserInfo("100|t12");
            }
            else
                MyPlayer.GetLocoData();
            IsInit = true;
        }

        public void OnKongregateAPILoaded(string userInfoString)
        {
            if (UsesLocalProfile) return;
            Debug.Log("OnKongregateAPILoaded:" + userInfoString);
            if (!KGIsInit)
            {
                SendKGStatistics(KGStatistics.EnterGame.ToString(), 1);
            }

            KGIsInit = true;
            //設定玩家資料
            OnKongregateUserInfo(userInfoString);
        }
        public static void TestRelogin()
        {
            KGIsLogin = true;
            IsInit = false;
            instance.Init();
            ScenePlayer.GoToScene_Static(MyScene.Init);
        }
        public void OnKongregateUserInfo(string userInfoString)
        {
            if (UsesLocalProfile) return;
            string[] fields = (userInfoString ?? "").Split('|');
            int parsedId;
            if (fields.Length < 2 || !int.TryParse(fields[0], out parsedId))
            {
                CompleteLocalStartup();
                return;
            }
            Debug.Log(userInfoString);
            ResetData();
            var info = userInfoString.Split('|');
            var userId = System.Convert.ToInt32(info[0]);
            var username = info[1];

            if (userId != 0)//帳號ID不是0代表登入Kongregate帳號了
            {
                KGIsLogin = true;
                MyPlayer.GetLocoData();
                if (!Relogin)//一開始進遊戲登入kongregate成功
                {
                    Debug.Log("KG Login=" + KGIsLogin);
                    MyPlayer.SetKongregateUserData(username, userId);
                    InitSetUserItemList();
                    ServerRequest.Login();
                    UnityAnalyst.SendPlayerLogin(username);
                }
                else//之後登入成功
                {
                    Debug.Log("KG ReLogin=" + KGIsLogin);
                    IsInit = false;
                    Relogin = false;
                    Init();
                    ScenePlayer.GoToScene_Static(MyScene.Init);
                }
            }
            else//帳號ID是0代表沒登入Kongregate
            {
                MyPlayer.GetLocoData();
                if (!Relogin)//一開始遊戲登入失敗
                {
                    EndKongregateLogin();
                    Debug.Log("Guest account");
                    //偵聽是否有登入kongregate
                    Debug.Log("建立kongregate登入偵聽");
                    LegacyBrowser.Evaluate(@"
      kongregate.services.addEventListener('login', function(){
        var unityObject = kongregateUnitySupport.getUnityObject();
        var services = kongregate.services;
        var params=[services.getUserId(), services.getUsername(), 
                    services.getGameAuthToken()].join('|');

        unityObject.SendMessage('GameManager', 'OnKongregateUserInfo', params);
    });"
        );
                    Relogin = true;
                    MyPlayer.CheckInitPlayerData.Finished = true;
                    MyPlayer.CheckInitPlayerItem.Finished = true;
                    UnityAnalyst.SendPlayerLogin("guest");
                }
                else//遊戲後登入失敗
                {
                }
            }
            /*
            if (Test)
                InitSetUserItemCB("13356700,spellclamor,,1/13356701,spellclamor,,1/13356702,29,,1");
               */
        }
        public static void ResetData()
        {
            EndLogin = false;
            KGIsLogin = false;
        }

        public static void KGLogin()
        {
            if (UsesLocalProfile)
            {
                ShowLegacyServiceUnavailable();
                return;
            }
            EndLogin = false;
            Relogin = true;
            Debug.Log("Kongregate Login");
            LegacyBrowser.Evaluate(@"
          kongregate.services.showRegistrationBox();");
        }

        public static void EndKongregateLogin()
        {
            if (EndLogin)
                return;
            if (!KGIsLogin && Relogin)
            {
                Debug.Log("Fail To InPageLogin...");
                Relogin = false;
                return;
            }
            EndLogin = true;
        }

        public static void PurchaseItem(string _id)
        {
            if (UsesLocalProfile || !KGIsLogin || instance == null)
            {
                ShowLegacyServiceUnavailable();
                return;
            }
            instance.StartCoroutine(instance.WaitForLegacyPurchase());
            Debug.Log(_id);
            PopupUI.ShowLoading(StringData.GetString("Loading"));
            Debug.Log("////////////////Send PurchaseIte ID:" + _id);
            LegacyBrowser.Evaluate(@"
          kongregate.mtx.purchaseItems(['" + _id + @"'], function(result) {
            var unityObject = kongregateUnitySupport.getUnityObject();
            var result = String(result.success);
            result+=','+'" + _id + @"';
            unityObject.SendMessage('GameManager', 'OnPurchaseResult' , result );
          });");

            /*
            if(Test)
                instance.OnPurchaseResult("true," + _id);
            */
        }
        public void OnPurchaseResult(string _result)
        {
            if (UsesLocalProfile) return;
            if (string.IsNullOrEmpty(_result) || _result.Split(',').Length < 2)
            {
                ShowLegacyServiceUnavailable();
                return;
            }
            PopupUI.HideLoading();
            string[] datas = _result.Split(',');
            Debug.Log("Purchase itemID:" + datas[1] + " result: " + datas[0]);
            if (datas[0] == "true")
            {
                int number = 0;
                bool isNumeric = int.TryParse(datas[1], out number);
                if (isNumeric)
                {
                    FeatureData featureData = FeatureData.GetFeatureData(number);
                    if (featureData != null)
                    {
                        MyPlayer.PurchaseFeature(number);
                        UnityAnalyst.SendPurchaseKredItem(MyPlayer.KGName, featureData.ID, featureData.Kred);
                    }
                }
                else
                {
                    if (datas[1] == GameSettingData.ReviveKGShopID)//購買復活(因為不能消耗低於10Kreds，所以移除這項)
                    {
                        MyPlayer.PurchaseRevive();
                        BattleManager.BM.Revive();
                        UnityAnalyst.SendPurchaseRevive(MyPlayer.KGName, GameSettingData.ReviveKreds);
                    }
                    else if (datas[1] == GameSettingData.PremiumKGShopID)//購買取得優勢
                    {
                        BattleUI.DisablePremiumBtn();
                        MyPlayer.PurchasePremium();
                        BattleManager.BM.MyPlayerRole.GetPremium();
                        UnityAnalyst.SendPurchasePremium(MyPlayer.KGName, GameSettingData.PremiumKreds);
                    }
                    else//購買技能喊話
                    {
                        if(datas[1]== GameSettingData.HeadSpellClamorKGShopID || datas[1]== GameSettingData.BodySpellClamorKGShopID || datas[1] == GameSettingData.BackSpellClamorKGShopID)
                        {
                            MyPlayer.PurchaseSpellClamor(datas[1]);
                            ClamorUI.RefreshUI_Static();
                        }
                        /*//購買復活(因為不能消耗低於10Kreds，所以移除這項)
                        int featureID = 0;
                        isNumeric = int.TryParse(datas[1].Replace("spellclamor", ""), out featureID);
                        if (isNumeric)
                        {
                            MyPlayer.PurchaseClamor(ClamorType.Spell, featureID);
                            UnityAnalyst.SendPurchaseKredClamor(MyPlayer.KGName, featureID, GameSettingData.SpellClamorKreds);
                        }
                        else
                        {
                            Debug.LogError("KG購買item返回字串錯誤:" + datas[1]);
                        }
                        */
                    }
                }
            }
            else
            {
                PopupUI.ShowClickCancel(StringData.GetString("PurchaseFail"), null);
            }
        }
        public static void InitSetUserItemList()
        {
            Debug.Log("////////////////Send InitSetUserItem : " + MyPlayer.KGName);
            //datas+=[item.id, item.identifier, item.data , item.remaining_uses ].join(',');
            LegacyBrowser.Evaluate(@"
          kongregate.mtx.requestUserItemList(null, function(result) {
            var unityObject = kongregateUnitySupport.getUnityObject();
            if(result.success) {
                var datas = '';
                //console.log('result.data.length='+result.data.length);
                for(var i = 0; i < result.data.length; i++) 
                {
                    var item = result.data[i];
                    if(i!=0)
                        datas+='/';
                    datas+=[item.identifier,  item.remaining_uses ].join(',');
                }
                if(datas=='')
                    datas='Empty';
                unityObject.SendMessage('GameManager', 'InitSetUserItemCB', datas);     
            }
            else
            {
                unityObject.SendMessage('GameManager', 'InitSetUserItemCB', 'Fail'); 
            }
          });
        ");
        }

        public void InitSetUserItemCB(string _datas)
        {
            if (UsesLocalProfile) return;
            Debug.Log("///////////////Kongregate InitSetUserItem Info: " + _datas);
            switch (_datas)
            {
                case "Fail":
                    Debug.Log("Fail to ShowUserItemListCB");
                    MyPlayer.CheckInitPlayerItem.Finished = true;
                    EndKongregateLogin();
                    break;
                case "Empty":
                    Debug.Log("PayItem is Empty");
                    MyPlayer.CheckInitPlayerItem.Finished = true;
                    Debug.Log("InitPlayerItemFinish!");
                    EndKongregateLogin();
                    break;
                default:
                    MyPlayer.InitKGUserItem(_datas);
                    EndKongregateLogin();
                    break;
            }
        }
    }
}
