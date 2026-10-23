using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Neon.Networking;
using Scoz.Func;
using UnitySceneManager = UnityEngine.SceneManagement.SceneManager;

namespace Starbro.NeonIO
{
    public class PhotonLauncher : MonoBehaviourPunCallbacks
    {
        #region Public Field
        #endregion

        #region Private Field
        static LobbyUI MyLobbyUI;
        /// <summary>
        /// This client's version number. Users are separated from each other by gameVersion (which allows you to make breaking changes).
        /// </summary>
        static string GameVersion = "neon-fusion-1";
        /// <summary>
        /// Keep track of the current process. Since connection is asynchronous and is based on several callbacks from Photon,
        /// we need to keep track of this to properly adjust the behavior when we receive call back by Photon.
        /// Typically this is used for the OnConnectedToMaster() callback.
        /// </summary>
        static bool IsJoingTheRoom;
        public static GameType SelectGameType;

        

        #endregion

        #region MonoBehaviour Func
        /// <summary>
        /// MonoBehaviour method called on GameObject by Unity during early initialization phase.
        /// </summary>
        void Awake()
        {
            // #Critical
            // this makes sure we can use PhotonNetwork.LoadLevel() on the master client and all clients in the same room sync their level automatically
            PhotonNetwork.AutomaticallySyncScene = true;

        }

        /// <summary>
        /// MonoBehaviour method called on GameObject by Unity during initialization phase.
        /// </summary>
        public override void OnEnable()
        {
            base.OnEnable();
            PhotonNetwork.NetworkingClient.EventReceived += OnEvent;
        }
        public override void OnDisable()
        {
            PhotonNetwork.NetworkingClient.EventReceived -= OnEvent;
            base.OnDisable();
        }
        void Start()
        {
            PhotonPeer.RegisterType(typeof(BufferData), (byte)CustomType.RoleBuffer, BufferData.Serialize, BufferData.Deserialize);
        }
        #endregion

        #region MonoBehaviourPunCallbacks Callbacks
        public override void OnConnectedToMaster()
        {
            Debug.Log("Connected To Master, Your Region：" + PhotonNetwork.CloudRegion);
            UnityAnalyst.SendRegion(PhotonNetwork.CloudRegion, PhotonNetwork.GetPing());
            // we don't want to do anything if we are not attempting to join a room.
            // this case where isConnecting is false is typically when you lost or quit the game, when this level is loaded, OnConnectedToMaster will be called, in that case
            // we don't want to do anything.
            if (IsJoingTheRoom)
            {
                IsJoingTheRoom = false;
                // #Critical: The first we try to do is to join a potential existing room. If there is, good, else, we'll be called back with OnJoinRandomFailed()
                PhotonNetwork.JoinRandomRoom();
            }
        }

        public override void OnDisconnected(DisconnectCause cause)
        {
            Debug.LogWarning("Disconnected:" + cause);
            IsJoingTheRoom = false;
            NeonArenaFlow.Disconnected();
            UnityAnalyst.SendDisconnected();
            var challenge = ChallengeUI.Myself as ChallengeUI;
            if (challenge != null && ChallengeUI.IsFindingOpponent) challenge.CancelChallenge();
            if (MyLobbyUI != null)
            {
                MyLobbyUI.ActiveProgressLab(false);
                MyLobbyUI.ActiveControlPanel(true);
                if (!string.IsNullOrEmpty(PhotonNetwork.LastError))
                    PopupUI.ShowClickCancel(PhotonNetwork.LastError, null);
            }
            //Connect(LobbyUI.ChooseedRegion);
            
        }

        public override void OnJoinRandomFailed(short returnCode, string message)
        {
            Debug.Log("No random room available, so we create one.\nCalling: PhotonNetwork.CreateRoom");

            // #Critical: we failed to join a random room, maybe none exists or they are all full. No worries, we create a new room.
            if (SelectGameType == GameType.Arena)
                PhotonNetwork.CreateRoom(null, new RoomOptions { MaxPlayers = 16 });
            else if (SelectGameType == GameType.InfinityWar)
                PhotonNetwork.CreateRoom(null, new RoomOptions { MaxPlayers = GameSettingData.MaxPlayersPerRoom });
            else
                PhotonNetwork.CreateRoom(null, new RoomOptions { MaxPlayers = GameSettingData.MaxPlayersPerRoom_C });
        }

