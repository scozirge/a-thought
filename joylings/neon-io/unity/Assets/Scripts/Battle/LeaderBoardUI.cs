using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    [RequireComponent(typeof(LeaderBoardItemSpawner))]
    public class LeaderBoardUI : MonoBehaviourPunCallbacks, IMyUI
    {
        ItemSpawner<LeaderboardItem> MyItemSpawner = null;
        public static Dictionary<int, LeaderboardItem> ItemDic = new Dictionary<int, LeaderboardItem>();
        WaitToDo<float> WaitToInitPlayersData;
        static LeaderBoardUI activeBoard;

        void Awake()
        {
            EnsureSpawner();
        }
        void EnsureSpawner()
        {
            if (MyItemSpawner == null) MyItemSpawner = GetComponent<LeaderBoardItemSpawner>();
            if (activeBoard != this)
            {
                activeBoard = this;
                ItemDic.Clear();
            }
        }
        void OnDestroy()
        {
            WaitToInitPlayersData = null;
            if (activeBoard == this) { ItemDic.Clear(); activeBoard = null; }
        }

        public void Init()
        {
            // Network peers may arrive before BattleManager finishes loading its scene.
            // Keep rows already inserted by those callbacks.
            EnsureSpawner();
            if (!PhotonNetwork.IsConnected)
                return;
            WaitToInitPlayersData = new WaitToDo<float>(2, InitPlayersData, true);
        }
        void Update()
        {
            if (WaitToInitPlayersData != null)
                WaitToInitPlayersData.RunTimer();
        }
        void InitPlayersData()
        {
            //一進遊戲把房間內所有玩家加入清單中
            foreach (Player p in PhotonNetwork.PlayerList)
            {
                AddPlayer(p);
            }
            //一進遊戲把房間內所有AI加入清單中
            if (BattleManager.BM != null) foreach (NeutralRole p in BattleManager.BM.NeutralRoleDic.Values)
            {
                if (ItemDic.ContainsKey(p.ID))
                    ItemDic[p.ID].UpdateScore(p.Kills);
            }
            SortItems();
            WaitToInitPlayersData = null;
        }
        public void AddPlayer(Player _player)
        {
            if (_player == null) return;
            EnsureSpawner();
            if (!ItemDic.ContainsKey(_player.ActorNumber))
            {
                LeaderboardItem item = MyItemSpawner.Spawn<LeaderboardItem>();
                item.Init(0, _player.NickName, PhotonTools.GetIntProperty(_player, PunCustomProp.Kills));
                ItemDic.Add(_player.ActorNumber, item);
                SortItems();
            }
            else
            {
                Debug.LogWarning("重複的玩家ActorNumber在ItemDic中");
            }
        }
        public void AddPlayer(NeutralRole _role)
        {
            if (_role == null) return;
            EnsureSpawner();
            if (ItemDic.TryGetValue(_role.ID, out LeaderboardItem existing) && existing != null)
            {
                existing.UpdateScore(_role.Kills);
                SortItems();
                return;
            }
            LeaderboardItem item = MyItemSpawner.Spawn<LeaderboardItem>();
            item.Init(0, _role.Name, _role.Kills);
            if (!ItemDic.ContainsKey(_role.ID))
                ItemDic.Add(_role.ID, item);
            else
                ItemDic[_role.ID] = item;
            SortItems();
        }
        public void RemovePlayer(Player _player)
        {
            if (_player == null) return;
            if (ItemDic.ContainsKey(_player.ActorNumber))
            {
                if (ItemDic[_player.ActorNumber] != null) ItemDic[_player.ActorNumber].SelfDestroy();
                ItemDic.Remove(_player.ActorNumber);
            }
            else
            {
                Debug.LogWarning("ItemDic不存在此玩家ActorNumber:" + _player.ActorNumber);
            }
        }
        public void RemovePlayer(int _id)
        {
            if (ItemDic.ContainsKey(_id))
            {
                if (ItemDic[_id] != null) ItemDic[_id].SelfDestroy();
                ItemDic.Remove(_id);
            }
            else
            {
                Debug.LogWarning("ItemDic不存在此AI玩家ID:" + _id);
            }
        }
        public void RefreshPlayerScore()
        {
            if (ItemDic == null)
                return;
            //一進遊戲把房間內所有玩家加入玩家清單中
            foreach (Player p in PhotonNetwork.PlayerList)
            {
                if(p!=null)
                {
                    if (ItemDic.TryGetValue(p.ActorNumber, out LeaderboardItem item) && item != null)
                        item.UpdateScore(PhotonTools.GetIntProperty(p, PunCustomProp.Kills));

                }
            }
            if (BattleManager.BM != null) foreach (NeutralRole p in BattleManager.BM.NeutralRoleDic.Values)
            {
                if (ItemDic.ContainsKey(p.ID))
                    ItemDic[p.ID].UpdateScore(p.Kills);
            }
            SortItems();
        }
        void SortItems()
        {
            ItemDic = ItemDic.Where(data => data.Value != null).OrderBy(data => data.Value).ToDictionary(data => data.Key, data => data.Value);
            //排序UI
            int i = 0;
            foreach (LeaderboardItem item in ItemDic.Values)
            {
                item.transform.SetSiblingIndex(i);
                item.UpdateRank(i + 1);
                i++;
            }
        }
        public void SetPlayerScore(int _id, int _score)
        {
            if (ItemDic.ContainsKey(_id))
            {
                ItemDic[_id].UpdateScore(_score);
            }
            SortItems();
        }
        // Update is called once per frame

        public void SetActive(bool _bool)
        {
            gameObject.SetActive(_bool);
        }

        public void RefreshText()
        {
        }
    }
}
