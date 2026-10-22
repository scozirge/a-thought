using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
namespace Scoz.Func
{
    public class TextTexture : MonoBehaviour
    {
        public Image[] Images;


        public int Number;

        public void SetNumber(int _number)
        {
            Number = _number;
            char[] chars = Number.ToString().ToCharArray();
            for (int i = 0; i < Images.Length; i++)
            {
                if (i < chars.Length)
                {
                    Images[i].sprite = GameDictionary.GetNumberIcons(int.Parse(chars[i].ToString()));
                    Images[i].gameObject.SetActive(true);
                }
                else
                    Images[i].gameObject.SetActive(false);
            }
        }

    }
}