        public override void OnJoinedRoom()
        {
            if (SelectGameType == GameType.Arena)
            {
                if (!NeonArenaFlow.Searching) PhotonNetwork.Disconnect();
                return;
            }
            if (SelectGameType == GameType.Challenge && !ChallengeUI.IsFindingOpponent)
            {
                PhotonNetwork.Disconnect();
                return;
            }
            if (PhotonNetwork.CurrentRoom == null) return;
            if (SelectGameType == GameType.InfinityWar)
            {
                // Shared-mode joins may finish together, so the creator can already
                // see multiple players when this callback runs. Scene authority,
                // rather than player count, decides who starts the battle.
                if (PhotonNetwork.IsMasterClient && UnitySceneManager.GetActiveScene().name != MyScene.Battle.ToString())
                    PhotonNetwork.LoadLevel(MyScene.Battle.ToString());
                return;
            }
            if (PhotonNetwork.CurrentRoom.PlayerCount == 1)
            {
                switch(SelectGameType)
                {
                    case GameType.InfinityWar:
                        PhotonNetwork.LoadLevel(MyScene.Battle.ToString());
                        break;
                    case GameType.Challenge:
                        //加入房間後可等待玩家進入(但介面中還是顯示搜尋玩家中)
                        break;
                }
            }
            else
            {
                switch (SelectGameType)
                {
                    case GameType.Challenge:
                        if (ChallengeUI.Myself == null) return;
                        ChallengeUI.Myself.FoundOpponent(PhotonNetwork.MasterClient.NickName);
                        int[] ids = new int[5];
                        for(int i=0;i<ids.Length;i++)
                        {
                            ids[i] = MyPlayer.ChallengeSelectFeatures[i].ID;
                        }
                        PhotonTools.SendPlayerSelectFeaturesEvent(ids);
                        break;
                }
            }
        }
        public void OnEvent(EventData photonEvent)
        {
            byte eventCode = photonEvent.Code;
            //Debug.Log("eventCode=" + eventCode);

            switch (eventCode)
            {
                case (byte)PhotonTools.EventCode.ChallengeSelectFeature:
                    var challenge = ChallengeUI.Myself as ChallengeUI;
                    var ids = photonEvent.CustomData as int[];
                    if (challenge != null && ChallengeUI.IsFindingOpponent && ids != null)
                        challenge.SetOpponentFeatures(ids);
                    break;
            }
        }
        public override void OnPlayerEnteredRoom(Player newPlayer)
        {
            switch (SelectGameType)
            {
                case GameType.InfinityWar:
                    break;
                case GameType.Challenge:
                    if (ChallengeUI.Myself == null || !ChallengeUI.IsFindingOpponent) return;
                    ChallengeUI.Myself.FoundOpponent(newPlayer.NickName);
                    int[] ids = new int[5];
                    for (int i = 0; i < ids.Length; i++)
                    {
                        ids[i] = MyPlayer.ChallengeSelectFeatures[i].ID;
                    }
                    PhotonTools.SendPlayerSelectFeaturesEvent(ids);//發送給除了masterClient以外其他玩家
                    break;
            }
        }
        public override void OnPlayerLeftRoom(Player otherPlayer)
        {
            switch (SelectGameType)
            {
                case GameType.InfinityWar:
                    break;
                case GameType.Challenge:
                    var challenge = ChallengeUI.Myself as ChallengeUI;
                    if (challenge != null && ChallengeUI.IsFindingOpponent) challenge.CancelChallenge();
                    break;
            }
            
        }
        #endregion

        #region Public Func
        public static void Connect(Region _region)
        {
            PhotonNetwork.GameVersion = GameVersion + "-" + SelectGameType;
            if (PhotonNetwork.IsConnected)
            {
                if (IsJoingTheRoom && !PhotonNetwork.InRoom)
                {
                    IsJoingTheRoom = false;
                    PhotonNetwork.JoinRandomRoom();
                }
                return;
            }
            string region = _region.ToString();
            if (region == Region.Auto.ToString())
                PhotonNetwork.PhotonServerSettings.AppSettings.FixedRegion = "";
            else
            {
                if (region == Region.India.ToString())
                    region = "in";
                PhotonNetwork.PhotonServerSettings.AppSettings.FixedRegion = region;
            }
            PhotonNetwork.ConnectUsingSettings();
        }

        public static void JoinTheRandomRoom()
        {
            if (IsJoingTheRoom || PhotonNetwork.InRoom) return;
            Debug.Log("JoinTheRandomRoom");
            IsJoingTheRoom = true;
            Connect(LobbyUI.ChooseedRegion);
            /*
            if (!PhotonNetwork.IsConnected)
            {
                IsJoingTheRoom = true;
                Connect(MyLobbyUI.ChooseedRegion);
            }
            else
                PhotonNetwork.JoinRandomRoom();
             */
        }
        public static void CancelJoin()
        {
            IsJoingTheRoom = false;
        }
        public static void SetLobbyUI(LobbyUI _myLobbyUI)
        {
            MyLobbyUI = _myLobbyUI;
        }

        #endregion

        #region Private Func
        #endregion
    }
}
