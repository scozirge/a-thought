using PlayerPrefs = Neon.ProfilePreferences;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public class BattleUI : MonoBehaviour, IMyUI
    {
        #region Public Field
        public static BattleUI Myself = null;
        #endregion

        #region Private Field

        [SerializeField]
        GameObject SettlementUI = null;
        [SerializeField]
        Text KillText = null;
        [SerializeField]
        Text BestKillText = null;
        [SerializeField]
        Text TimeText = null;
        [SerializeField]
        Text ResultText = null;
        [SerializeField]
        Text WinningStreakText = null;
        [SerializeField]
        Text GetStarText = null;
        [SerializeField]
        Text GetRankScoreText = null;
        [SerializeField]
        GameObject WinObj = null;
        [SerializeField]
        Image[] FeatureIcons = null;
        [SerializeField]
        Image[] FeatureCDImgs = null;
        Dictionary<int, Skill> SkillDic = new Dictionary<int, Skill>();
        [SerializeField]
        AnimationPlayer GetSkillAni = null;
        [SerializeField]
        Text GetSkillText = null;
        [SerializeField]
        BattleLogSpawner MyBattleLogSpawner = null;
        [SerializeField]
        Button ReviveBtn = null;
        [SerializeField]
        Button PremiumBtn = null;
        #endregion

        #region MonoBehaviour Func
        void Awake() { Myself = this; }
        void OnDestroy() { if (Myself == this) Myself = null; }
        public void OnEnable()
        {
        }
        public void Update()
        {
            UpdateSkillCDs();
        }
        #endregion


        #region Public Func

        public void Init()
        {
            Myself = this;
            UpdateFeatureIcon(FeaturePart.Head, null, null);
            UpdateFeatureIcon(FeaturePart.Body, null, null);
            UpdateFeatureIcon(FeaturePart.Back, null, null);
        }
        public void LeaveRoom()
        {
            if (PhotonNetwork.IsConnected)
            {
                //PhotonNetwork.LeaveRoom();
                PhotonNetwork.Disconnect();
            }
            else
                ScenePlayer.GoToScene_Static(MyScene.Lobby);
            UnityAnalyst.SendLeaveRoom();
        }
        public void ActiveSettlementUI(bool _bool)
        {
            if (BattleManager.BM.MyPlayerRole)
                ReviveBtn.interactable = !BattleManager.BM.MyPlayerRole.IsRevived;
            SettlementUI.SetActive(_bool);
        }
        public void Settlement(int _kill, int _bestKillorRankScore, int _star, System.TimeSpan _timeSpan)
        {
            if (!PlayerPrefs.HasKey(LocoData.PurchaseSkillTutorial.ToString()))
            {
                PopupUI.ShowTutorial_Static(true, 2);
                PlayerPrefs.SetInt(LocoData.PurchaseSkillTutorial.ToString(), 1);
            }
            KillText.text = _kill.ToString();
            if (PhotonLauncher.SelectGameType == GameType.InfinityWar)
            {
                BestKillText.gameObject.SetActive(true);
                BestKillText.text = _bestKillorRankScore.ToString();
            }
            else
            {
                BestKillText.gameObject.SetActive(false);
                GetRankScoreText.gameObject.SetActive(true);
                GetRankScoreText.text = "+ " + _bestKillorRankScore.ToString();
                WinObj.SetActive(BattleManager.BM.IsWin);
                BattleManager.InActiveAllRole();
            }
            if (WinningStreakText != null)
            {
                if (BattleManager.BM.IsWin)
                    ResultText.text = StringData.GetString("WinChallenge");
                else
                    ResultText.text = StringData.GetString("LoseChallenge");
            }
            TimeText.text = string.Format("{0}m{1}s", (int)_timeSpan.TotalMinutes, (int)_timeSpan.Seconds);
            GetStarText.text = string.Format("{0}", _star);
            if(WinningStreakText!=null)
                WinningStreakText.text = MyPlayer.ChallengeWinningStreak.ToString();
            //GetStarText.text = string.Format("{0}{1}", StringData.GetString("X"), _star);
            ActiveSettlementUI(true);

        }

        public void SetActive(bool _bool)
        {
            throw new System.NotImplementedException();
        }

        public void RefreshText()
        {
            throw new System.NotImplementedException();
        }
        public static void UpdateSkillCDs()
        {
            if (Myself == null || Myself.FeatureCDImgs == null) return;
            for (int i = 0; i < Myself.FeatureCDImgs.Length; i++)
            {
                if (Myself.FeatureCDImgs[i] == null) continue;
                if (Myself.SkillDic.ContainsKey(i) && Myself.SkillDic[i] != null)
                {
                    Myself.FeatureCDImgs[i].fillAmount = Myself.SkillDic[i].GetCDRatio();
                }
                else
                    Myself.FeatureCDImgs[i].fillAmount = 0;
            }
        }
        public static void UpdateFeatureIcon(FeaturePart _featurePart, Skill _skill, Sprite _sprite)
        {
            if (Myself == null) return;
            if (_skill == null || _sprite == null)
            {
                Myself.SkillDic.Remove((int)_featurePart);
                Myself.FeatureIcons[(int)_featurePart].enabled = false;
                UpdateSkillCDs();
                return;
            }
            if (Myself.SkillDic.ContainsKey((int)_featurePart))
                Myself.SkillDic[(int)_featurePart] = _skill;
            else
                Myself.SkillDic.Add((int)_featurePart, _skill);
            Myself.FeatureIcons[(int)_featurePart].enabled = true;
            Myself.FeatureIcons[(int)_featurePart].sprite = _sprite;
        }
        public void ShowSkillTip(int _index)
        {
            if (Myself.SkillDic.ContainsKey(_index) && Myself.SkillDic[_index] != null)
            {
                Vector2 pos = Myself.FeatureIcons[_index].transform.position + new Vector3(-65, 50, 0);
                PopupUI.ShowTip(FeatureData.GetDescription(Myself.SkillDic[_index].MyFeatureDataID), new Vector2(1, 0.5f), pos);
            }

        }
        public void HideTip()
        {
            PopupUI.HidTip();
        }
        public static void ShowGetSkill(string _skill)
        {
            Myself.GetSkillAni.Play("GetSkill", 0);
            Myself.GetSkillText.text = _skill;
        }
        public static void ShowKillLog(string _killer, string _loser)
        {
            string logStr = string.Format(StringData.GetString("KillLog"), _killer, _loser);
            Myself.MyBattleLogSpawner.SpawnLog(logStr);
        }
        public static void ShowLVUpLog(string _player, int _level)
        {
            string logStr = string.Format(StringData.GetString("LVUpLog"), _player, _level);
            Myself.MyBattleLogSpawner.SpawnLog(logStr);
        }
        public static void ShowKillingMilestone(string _player, int _kills)
        {
            //string logStr = string.Format("{0} is reaching level {1}", _player, _level);
            //Myself.MyBattleLogSpawner.SpawnLog(logStr);
        }
        public void Purchase(int _purchaseID)
        {
            if (!KongregateAPIBehaviour.KGIsLogin)//要有登入kongregate才能購買商品
            {
                PopupUI.ShowConfirmCancel(StringData.GetString("KGRigister"), KongregateAPIBehaviour.KGLogin, null);
                return;
            }
            else
            {
                switch (_purchaseID)
                {
                    case 1:
                        PopupUI.ShowConfirmCancel(StringData.GetString("PurchaseRevive"), PurchaseRevive, null);
                        break;
                    case 2:
                        PopupUI.ShowConfirmCancel(StringData.GetString("PurchasePremium"), PurchasePremium, null);
                        break;
                }
            }
        }
        public void PurchaseRevive()
        {
            KongregateAPIBehaviour.PurchaseItem(GameSettingData.ReviveKGShopID.ToString());
            //BattleManager.BM.Revive();
            ActiveSettlementUI(false);
        }
        public void PurchasePremium()
        {
            KongregateAPIBehaviour.PurchaseItem(GameSettingData.PremiumKGShopID.ToString());
            //BattleManager.MyPlayerRole.GetPremium();
        }
        public static void DisablePremiumBtn()
        {
            Myself.PremiumBtn.interactable = false;
        }
        #endregion

        #region Private Func

        #endregion


    }
}
