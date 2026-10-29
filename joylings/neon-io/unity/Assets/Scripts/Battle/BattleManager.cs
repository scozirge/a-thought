using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using Neon.Networking;
using Scoz.Func;

namespace Starbro.NeonIO
{
    public enum GodState
    {
        InitWaitToSapwn,
        Debuting,
        Exist,
        Leaving,
        WaitToReSapwn,
    }
    public class BattleManager : MonoBehaviourPunCallbacks
    {
        #region Public Field
        public static BattleManager BM;
        [LabelOverride("腳色Prefab")]
        public GameObject PlayerPrefab;
        [LabelOverride("產生怪物範圍")]
        public int SpawnRoleRadius = 1500;
        [LabelOverride("戰鬥地圖大小")]
        public int BattleFieldRadius = 2000;
        [LabelOverride("使用JsonData")]
        public bool UseJsonData = false;
        [LabelOverride("造星神登場表演時間")]
        public int GodDebutTime = 10;
        [LabelOverride("造星神登場時間")]
        public int GodExistTime = 180;
        [LabelOverride("造星神重生時間")]
        public int GodSpawnReSpawnTime = 120;
        [LabelOverride("戰鬥區域外迷霧")]
        public ParticleSystem BattleFog = null;
        public static GodState MyGodState;
        public List<NeutralRole> NeutralRolePrefabs;
        public GodRole GodPrefab;
        public Vector2 GodSpawnPos;
        //玩家存活時間
        public static System.TimeSpan SurvivalTime
        {
            get
            {
                return new System.TimeSpan(EndGameTime.Ticks - StartGameTime.Ticks);
            }
        }

        #endregion

        #region Private Field
        [LabelOverride("排行榜介面")]
        [SerializeField]
        public LeaderBoardUI MyLeaderBoard = null;
        [LabelOverride("BattleUI")]
        [SerializeField]
        BattleUI MyBattleUI = null;

        //AIRoleClamorDic存放AI腳色的喊話資料
        public static Dictionary<string, Dictionary<string, string>> AIRoleClamorDic = new Dictionary<string, Dictionary<string, string>>();
        static System.DateTime StartGameTime;
        static System.DateTime EndGameTime;
        static WaitToDo<float> WaitToSettlementTimer;
        static WaitToDo<float> GodStateTimer;
        MyTimer SendGodStateToServerTimer;
        static MyTimer AIJoinIntervalTimer;
        List<MyTimer> AIReSpawnIntervalTimers = new List<MyTimer>();
        static float ResetGodTimerTime = 60;
        static bool IsResetingGodTimer = false;
        public bool IsReadyToSpawn { get; private set; }
        public PlayerRole MyPlayerRole = null;
        public GodRole MyGodRole = null;
        public ParticleManager MyGodDebutPM;
        public Dictionary<int, NeutralRole> NeutralRoleDic = new Dictionary<int, NeutralRole>();
        //Challenge戰場用
        public bool IsWin { get; private set; }
        public bool MatchEnded { get { return HasEnded; } }
        bool HasEnded;
        bool ChallengeResultLocked;
        bool ChallengeDecisionPublished;
        int ChallengeWinnerActor;
        int ChallengeLoserActor;
        int ChallengeOpponentActor;
        bool IsLeaving;

        int NeutralRoleID
        {
            get
            {
                int id = 10000;
                foreach (int i in NeutralRoleDic.Keys)
                {
                    if (id <= i)
                        id = i + 1;
                }
                return id;
            }
        }
        #endregion

