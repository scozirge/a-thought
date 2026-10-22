﻿using UnityEngine;
using UnityEngine.UI;
using System.Collections;
namespace Scoz.Func
{
    public class TypeAnimatedText : MonoBehaviour
    {
        //Time taken for each letter to appear (The lower it is, the faster each letter appear)
        public float letterPaused = 0.01f;
        //Message that will displays till the end that will come out letter by letter
        public string message;
        //Text for the message to display
        public Text textComp;

        // Use this for initialization
        void Start()
        {
            //Get text component
            textComp = GetComponent<Text>();
            //Message will display will be at Text
            message = textComp.text;
            //Set the text to be blank first
            textComp.text = "";
            //Call the function and expect yield to return
            StartCoroutine(TypeText());
        }

        IEnumerator TypeText()
        {
            //Split each char into a char array
            foreach (char letter in message.ToCharArray())
            {
                //Add 1 letter each
                textComp.text += letter;
                yield return 0;
                yield return new WaitForSeconds(letterPaused);
            }
        }
    }
}