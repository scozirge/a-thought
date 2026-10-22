using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using System;

namespace Scoz.Func
{
    public class MyEnum : MonoBehaviour
    {
        public static T ParseEnum<T>(string value)
        {
            return (T)Enum.Parse(typeof(T), value, true);
        }
        public static int GetTypeCount<T>() where T : struct, IConvertible
        {
            return Enum.GetValues(typeof(T)).Length;
        }
        public static T[] GetValues<T>() where T : struct, IConvertible
        {
            if (!typeof(T).IsEnum)
            {
                throw new ArgumentException("T must be an enumerated type");
            }
            return Enum.GetValues(typeof(T)).Cast<T>().ToArray<T>();
        }
        public static bool CheckEnumExistInArray<T>(T[] _array, params T[] _check) where T : struct, IConvertible
        {
            for (int i = 0; i < _array.Length; i++)
            {
                for (int j = 0; j < _check.Length; j++)
                {
                    if (_array[i].ToString() == _check[j].ToString())
                    {
                        return true;
                    }

                }
            }
            return false;
        }
        public static bool CheckEnumExistInDicKeys<T, U>(Dictionary<T, U> _dic, params T[] _check) where T : struct, IConvertible
        {
            T[] array = _dic.Keys.ToArray();
            for (int i = 0; i < array.Length; i++)
            {
                for (int j = 0; j < _check.Length; j++)
                {
                    if (array[i].ToString() == _check[j].ToString())
                        return true;
                }
            }
            return false;
        }
    }
}