        #region MonoBehaviour Func
        void Awake()
        {
            BM = this;
            WaitToSettlementTimer = null;
            GodStateTimer = null;
            AIJoinIntervalTimer = null;
            IsResetingGodTimer = false;
            AIRoleClamorDic.Clear();
        }
        void OnDestroy()
        {
            PhotonNetwork.NetworkingClient.EventReceived -= OnEvent;
            AIReSpawnIntervalTimers.Clear();
            NeutralRoleDic.Clear();
            if (BM != this) return;
            WaitToSettlementTimer = null;
            GodStateTimer = null;
            AIJoinIntervalTimer = null;
            BM = null;
        }
        System.Collections.IEnumerator Start()
        {
            while (PhotonNetwork.IsConnected && (!PhotonNetwork.IsReadyForGameplay ||
                (PhotonNetwork.Runner != null && PhotonNetwork.Runner.SceneManager != null && PhotonNetwork.Runner.SceneManager.IsBusy)))
                yield return null;
            if (NeonArenaFlow.Active)
            {
                float arenaReadyDeadline = Time.realtimeSinceStartup + 15;
                while (!NeonArena.Instance && PhotonNetwork.InRoom && Time.realtimeSinceStartup < arenaReadyDeadline) yield return null;
                if (!NeonArena.Instance || NeonArena.Instance.FindActor(PhotonNetwork.LocalPlayer.ActorNumber) < 0)
                { MyBattleUI.LeaveRoom(); yield break; }
            }
            AudioPlayer.PlayBattleMusic(MyPlayer.ChooseBattleSong);
            IsWin = false;
            if (NeonArenaFlow.Active) { BattleFieldRadius = 4000; SpawnRoleRadius = 3000; }
            if (PhotonLauncher.SelectGameType == GameType.Challenge)
            {
                foreach (Player player in PhotonNetwork.PlayerList)
                    if (!player.IsLocal) ChallengeOpponentActor = player.ActorNumber;
                if (PhotonNetwork.IsConnected && PhotonNetwork.IsMasterClient)
                    ResetChallengeResultProperties();
            }
            //PhotonNetwork.QuickResends = 6;
            //PhotonNetwork.MaxResendsBeforeDisconnect = 20;
            Transform particleParent = GameObject.FindGameObjectWithTag("ParticleParent").transform;
            if (PhotonLauncher.SelectGameType == GameType.InfinityWar)
                EffectEmitter.EmitParticleOnCircle(BattleFog, particleParent, Vector2.zero, BattleFieldRadius + 300, 27);
            else
                EffectEmitter.EmitParticleOnCircle(BattleFog, particleParent, Vector2.zero, BattleFieldRadius + 300, 24);
            BM = this;
            MyBattleUI.Init();
            NeutralRoleDic.Clear();
            if (!GameManager.InitCheck.Finished)
                GameManager.DeployGameManager();
            MyLeaderBoard.Init();
            IsReadyToSpawn = true;
            StartGame();//開始遊戲
            if (NeonArenaFlow.Active) yield break;
            if (UseJsonData)
            {
                GodDebutTime = GameSettingData.GodDebutTime;
                GodExistTime = GameSettingData.GodExistTime;
                GodSpawnReSpawnTime = GameSettingData.GodSpawnReSpawnTime;
            }
            //初始產生AIRole
            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    SendGodStateToServer();
                    SendGodStateToServerTimer = new MyTimer(5, SendGodStateToServer, true, true);//每5秒送一次造星神狀態
                    int initSpawnAIRole = GameSettingData.GetRandomAIRoleCount();
                    for (int i = 0; i < initSpawnAIRole; i++)
                    {
                        SpawnNeutralPlayerAvatar("");
                    }
                    if (ChallengeUI.IsFightAI && PhotonLauncher.SelectGameType == GameType.Challenge)
                    {
                        NeutralRole nRole = BM.SpawnRandomNeutral();
                        //NeutralRole nRole= SpawnNeutralPlayerAvatar(ChallengeUI.P2NameString);
                        nRole.Init();
                        nRole.SetPlayerData(ChallengeUI.P2NameString, NeutralRoleID);
                        nRole.SetAIChallengeRole(ChallengeUI.P2Features);
                    }
                }
            }
            AIJoinIntervalTimer = new MyTimer(GameSettingData.GetRandomAIRoleJoinInterval(), NewAIRole, true, true);
            //設定造星神狀態
            if (PhotonNetwork.IsConnected)
            {
                if (!PhotonNetwork.IsMasterClient)
                {
                    MyGodState = (GodState)PhotonTools.GetIntProperty(PhotonNetwork.MasterClient, PunCustomProp.GodState);

                    float time = PhotonTools.GetFloatProperty(PhotonNetwork.MasterClient, PunCustomProp.GodStateTime);
                    switch (MyGodState)
                    {
                        case GodState.InitWaitToSapwn:
                            GodStateTimer = new WaitToDo<float>(time, GodDebut, true);
                            break;
                        case GodState.Debuting:
                            MyGodDebutPM = EffectEmitter.EmitParticleFromDic("GodTeleport_loop", GodSpawnPos, Vector3.zero, null, Force.Neutral);
                            GodStateTimer = new WaitToDo<float>(time, SpawnGod, true);
                            break;
                        case GodState.Exist:
                            GodStateTimer = new WaitToDo<float>(time, GodLeavePerform, true);
                            break;
                        case GodState.Leaving:
                            GodStateTimer = new WaitToDo<float>(time, GodLeave, true);
                            break;
                        case GodState.WaitToReSapwn:
                            GodStateTimer = new WaitToDo<float>(time, GodDebut, true);
                            break;
                    }
                }
                else
                {
                    WaitToSpawnGod();//準備產生造星神
                }
            }
            else
            {
                GodDebut();
            }
        }
        public override void OnEnable()
        {
            base.OnEnable();
            PhotonNetwork.NetworkingClient.EventReceived += OnEvent;
        }

        public override void OnDisable()
        {
            base.OnDisable();
            PhotonNetwork.NetworkingClient.EventReceived -= OnEvent;
        }
        public static string GetClamor(string _ac_K, string _triggerID)
        {
            if ( _ac_K == StringData.GetString("DefaultGodName"))
                return "";
            if (_ac_K != StringData.GetString("Guest"))//玩家不是Guest，抓取玩家喊話資料
            {
                if (AIRoleClamorDic.ContainsKey(_ac_K))
                {
                    if (AIRoleClamorDic[_ac_K].ContainsKey(_triggerID))
                    {
                        return AIRoleClamorDic[_ac_K][_triggerID];
                    }
                    else
                    {
                        int number = 0;
                        bool isNumeric = int.TryParse(_triggerID, out number);
                        if (isNumeric)
                        {
                            if (number >= 0 && number <= 4)
                                return StringData.GetString(string.Format("GeneralClamor{0}", number));
                        }
                    }
                }
            }
            else//如果玩家是Guest代表還沒登入KG帳戶改用預設喊話
            {
                int number = 0;
                bool isNumeric = int.TryParse(_triggerID, out number);
                if (isNumeric)
                {
                    if (number >= 0 && number <= 4)
                        return StringData.GetString(string.Format("GeneralClamor{0}", number));
                }
            }
            return "";
        }
        public static void GetPlayerNameAndClamor_CB(string account, string clamor)
        {
            if (string.IsNullOrEmpty(account) || string.IsNullOrEmpty(clamor)) return;
            if (!AIRoleClamorDic.TryGetValue(account, out Dictionary<string, string> values))
                AIRoleClamorDic[account] = values = new Dictionary<string, string>();
            foreach (string entry in clamor.Split('/'))
            {
                int separator = entry.IndexOf('-');
                if (separator <= 0) continue;
                values[entry.Substring(0, separator)] = entry.Substring(separator + 1);
            }
            if (PhotonNetwork.IsMasterClient) PhotonTools.SendClamorEvent(account, clamor);
        }
        void Update()
        {
            TryApplyChallengeResult();
            if (PhotonLauncher.SelectGameType == GameType.InfinityWar && (!PhotonNetwork.IsConnected || PhotonNetwork.IsMasterClient) && AIJoinIntervalTimer != null)
                AIJoinIntervalTimer.RunTimer();
            if (!PhotonNetwork.IsConnected || PhotonNetwork.IsMasterClient)
                for (int i = 0; i < AIReSpawnIntervalTimers.Count; i++)
                    AIReSpawnIntervalTimers[i].RunTimer();
            if (WaitToSettlementTimer != null)
                WaitToSettlementTimer.RunTimer();
            if (PhotonLauncher.SelectGameType == GameType.InfinityWar)//一般戰場才會呼叫造星神
            {
                if (GodStateTimer != null)
                    GodStateTimer.RunTimer();
                if (SendGodStateToServerTimer != null)
                    SendGodStateToServerTimer.RunTimer();
                //當連線遊戲中且玩家為房主，且造星神計時器沒在運作時，倒數並重新啟動計時器
                if (PhotonNetwork.IsConnected && PhotonNetwork.IsMasterClient)
                {
                    if (GodStateTimer == null || !GodStateTimer.StartRunTimer)
                    {
                        if (IsResetingGodTimer == false)//如果沒重新啟動計時器中，就重新啟動計時器
                        {
                            IsResetingGodTimer = true;
                            GodStateTimer = new WaitToDo<float>(ResetGodTimerTime, ReSetGodTimer, true);
                        }
                    }
                }
            }
        }
        void SendGodStateToServer()
        {
            if (PhotonNetwork.IsConnected && PhotonNetwork.IsMasterClient)
            {
                if (GodStateTimer != null)
                    PhotonTools.SetFloatProp(PhotonNetwork.MasterClient, PunCustomProp.GodStateTime, GodStateTimer.CurTimer);
                else
                    PhotonTools.SetFloatProp(PhotonNetwork.MasterClient, PunCustomProp.GodStateTime, GodSpawnReSpawnTime);
            }
        }
        void ReSetGodTimer()//當造星神計時器沒在運作時，倒數並重新啟動計時器
        {
            IsResetingGodTimer = false;
            Debug.LogWarning("計時器停了，重新建立造星神計時器");
            if (MyGodRole != null)
            {
                GodLeavePerform();
            }
            else
            {
                WaitToSpawnGod();
            }

        }
        #endregion

        #region Photon Callbacks

        /// <summary>
        /// Called when the local player left the room. We need to load the launcher scene.
        /// </summary>
        public override void OnLeftRoom()
        {
            if (IsLeaving) return;
            IsLeaving = true;
            ScenePlayer.GoToScene_Static(MyScene.Lobby);
        }
        public override void OnPlayerEnteredRoom(Player other)// not executed if you're the player connecting
        {
            Debug.LogFormat("{0} joins the game!", other);
            if (MyLeaderBoard)
                MyLeaderBoard.AddPlayer(other);
        }
        public override void OnPlayerLeftRoom(Player other)// executed when other disconnects
        {
            Debug.LogFormat("{0} left the game!", other);
            if (MyLeaderBoard)
                MyLeaderBoard.RemovePlayer(other);
            if (PhotonLauncher.SelectGameType == GameType.Challenge && !HasEnded && PhotonNetwork.IsMasterClient)
                PublishChallengeResult(PhotonNetwork.LocalPlayer.ActorNumber, other.ActorNumber);
        }
        public override void OnDisconnected(DisconnectCause cause)
        {
            Debug.LogWarning("OnDisconnected:" + cause);
            OnLeftRoom();
        }

        public override void OnPlayerPropertiesUpdate(Player target, Neon.Networking.Hashtable changedProps)
        {
            if (target == PhotonNetwork.MasterClient) TryApplyChallengeResult();
        }
        public override void OnMasterClientSwitched(Player newMasterClient)
        {
            if (NeonArenaFlow.Active) return;
            if (PhotonNetwork.IsMasterClient)
            {
                if (PhotonLauncher.SelectGameType == GameType.Challenge)
                {
                    if (ChallengeResultLocked || ChallengeDecisionPublished)
                        WriteChallengeResult(ChallengeWinnerActor, ChallengeLoserActor);
                    else if (ChallengeOpponentActor != 0 &&
                        !System.Array.Exists(PhotonNetwork.PlayerList, p => p.ActorNumber == ChallengeOpponentActor))
                        PublishChallengeResult(PhotonNetwork.LocalPlayer.ActorNumber, ChallengeOpponentActor);
                }
                // Dead scene roles survive a shared-master handover; rebuild their respawn timers.
                if (PhotonLauncher.SelectGameType == GameType.InfinityWar)
                    foreach (var role in NeutralRoleDic.Values)
                        if (role != null && !role.IsAlive) OnNeutralRoleDie(role.ID, role.Name);
                PhotonTools.SetIntProp(PhotonNetwork.LocalPlayer, PunCustomProp.GodState, (int)MyGodState);
                SendGodStateToServer();
                SendGodStateToServerTimer = new MyTimer(5, SendGodStateToServer, true, true);//每5秒送一次造星神狀態
            }
        }
        public void OnEvent(EventData photonEvent)
        {
            byte eventCode = photonEvent.Code;
            //Debug.Log("eventCode=" + eventCode);

            switch (eventCode)
            {
                case (byte)PhotonTools.EventCode.GodState:
                    object[] data = photonEvent.CustomData as object[];
                    if (data == null || data.Length != 2) return;
                    GodState state = (GodState)System.Convert.ToInt32(data[0]);
                    float value = Mathf.Max(0, System.Convert.ToSingle(data[1]));

                    switch (state)
                    {
                        case GodState.InitWaitToSapwn://第一次等待召喚
                            IsResetingGodTimer = false;
                            MyGodState = GodState.InitWaitToSapwn;
                            GodStateTimer = new WaitToDo<float>(value, GodDebut, true);
                            if (PhotonNetwork.IsMasterClient)
                                PhotonTools.SetIntProp(PhotonNetwork.MasterClient, PunCustomProp.GodState, (int)MyGodState);
                            break;
                        case GodState.Debuting://等待登場動畫
                            IsResetingGodTimer = false;
                            MyGodState = GodState.Debuting;
                            GodStateTimer = new WaitToDo<float>(GodDebutTime, SpawnGod, true);
                            MyGodDebutPM = EffectEmitter.EmitParticleFromDic("GodTeleport_loop", GodSpawnPos, Vector3.zero, null, Force.Neutral);
                            if (PhotonNetwork.IsMasterClient)
                                PhotonTools.SetIntProp(PhotonNetwork.MasterClient, PunCustomProp.GodState, (int)MyGodState);
                            break;
                        case GodState.Exist://召喚並等待離開
                            IsResetingGodTimer = false;
                            if (MyGodDebutPM != null)
                                Destroy(MyGodDebutPM.gameObject);//移除登場動畫
                            MyGodState = GodState.Exist;
                            if (PhotonNetwork.IsMasterClient)
                            {
                                string GodName = StringData.GetString("DefaultGodName");
                                if (GodName == "")
                                    if (!ProbabilityGetter.GetResult(GameSettingData.DefaultGodProbability))
                                        GodName = KongregateAPIBehaviour.GetRandomPlayerNameFromKGStatistics(KGRangeType.weekly);
                                if (GodName == "")
                                    GodName = StringData.GetString("DefaultGodName");
                                MyGodRole = PhotonNetwork.InstantiateSceneObject(GodPrefab.name, GodSpawnPos, Quaternion.identity).GetComponent<GodRole>();
                                MyGodRole.Init();
                                MyGodRole.photonView.RPC("SetPlayerData", RpcTarget.AllBuffered, GodName, StringData.GetString("Creator"));
                                PhotonTools.SetIntProp(PhotonNetwork.MasterClient, PunCustomProp.GodState, (int)MyGodState);
                            }
                            GodStateTimer = new WaitToDo<float>(GodExistTime, GodLeavePerform, true);
                            EffectEmitter.EmitParticleFromDic("GodTeleport", GodSpawnPos, Vector3.zero, null, Force.Neutral);
                            break;
                        case GodState.Leaving://離開動畫並等待離開
                            IsResetingGodTimer = false;
                            MyGodState = GodState.Leaving;
                            if (PhotonNetwork.IsMasterClient)
                            {
                                if (MyGodRole != null) MyGodRole.photonView.RPC("TimeOutLeave", RpcTarget.All);
                                PhotonTools.SetIntProp(PhotonNetwork.MasterClient, PunCustomProp.GodState, (int)MyGodState);
                            }
                            GodStateTimer = new WaitToDo<float>(GodDebutTime, GodLeave, true);
                            if (MyGodRole != null)
                                MyGodDebutPM = EffectEmitter.EmitParticleFromDic("GodTeleport_loop", MyGodRole.transform.position, Vector3.zero, null, Force.Neutral);
                            break;
                        case GodState.WaitToReSapwn://離開並等待再召喚
                            IsResetingGodTimer = false;
                            if (MyGodDebutPM != null)
                                Destroy(MyGodDebutPM.gameObject);//移除登場動畫
                            MyGodState = GodState.WaitToReSapwn;
                            if (PhotonNetwork.IsMasterClient)
                            {
                                if (MyGodRole != null)//有可能MyGodRole是被打死的所以不需要再另外廣播大家移除造星神
                                    MyGodRole.photonView.RPC("SelfDestroy", RpcTarget.All);
                                PhotonTools.SetIntProp(PhotonNetwork.MasterClient, PunCustomProp.GodState, (int)MyGodState);
                            }
                            if (MyGodRole != null)//有可能MyGodRole是被打死的所以不需要再另外廣播大家移除造星神
                                EffectEmitter.EmitParticleFromDic("GodTeleport", MyGodRole.transform.position, Vector3.zero, null, Force.Neutral);
                            GodStateTimer = new WaitToDo<float>(GodSpawnReSpawnTime, GodDebut, true);
                            break;
                    }
                    break;
                case (byte)PhotonTools.EventCode.Clamor:
                    string[] namClamorPair = photonEvent.CustomData as string[];
                    if (namClamorPair != null && namClamorPair.Length == 2)
                        GetPlayerNameAndClamor_CB(namClamorPair[0], namClamorPair[1]);
                    break;
            }
        }
        #endregion

        #region Public Func
        public void StartGame()
        {
            HasEnded = false;
            StartGameTime = System.DateTime.Now;//設定玩家開始遊戲時間
            //初始化玩家殺敵數
            PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Kills, 0);
            PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.GainExp, 0);
            PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Head, 0);
            PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Body, 0);
            PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Back, 0);
            PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Buffers, "");
            //建立玩家腳色
            SpawnPlayerRole();

        }
        public void Restart()//重新開始
        {
            HasEnded = false;
            WaitToSettlementTimer = null;
            StartGameTime = System.DateTime.Now;//設定玩家開始遊戲時間
            if (PhotonNetwork.IsConnected)
            {
                //初始化玩家房間資料
                PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Kills, 0);
                PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.GainExp, 0);
                PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Head, 0);
                PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Body, 0);
                PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Back, 0);
                PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Buffers, "");
                MyPlayerRole.photonView.RPC("Restart", RpcTarget.All);
            }
            else
                MyPlayerRole.Restart();
            BM.MyLeaderBoard.RefreshPlayerScore();
        }
        public static void KillAllEnemies()
        {
            List<int> buffer = new List<int>(BM.NeutralRoleDic.Keys);
            for (int i = 0; i < buffer.Count; i++)
            {
                BM.NeutralRoleDic[buffer[i]].photonView.RPC("BeAttackAndCallParticle", RpcTarget.All, 100000, Vector2.zero, "BumpHit", Vector2.zero);
            }
        }
        public void Revive()//商城幣復活
        {
            HasEnded = false;
            WaitToSettlementTimer = null;
            if (PhotonNetwork.IsConnected)
            {
                MyPlayerRole.photonView.RPC("Revive", RpcTarget.All);
            }
            else
                MyPlayerRole.Revive();
        }
        bool CheckIfNameIsExist(string _name)
        {
            foreach (NeutralRole n in NeutralRoleDic.Values)
            {
                if (n.Name == _name)
                    return true;
                continue;
            }
            if (PhotonNetwork.IsConnected)
            {
                foreach (Player p in PhotonNetwork.CurrentRoom.Players.Values)
                {
                    if (p.NickName == _name)
                        return true;
                    continue;
                }
            }
            if (_name == MyPlayer.KGName)
                return true;
            return false;
        }
        public static void SpawnNeutralPlayerAvatar(string _name)
        {
            if (BM == null || PhotonLauncher.SelectGameType != GameType.InfinityWar) return;
            string AIPlayerName = _name;

            NeutralRole nRole = null;
            float probability = 0;
            int maxRolePerRoom = 0;
            if (PhotonLauncher.SelectGameType == GameType.InfinityWar)
            {
                if (AIPlayerName == "")
                {
                    if (!ProbabilityGetter.GetResult(GameSettingData.GuestAIProbability))
                    {
                        AIPlayerName = GetRandomNameFromKG();
                    }
                    else
                        AIPlayerName = StringData.GetString("Guest");
                }
                probability = GameSettingData.NeutralGetFeatureProbability;
                maxRolePerRoom = GameSettingData.MaxRolePerRoom;
            }
            else
            {
                if (AIPlayerName == "")
                    AIPlayerName = StringData.GetString("NeonStalker");
                probability = GameSettingData.NeutralGetFeatureProbability_C;
                maxRolePerRoom = GameSettingData.MaxRolePerRoom_C;
            }

            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    if (PhotonNetwork.CurrentRoom.PlayerCount + BM.NeutralRoleDic.Count < maxRolePerRoom)
                    {
                        nRole = BM.SpawnRandomNeutral();

                        if (ProbabilityGetter.GetResult(probability))
                        {
                            nRole.photonView.RPC("GainExp", RpcTarget.AllBuffered, GameSettingData.NeedExps[0]);
                        }
                        nRole.photonView.RPC("SetPlayerData", RpcTarget.AllBuffered, AIPlayerName, BM.NeutralRoleID);
                    }
                }
            }
            else
            {
                if (BM.NeutralRoleDic.Count + 1 < 10)
                {
                    nRole = BM.SpawnRandomNeutral();
                    if (ProbabilityGetter.GetResult(probability))
                    {
                        int randomPart = Random.Range(0, 3);
                        nRole.GetRandomFeature((FeaturePart)randomPart);
                    }
                    nRole.SetPlayerData(AIPlayerName, BM.NeutralRoleID);
                }
            }
        }
        #endregion

        #region Private Func
        void SpawnPlayerRole()
        {
            //建立玩家腳色
            if (PlayerPrefab == null)
            {
                Debug.LogError("<Color=Red><a>Missing</a></Color> playerPrefab Reference. Please set it up in GameObject 'Game Manager'", this);
            }
            else
            {
                if (PhotonNetwork.IsConnected)
                {
                    if (MyPlayerRole == null)
                    {
                        GameObject playerRole = PhotonNetwork.Instantiate(this.PlayerPrefab.name, Circle.GetRandomPosInCircle(Vector2.zero, SpawnRoleRadius), Quaternion.identity, 0);
                        MyPlayerRole = playerRole.GetComponent<PlayerRole>();
                        MyPlayerRole.Init();
                    }
                    else
                    {
                        Debug.LogFormat("Ignoring scene load for {0}", SceneManager.GetActiveScene().name);
                    }
                }
                else
                {
                    MyPlayerRole = Instantiate(PlayerPrefab, transform).GetComponent<PlayerRole>();
                    MyPlayerRole.Init();
                }
            }
        }
        public NeutralRole SpawnRandomNeutral()
        {
            if (NeutralRolePrefabs == null || NeutralRolePrefabs.Count <= 0)
                return null;
            int rand = Random.Range(0, NeutralRolePrefabs.Count);
            Vector2 randomPos = Circle.GetRandomPosInCircle(Vector2.zero, SpawnRoleRadius);
            NeutralRole nRole = null;
            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    nRole = PhotonNetwork.InstantiateSceneObject(NeutralRolePrefabs[rand].name, randomPos, Quaternion.identity).GetComponent<NeutralRole>();
                    nRole.Init();
                }
            }
            else
            {
                nRole = Instantiate(NeutralRolePrefabs[rand], randomPos, Quaternion.identity);
                nRole.Init();
            }
            return nRole;
        }
        public void WaitToSpawnGod()
        {
            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    PhotonTools.SendGodStateEvent((int)GodState.InitWaitToSapwn, GodSpawnReSpawnTime);
                }
            }
            else
            {
                GodStateTimer = new WaitToDo<float>(GodSpawnReSpawnTime, GodDebut, true);
                MyGodState = GodState.InitWaitToSapwn;
            }

        }
        void GodDebut()
        {
            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    PhotonTools.SendGodStateEvent((int)GodState.Debuting, GodDebutTime);
                }
            }
            else
            {
                GodStateTimer = new WaitToDo<float>(GodDebutTime, SpawnGod, true);
                MyGodState = GodState.Debuting;
                MyGodDebutPM = EffectEmitter.EmitParticleFromDic("GodTeleport_loop", GodSpawnPos, Vector3.zero, null, Force.Neutral);
            }
        }
        void SpawnGod()
        {
            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    PhotonTools.SendGodStateEvent((int)GodState.Exist, GodExistTime);
                }
            }
            else
            {
                if (MyGodDebutPM != null)
                    Destroy(MyGodDebutPM.gameObject);//移除登場動畫
                MyGodRole = Instantiate(GodPrefab, GodSpawnPos, Quaternion.identity);
                MyGodRole.Init();
                GodStateTimer = new WaitToDo<float>(GodExistTime, GodLeavePerform, true);
                MyGodState = GodState.Exist;
                EffectEmitter.EmitParticleFromDic("GodTeleport", GodSpawnPos, Vector3.zero, null, Force.Neutral);
            }
        }
        void GodLeavePerform()
        {
            if (GodStateTimer != null) GodStateTimer.StartRunTimer = false;
            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    PhotonTools.SendGodStateEvent((int)GodState.Leaving, GodDebutTime);
                }
            }
            else
            {
                MyGodRole.TimeOutLeave();
                GodStateTimer = new WaitToDo<float>(GodDebutTime, GodLeave, true);
                MyGodState = GodState.Leaving;
                MyGodDebutPM = EffectEmitter.EmitParticleFromDic("GodTeleport_loop", MyGodRole.transform.position, Vector3.zero, null, Force.Neutral);
            }
        }
        public void GodLeave()
        {
            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    PhotonTools.SendGodStateEvent((int)GodState.WaitToReSapwn, GodSpawnReSpawnTime);
                }
            }
            else
            {
                if (MyGodDebutPM != null)
                    Destroy(MyGodDebutPM.gameObject);//移除登場動畫
                MyGodRole.SelfDestroy();
                GodStateTimer = new WaitToDo<float>(GodSpawnReSpawnTime, GodDebut, true);
                MyGodState = GodState.WaitToReSapwn;
                EffectEmitter.EmitParticleFromDic("GodTeleport", MyGodRole.transform.position, Vector3.zero, null, Force.Neutral);
            }
        }
        void AIRoleReStart(object _nameObj)
        {
            if (!NeutralRoleDic.ContainsKey((int)_nameObj) || NeutralRoleDic[(int)_nameObj] == null) return;
            float getLevelUpProbability = 0;
            if (PhotonLauncher.SelectGameType == GameType.InfinityWar)
                getLevelUpProbability = GameSettingData.NeutralGetFeatureProbability;
            else
                getLevelUpProbability = GameSettingData.NeutralGetFeatureProbability_C;
            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    NeutralRoleDic[(int)_nameObj].photonView.RPC("Restart", RpcTarget.AllBuffered);
                    if (ProbabilityGetter.GetResult(getLevelUpProbability))
                        NeutralRoleDic[(int)_nameObj].photonView.RPC("GainExp", RpcTarget.AllBuffered, GameSettingData.NeedExps[0]);
                }
            }
            else
            {
                NeutralRoleDic[(int)_nameObj].Restart();
                if (ProbabilityGetter.GetResult(getLevelUpProbability))
                    NeutralRoleDic[(int)_nameObj].GainExp(GameSettingData.NeedExps[0]);
            }

        }
        void ChangeAIRole(object _objs)
        {
            float getLevelUpProbability = 0;
            if (PhotonLauncher.SelectGameType == GameType.InfinityWar)
                getLevelUpProbability = GameSettingData.NeutralGetFeatureProbability;
            else
                getLevelUpProbability = GameSettingData.NeutralGetFeatureProbability_C;
            object[] datas = (object[])_objs;
            int id = (int)datas[0];
            if (!NeutralRoleDic.ContainsKey(id) || NeutralRoleDic[id] == null) return;
            string name = (string)datas[1];
            //Debug.LogErrorFormat("id={0} name={1}", id, name);
            if (PhotonNetwork.IsConnected)
            {
                if (PhotonNetwork.IsMasterClient)
                {
                    NeutralRoleDic[(int)datas[0]].photonView.RPC("RestartAndChangeName", RpcTarget.AllBuffered, id, name);
                    if (ProbabilityGetter.GetResult(getLevelUpProbability))
                        NeutralRoleDic[(int)datas[0]].photonView.RPC("GainExp", RpcTarget.AllBuffered, GameSettingData.NeedExps[0]);
                }

            }
            else
            {
                NeutralRoleDic[(int)datas[0]].RestartAndChangeName(id, name);
                if (ProbabilityGetter.GetResult(getLevelUpProbability))
                    NeutralRoleDic[(int)datas[0]].GainExp(GameSettingData.NeedExps[0]);
            }

        }
        void NewAIRole()
        {
            SpawnNeutralPlayerAvatar("");
        }
        public void OnNeutralRoleDie(int _id, string _name)
        {
            if (PhotonLauncher.SelectGameType != GameType.InfinityWar) return;
            if (!NeutralRoleDic.ContainsKey(_id))
                return;
            int choiceType = 0;
            if (PhotonLauncher.SelectGameType == GameType.InfinityWar && ProbabilityGetter.GetResult(GameSettingData.AIRoleChangeProbability))
                choiceType = 1;

            MyTimer mytimer = null;
            switch (choiceType)
            {
                case 0://AI重生
                    mytimer = new MyTimer(GameSettingData.GetRandomAIRoleReSpawnInterval(), BM.AIRoleReStart, true, false, _id);
                    break;
                case 1://AI更名並重生
                    object[] datas = new object[2] { _id, GetRandomNameFromKG() };
                    mytimer = new MyTimer(GameSettingData.GetRandomAIRoleReSpawnInterval(), BM.ChangeAIRole, true, false, datas);
                    break;
            }
            //有可用的計時器則
            for (int i = 0; i < AIReSpawnIntervalTimers.Count; i++)
            {
                if (AIReSpawnIntervalTimers[i].StartRunTimer == false)
                {
                    AIReSpawnIntervalTimers[i] = mytimer;
                    return;
                }
            }
            //無可用的計時器
            AIReSpawnIntervalTimers.Add(mytimer);
        }
        public static void ResetChallengeResultProperties()
        {
            // Called before a new Challenge joins: local properties survive leaving a room.
            PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable
            {
                { PunCustomProp.ChallengeWinner.ToString(), 0 },
                { PunCustomProp.ChallengeLoser.ToString(), 0 },
                { PunCustomProp.ChallengeEnded.ToString(), 0 }
            });
        }
        public void ConfirmChallengeDeath(Role loser)
        {
            if (PhotonLauncher.SelectGameType != GameType.Challenge || ChallengeResultLocked || HasEnded ||
                loser == null || loser.IsAlive || (!(loser is PlayerRole) && !(loser is NeutralRole))) return;
            if (!PhotonNetwork.IsConnected)
            {
                LockChallengeResult(!(loser is PlayerRole), 0, 0);
                return;
            }
            // NotifyDeath is already authenticated as the victim's state authority by the bridge.
            // Only the current room master chooses which confirmed death ends the match.
            if (!PhotonNetwork.IsMasterClient) return;
            int loserActor = loser is PlayerRole ? loser.photonView.Owner.ActorNumber : 0;
            int winnerActor = 0; // Zero represents the AI side of a one-human Challenge.
            foreach (Player player in PhotonNetwork.PlayerList)
                if (player.ActorNumber != loserActor) { winnerActor = player.ActorNumber; break; }
            PublishChallengeResult(winnerActor, loserActor);
        }
        void PublishChallengeResult(int winnerActor, int loserActor)
        {
            if (!PhotonNetwork.IsMasterClient || ChallengeDecisionPublished || ChallengeResultLocked || HasEnded || winnerActor == loserActor) return;
            ChallengeDecisionPublished = true;
            ChallengeWinnerActor = winnerActor;
            ChallengeLoserActor = loserActor;
            WriteChallengeResult(winnerActor, loserActor);
            TryApplyChallengeResult();
        }
        void WriteChallengeResult(int winnerActor, int loserActor)
        {
            // A single publication prevents a receiver observing only half the decision.
            PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable
            {
                { PunCustomProp.ChallengeWinner.ToString(), winnerActor },
                { PunCustomProp.ChallengeLoser.ToString(), loserActor },
                { PunCustomProp.ChallengeEnded.ToString(), 1 }
            });
        }
        void TryApplyChallengeResult()
        {
            if (PhotonLauncher.SelectGameType != GameType.Challenge || ChallengeResultLocked || HasEnded ||
                !PhotonNetwork.InRoom || MyPlayerRole == null || !MyPlayerRole.IsInitialized) return;
            Player master = PhotonNetwork.MasterClient;
            if (master == null) return;
            var properties = master.CustomProperties;
            if (!(properties[PunCustomProp.ChallengeEnded.ToString()] is int ended) || ended != 1 ||
                !(properties[PunCustomProp.ChallengeWinner.ToString()] is int winnerActor) ||
                !(properties[PunCustomProp.ChallengeLoser.ToString()] is int loserActor) || winnerActor == loserActor) return;
            int localActor = PhotonNetwork.LocalPlayer.ActorNumber;
            if (localActor != winnerActor && localActor != loserActor) return;
            LockChallengeResult(localActor == winnerActor, winnerActor, loserActor);
        }
        void LockChallengeResult(bool win, int winnerActor, int loserActor)
        {
            if (ChallengeResultLocked || HasEnded) return;
            ChallengeResultLocked = true;
            ChallengeWinnerActor = winnerActor;
            ChallengeLoserActor = loserActor;
            IsWin = win;
            EndGame();
        }
        public void EndGame()//玩家死亡時呼叫此Func並結束遊戲
        {
            if (NeonArenaFlow.Active) return;
            if (HasEnded || (PhotonLauncher.SelectGameType == GameType.Challenge && !ChallengeResultLocked)) return;
            HasEnded = true;
            EndGameTime = System.DateTime.Now;//設定玩家結束遊戲時間
            WaitToSettlementTimer = new WaitToDo<float>(1.5f, Settlement, true);
        }
        void Settlement()
        {
            WaitToSettlementTimer = null;
            if (MyPlayerRole == null) return;
            int kill = PhotonTools.GetIntProperty(PhotonNetwork.LocalPlayer, PunCustomProp.Kills);

            if (PhotonLauncher.SelectGameType == GameType.InfinityWar)
            {
                MyPlayer.MatchSettlement(MyPlayerRole.Star, kill);

                //Send Unity Analysis
                UnityAnalyst.SendMatchResult(MyPlayerRole.LV, kill, MyPlayerRole.Star, Mathf.RoundToInt((float)SurvivalTime.TotalSeconds));
                //Send KG statistics
                if (KongregateAPIBehaviour.KGIsLogin)
                {
                    KongregateAPIBehaviour.SendKGStatistics(KGStatistics.Killing.ToString(), kill);
                    KongregateAPIBehaviour.SendKGStatistics(KGStatistics.StarCollecting.ToString(), MyPlayerRole.Star);
                    KongregateAPIBehaviour.SendKGStatistics(KGStatistics.SurvivalTime.ToString(), Mathf.RoundToInt((float)SurvivalTime.TotalSeconds));
                }
                BM.MyBattleUI.Settlement(kill, MyPlayer.MaxKill, MyPlayerRole.Star, SurvivalTime);
            }
            else
            {
                int star = 0;
                int rankScore = 0;
                if (IsWin)
                {
                    MyPlayer.AddChallengeWinningStreak(1);
                    star += GameSettingData.WinStar_C + MyPlayer.ChallengeWinningStreak * GameSettingData.WinningStreakStar_C;
                    rankScore += GameSettingData.WinRankScore_C + MyPlayer.ChallengeWinningStreak * GameSettingData.WinningStreakRankScore_C;
                    if (star > GameSettingData.MaxStar_C)
                        star = GameSettingData.MaxStar_C;
                    if (rankScore > GameSettingData.MaxRankScore_C)
                        rankScore = GameSettingData.MaxRankScore_C;
                }
                else
                {
                    MyPlayer.SetChallengeWinningStreak(0);
                    star += GameSettingData.LoseStar_C;
                    rankScore += GameSettingData.LoseRankScore_C;
                }
                BM.MyBattleUI.Settlement(kill, rankScore, star, SurvivalTime);
                MyPlayer.ChallengeSettlement(star);
                //Send Unity Analysis
                UnityAnalyst.SendChallengeResult(MyPlayerRole.LV, kill, star, Mathf.RoundToInt((float)SurvivalTime.TotalSeconds));
                //Send KG statistics
                if (KongregateAPIBehaviour.KGIsLogin)
                {
                    KongregateAPIBehaviour.SendKGStatistics(KGStatistics.ChallengeScore.ToString(), rankScore);
                }
            }
        }
        public static void InActiveAllRole()
        {
            List<int> buffer = new List<int>(BM.NeutralRoleDic.Keys);
            for(int i=0;i< buffer.Count;i++)
            {
                BM.NeutralRoleDic[buffer[i]].gameObject.SetActive(false);
            }
            BM.MyPlayerRole.gameObject.SetActive(false);
        }
        static string GetRandomNameFromKG()
        {
            string AIPlayerName = StringData.GetString("Guest");
            //若抽出的玩家名稱已經出現在場上就改用Guest當AI腳色的名稱
            AIPlayerName = KongregateAPIBehaviour.GetRandomPlayerNameFromKGStatistics(KGRangeType.lifetime);
            if (BM.CheckIfNameIsExist(AIPlayerName))
                AIPlayerName = StringData.GetString("Guest");
            return AIPlayerName;
        }
        static List<string> GetNameListFromKG()
        {
            List<string> list = new List<string>();

            return list;
        }
        #endregion
    }
}
