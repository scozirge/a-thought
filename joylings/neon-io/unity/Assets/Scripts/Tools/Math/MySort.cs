using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class MySort
    {
        public static Dictionary<T, U> GetSortDicByKey<T, U>(Dictionary<T, U> _dic)
        {
            Dictionary<T, U> resultDic = new Dictionary<T, U>();
            List<T> keys = new List<T>(_dic.Keys);
            keys.Sort();
            foreach (T key in keys)
            {
                resultDic.Add(key, _dic[key]);
            }
            return resultDic;
        }
        public static Dictionary<T, U> GetReverseDic<T, U>(Dictionary<T, U> _dic)
        {
            Dictionary<T, U> resultDic = new Dictionary<T, U>();
            List<T> keys = new List<T>(_dic.Keys);
            keys.Reverse();
            foreach (T key in keys)
            {
                resultDic.Add(key, _dic[key]);
            }
            return resultDic;
        }
    }
}
