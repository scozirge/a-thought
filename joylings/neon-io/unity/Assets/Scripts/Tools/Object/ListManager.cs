using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
namespace Scoz.Func
{
    public class ListManager
    {

        public static void RemoveAt<T>(ref T[] arr, int index)
        {
            for (int i = index; i < arr.Length - 1; i++)
            {
                // moving elements downwards, to fill the gap at [index]
                arr[i] = arr[i + 1];
            }
            // finally, let's decrement Array's size by one
            Array.Resize(ref arr, arr.Length - 1);
        }
    }
}