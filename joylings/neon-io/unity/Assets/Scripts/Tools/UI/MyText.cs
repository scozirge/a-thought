using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using System.Collections;
using System.Collections.Generic;
namespace Scoz.Func
{
    public class MyText : Text
    {
        [SerializeField]
        public string UIString;
        public bool IsAddTextList;
        public static List<MyText> MyTextList = new List<MyText>();
        public delegate void MyFunction();
        static List<MyFunction> MyFuncList = new List<MyFunction>();

        protected override void OnEnable()
        {
            base.OnEnable();
            if (!Application.isPlaying)
                return;
            if (!IsAddTextList)
                MyTextList.Add(this);
            SetText();
            IsAddTextList = true;
        }
        void SetText()
        {
            if (UIString == "" || !GameDictionary.IsInit)
                return;
            if (GameDictionary.String_UIDic.ContainsKey(UIString))
            {
                text = GameDictionary.String_UIDic[UIString].GetString(MyPlayer
                    .UseLanguage);
            }
            else
            {
                text = "undefined";
            }
        }
        public static void RefreshActivityTexts()
        {
            MyTextList.RemoveAll(item => item == null);
            MyFuncList.RemoveAll(item => item == null);
            for (int i = 0; i < MyTextList.Count; i++)
            {
                if (MyTextList[i] != null && MyTextList[i].isActiveAndEnabled)
                    MyTextList[i].SetText();
            }
            for (int i = 0; i < MyFuncList.Count; i++)
            {
                if (MyFuncList[i] != null)
                    MyFuncList[i]();
            }
        }
        public static void AddRefreshFunc(MyFunction _func)
        {
            MyFuncList.Add(_func);
        }
        public static void RemoveRefreshFunc(MyFunction _func)
        {
            MyFuncList.Remove(_func);
        }
    }
}