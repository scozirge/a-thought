using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class ArrayTools
    {
        public static bool CheckContent<T>(T[] _array, params T[] _check) where T : class
        {
            for (int i = 0; i < _array.Length; i++)
            {
                for (int j = 0; j < _check.Length; j++)
                {
                    if (_array[i] == _check[j])
                        return true;
                }
            }
            return false;
        }
    }
}
