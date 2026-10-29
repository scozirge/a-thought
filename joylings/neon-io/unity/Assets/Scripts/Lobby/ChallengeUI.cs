using PlayerPrefs = Neon.ProfilePreferences;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using UnityEngine.UI;
using System.Linq;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public class ChallengeUI : BaseUI
    {
        public static new ChallengeUI Myself;
        [SerializeField]
        Text P1Name = null;
        [SerializeField]
        Text P2Name = null;
        [SerializeField]
        GameObject SelectUI = null;
        [SerializeField]
        GameObject SelectSkillTipObj = null;
        [SerializeField]
        Button MatchBtn = null;
        [SerializeField]
        GameObject MatchStartObj = null;
        [SerializeField]
        Button CancelBtn = null;
        [SerializeField]
        Button QuitBtn = null;
        [SerializeField]
        GameObject LookingForOpponentObj = null;
        [SerializeField]
        GameObject P2Obj = null;
        [SerializeField]
        GameObject VSObj = null;
        [SerializeField]
        Image[] P1Images = null;
        [SerializeField]
        Image[] P2Images = null;
        [SerializeField]
        MyText[] P1Texts = null;
        [SerializeField]
        MyText[] P2Texts = null;

        FeatureData[] P1Features = null;
        
        public static FeatureData[] P2Features = null;
        public static string P2NameString;
        bool IsFoundOpponent = false;
        int SelectIndex = 0;
        WaitToDo<float> LookingForOpponentTimer;
        WaitToDo<float> WaitToStartBattle;
        public static bool IsFightAI = false;
        public static bool IsFindingOpponent = false;

        protected override void OnEnable()
        {
            Myself = this;
            WaitToStartBattle = null;
            LookingForOpponentTimer = null;
            IsFoundOpponent = false;
            P2Features = null;
            PhotonLauncher.SelectGameType = GameType.Challenge;
            P1Features = MyPlayer.ChallengeSelectFeatures;
            P1Name.text = MyPlayer.Name;
            base.OnEnable();
            LookingForOpponentObj.SetActive(false);
            P2Obj.SetActive(false);
            VSObj.SetActive(false);
            SelectSkillTipObj.SetActive(true);
            MatchBtn.gameObject.SetActive(true);
            MatchStartObj.SetActive(false);
            CancelBtn.gameObject.SetActive(false);
            QuitBtn.gameObject.SetActive(true);
            ActiveSelectUI(false);
            IsInit = true;
            IsFightAI = false;
            if ( !PlayerPrefs.HasKey(LocoData.InitTutorial.ToString()))
            {
                PopupUI.ShowTutorial_Static(true,1);
                PlayerPrefs.SetInt(LocoData.InitTutorial.ToString(), 1);
            }
            IsFindingOpponent = false;
        }
        protected override void OnDisable()
        {
            base.OnDisable();
            WaitToStartBattle = null;
            LookingForOpponentTimer = null;
            IsFindingOpponent = false;
            PhotonLauncher.CancelJoin();
        }
        protected override void OnDestroy()
        {
            base.OnDestroy();
            if (Myself == this) Myself = null;
        }
        protected override void Update()
        {
            base.Update();
            if (WaitToStartBattle != null)
                WaitToStartBattle.RunTimer();
            if (LookingForOpponentTimer != null)
                LookingForOpponentTimer.RunTimer();
        }
        public void ActiveSelectUI(bool _active)
        {
            if (IsFindingOpponent)
                return;
            SelectUI.SetActive(_active);
        }
        public void FoundOpponent(string _name)
        {
            if (!IsFindingOpponent || !isActiveAndEnabled || IsFoundOpponent) return;
            IsFoundOpponent = true;
            P2NameString = _name;
            P2Name.text = _name;
            LookingForOpponentObj.SetActive(false);
            SelectSkillTipObj.SetActive(false);
            P2Obj.SetActive(true);
            VSObj.SetActive(true);
            MatchBtn.gameObject.SetActive(false);
            QuitBtn.gameObject.SetActive(false);
            MatchStartObj.SetActive(true);
            CancelBtn.gameObject.SetActive(false);
            if (PhotonNetwork.InRoom && PhotonNetwork.IsMasterClient)
            {
                PhotonNetwork.CurrentRoom.IsOpen = false;
                WaitToStartBattle = new WaitToDo<float>(5, StartBattle, true);
            }
            LookingForOpponentTimer = null;
        }


        public void SetOpponentFeatures(int[] _featureIDs)
        {
            if (!IsFindingOpponent || _featureIDs == null || _featureIDs.Length != 5) return;
            P2Features = new FeatureData[5];
            for (int i = 0; i < P2Features.Length; i++)
            {
                if (GameDictionary.FeatureDic.ContainsKey(_featureIDs[i]))
                {
                    P2Features[i] = GameDictionary.FeatureDic[_featureIDs[i]];
                }
                else
                    P2Features[i] = GameDictionary.FeatureDic[1];

                P2Images[i].sprite = P2Features[i].IconSprite;
                P2Texts[i].text = P2Features[i].Name;
                SetFeatureIcon(false, i, P2Features[i]);
            }
        }
        public void SetSelectIndex(int _index)
        {
            SelectIndex = _index;
        }
        public override void RefreshText()
        {
            base.RefreshText();
            for (int i = 0; i < P1Features.Length; i++)
            {
                SelectIndex = i;
                SetFeature(P1Features[i]);
            }
        }
        public void SetFeature(FeatureData _data)
        {
            P1Features[SelectIndex] = _data;
            SetFeatureIcon(true, SelectIndex, _data);
            P1Images[SelectIndex].sprite = P1Features[SelectIndex].IconSprite;
            P1Texts[SelectIndex].text = P1Features[SelectIndex].Name;
            if (IsInit)
                MyPlayer.SetChallengeSelectFeatures(P1Features);
        }
        void SetFeatureIcon(bool _isP1, int _index, FeatureData _data)
        {
            if (_isP1)
            {
                switch (_data.MyFeaturePart)
                {
                    case FeaturePart.Head:
                        P1Images[_index].transform.localScale = new Vector2(2, 2);
                        P1Images[_index].transform.localPosition = new Vector2(0, -46);
                        break;
                    case FeaturePart.Body:
                        P1Images[_index].transform.localScale = Vector2.one;
                        P1Images[_index].transform.localPosition = new Vector2(0, 11);
                        break;
                    case FeaturePart.Back:
                        P1Images[_index].transform.localScale = Vector2.one;
                        P1Images[_index].transform.localPosition = new Vector2(0, -11);
                        break;
                }
            }
            else
            {
                switch (_data.MyFeaturePart)
                {
                    case FeaturePart.Head:
                        P2Images[_index].transform.localScale = new Vector2(2, 2);
                        P2Images[_index].transform.localPosition = new Vector2(0, -46);
                        break;
                    case FeaturePart.Body:
                        P2Images[_index].transform.localScale = Vector2.one;
                        P2Images[_index].transform.localPosition = new Vector2(0, 11);
                        break;
                    case FeaturePart.Back:
                        P2Images[_index].transform.localScale = Vector2.one;
                        P2Images[_index].transform.localPosition = new Vector2(0, -11);
                        break;
                }
            }
        }
        public void Connect()
        {
            if (IsFindingOpponent) return;
            BattleManager.ResetChallengeResultProperties();
            IsFoundOpponent = false;
            P2Features = null;
            WaitToStartBattle = null;
            IsFindingOpponent = true;
            AudioPlayer.PlayBattleMusic(MyPlayer.ChooseBattleSong);
            PhotonLauncher.JoinTheRandomRoom();
            LookingForOpponentObj.SetActive(true);
            MatchBtn.gameObject.SetActive(false);
            MatchStartObj.SetActive(false);
            CancelBtn.gameObject.SetActive(true);
            QuitBtn.gameObject.SetActive(false);
            SelectSkillTipObj.SetActive(false);
            LookingForOpponentTimer = new WaitToDo<float>(Random.Range(GameSettingData.MinSearchingTime_C, GameSettingData.MaxSearchingTime_C + 1), FightAI, true);
        }
        void FightAI()
        {
            if (!IsFindingOpponent || IsFoundOpponent) return;
            if (!PhotonNetwork.InRoom)
            {
                LookingForOpponentTimer = new WaitToDo<float>(2, FightAI, true);
                return;
            }
            IsFightAI = true;
            LookingForOpponentTimer = null;
            PhotonNetwork.CurrentRoom.IsOpen = false;
            FoundOpponent(KongregateAPIBehaviour.GetRandomPlayerNameFromKGStatistics(KGRangeType.lifetime));
            //給予隨機Feature
            int[] featureIDs = new int[5];
            featureIDs[0] = FeatureData.GetRandomFeatureData(FeaturePart.Head).ID;
            featureIDs[1] = FeatureData.GetRandomFeatureData(FeaturePart.Body).ID;
            featureIDs[2] = FeatureData.GetRandomFeatureData(FeaturePart.Back).ID;
            for(int i=3;i<5;i++)
            {
                int rand = Random.Range(0, 3);
                featureIDs[i] = FeatureData.GetRandomFeatureData((FeaturePart)rand).ID;
            }
            SetOpponentFeatures(featureIDs);
            WaitToStartBattle = new WaitToDo<float>(5, StartBattle, true);
        }
        public void CancelChallenge()
        {
            IsFindingOpponent = false;
            IsFoundOpponent = false;
            IsFightAI = false;
            WaitToStartBattle = null;
            LookingForOpponentTimer = null;
            P2Features = null;
            PhotonLauncher.CancelJoin();
            AudioPlayer.StopAllMusic();
            AudioPlayer.PlayLoopMusicAtSecond_Static(GameDictionary.GetMusic("Lobby"), "Lobby", 8);
            LookingForOpponentObj.SetActive(false);
            CancelBtn.gameObject.SetActive(false);
            MatchBtn.gameObject.SetActive(true);
            MatchStartObj.SetActive(false);
            QuitBtn.gameObject.SetActive(true);
            P2Obj.gameObject.SetActive(false);
            SelectSkillTipObj.SetActive(true);
            VSObj.SetActive(false);
            if (PhotonNetwork.IsConnected)
                PhotonNetwork.Disconnect();
            LookingForOpponentTimer = null;
        }
        public void StartBattle()
        {
            WaitToStartBattle = null;
            if (!IsFindingOpponent || !IsFoundOpponent || !PhotonNetwork.InRoom || !PhotonNetwork.IsMasterClient) return;
            if (P2Features == null)
            {
                WaitToStartBattle = new WaitToDo<float>(1, StartBattle, true);
                return;
            }
            IsFindingOpponent = false;
            UnityAnalyst.SendStartChallenge();
            PhotonNetwork.LoadLevel(MyScene.Challenge.ToString());
        }

    }
}
