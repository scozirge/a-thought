using UnityEngine;
using System.Collections;
using System.Collections.Generic;
namespace Scoz.Func
{
    public class TextManager
    {
        /// <summary>
        /// 字串以字元分割轉int[]
        /// </summary>
        public static int[] StringSplitToIntArray(string _str, char _char)
        {
            int[] result;
            string[] resultStr = _str.Split(_char);
            result = new int[resultStr.Length];
            for (int i = 0; i < resultStr.Length; i++)
            {
                result[i] = int.Parse(resultStr[i]);
            }
            return result;
        }
        /// <summary>
        /// 字串以字元分割轉字串[]
        /// </summary>
        public static string[] StringSplitToStringArray(string _str, char _char)
        {
            string[] result = _str.Split(_char);
            return result;
        }

        /// <summary>
        /// int陣列轉字串並以字元分割
        /// </summary>
        /// <returns></returns>
        public static string IntArrayToStringSplitByChar(int[] _ints, char _char)
        {
            string result = "";
            for (int i = 0; i < _ints.Length; i++)
            {
                if (i != 0)
                    result += _char;
                result += _ints[i].ToString();
            }
            return result;
        }
        /// <summary>
        /// int List轉字串並以字元分割
        /// </summary>
        /// <returns></returns>
        public static string IntListToStringSplitByChar(List<int> _ints, char _char)
        {
            string result = "";
            for (int i = 0; i < _ints.Count; i++)
            {
                if (i != 0)
                    result += _char;
                result += _ints[i].ToString();
            }
            return result;
        }
        /// <summary>
        /// 字串以字元分割轉字串List
        /// </summary>
        public static string StringListToString(List<string> _list, char _char)
        {
            string result = "";
            for (int i = 0; i < _list.Count; i++)
            {
                if (result != "")
                    result += _char;
                result += _list[i];
            }
            return result;
        }
        /// <summary>
        /// 小數轉為百分比
        /// </summary>
        public static float FloatToPercent(float _value)
        {
            return _value * 100;
        }
    }
}
