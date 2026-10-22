using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using UnityEngine.UI;
using System;

namespace Starbro.NeonIO
{
    public class LeaderboardItem : Item, IComparable<LeaderboardItem>
    {
        [SerializeField]
        Text RankText = null;
        [SerializeField]
        Text NameText = null;
        [SerializeField]
        Text ScoreText = null;

        public int Rank { get; private set; }
        public string Name { get; private set; }
        public int Score { get; private set; }

        public void Init(int _rank, string _name, int _score)
        {
            Rank = _rank;
            Name = _name;
            Score = _score;
            RefreshItem();
        }
        public void UpdateScore(int _score)
        {
            Score = _score;
            RefreshItem();
        }
        public void UpdateRank(int _rank)
        {
            Rank = _rank;
            RefreshItem();
        }
        public override void RefreshItem()
        {
            base.RefreshItem();
            RankText.text = Rank.ToString();
            NameText.text = Name.ToString();
            ScoreText.text = Score.ToString();
        }

        public int CompareTo(LeaderboardItem _item)
        {
            return _item.Score.CompareTo(this.Score);
        }
    }
}
