using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    public class PlayerData
    {
        public int ID;
        public string Name;
        public int Score;
        public PlayerData(int _id,string _name,int _score)
        {
            ID = _id;
            Name = _name;
            Score = _score;
        }
    }
}
