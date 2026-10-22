using System.Collections.Generic;
using UnityEngine;
using Neon.Networking;
using Starbro.NeonIO;
using Soze.Func;
using System.Linq;

namespace Scoz.Func
{
    public partial class PhotonTools
    {
        public static void AddIntProp(Player _player, PunCustomProp _prop, int _addValue)
        {
            if (!PhotonNetwork.IsConnected)
                return;
            if (_player == null)
            {
                Debug.LogWarning("Player為null");
                return;
            }
            int value = GetIntProperty(_player, _prop);
            value += _addValue;
            Hashtable hash = new Hashtable();
            hash.Add(_prop.ToString(), value);
            _player.SetCustomProperties(hash);
        }
        public static void SetIntProp(Player _player, PunCustomProp _prop, int _value)
        {
            if (!PhotonNetwork.IsConnected)
                return;
            if (_player == null)
            {
                Debug.LogWarning("Player為null");
                return;
            }
            Hashtable hash = new Hashtable();
            hash.Add(_prop.ToString(), _value);
            _player.SetCustomProperties(hash);
        }
        public static void SetFloatProp(Player _player, PunCustomProp _prop, float _value)
        {
            if (!PhotonNetwork.IsConnected)
                return;
            if (_player == null)
            {
                Debug.LogWarning("Player為null");
                return;
            }
            Hashtable hash = new Hashtable();
            hash.Add(_prop.ToString(), _value);
            _player.SetCustomProperties(hash);
        }
        public static void SetObjProp(Player _player, PunCustomProp _prop, object _setData)
        {
            if (!PhotonNetwork.IsConnected)
                return;
            if (_player == null)
            {
                Debug.LogWarning("Player為null");
                return;
            }
            Hashtable props = new Hashtable();
            props.Add(_prop.ToString(), _setData);
            _player.SetCustomProperties(props);
        }
        public static void AddStringToUniqueStringProp(Player _player, PunCustomProp _prop, string _addStr)
        {
            if (!PhotonNetwork.IsConnected)
                return;
            if (_addStr == "")
                return;
            if (_player == null)
            {
                Debug.LogWarning("Player為null");
                return;
            }
            Hashtable props = new Hashtable();
            string originalStr = "";
            List<string> strList = null;
            if (_player.CustomProperties[_prop.ToString()] != null)
            {
                originalStr = _player.CustomProperties[_prop.ToString()].ToString();
                strList = originalStr.Split(',').ToList();
            }
            else
            {
                strList = new List<string>();
            }
            if (!strList.Contains(_addStr))
            {
                strList.Add(_addStr);
            }
            else
                return;
            string newStr = TextManager.StringListToString(strList, ',');
            props.Add(_prop.ToString(), newStr);
            _player.SetCustomProperties(props);
        }
        public static int GetIntProperty(Player _player, PunCustomProp _prop)
        {
            if (!PhotonNetwork.IsConnected)
                return 0;
            if (_player == null)
            {
                Debug.LogWarning("Player為null");
                return 0;
            }
            int value = 0;
            if (_player.CustomProperties[_prop.ToString()] != null)
                value = (int)_player.CustomProperties[_prop.ToString()];
            return value;
        }
        public static float GetFloatProperty(Player _player, PunCustomProp _prop)
        {
            if (!PhotonNetwork.IsConnected)
                return 0;
            if (_player == null)
            {
                Debug.LogWarning("Player為null");
                return 0;
            }
            float value = 0;
            if (_player.CustomProperties[_prop.ToString()] != null)
                value = (float)_player.CustomProperties[_prop.ToString()];
            return value;
        }
        public static string GetStrProperty(Player _player, PunCustomProp _prop)
        {
            if (!PhotonNetwork.IsConnected)
                return "";
            if (_player == null)
            {
                Debug.LogWarning("Player為null");
                return "";
            }
            string str = "";
            if (_player.CustomProperties[_prop.ToString()] != null)
                str = _player.CustomProperties[_prop.ToString()].ToString();
            return str;
        }
    }
}
