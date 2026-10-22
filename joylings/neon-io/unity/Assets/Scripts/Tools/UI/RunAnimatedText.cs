using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
namespace Scoz.Func
{
    public class RunAnimatedText : MonoBehaviour
    {
        Dictionary<string, AnimatedNumber> AnimatedNumberDic;
        public float Interval = 0.1f;
        public float PeriodTime = 2;
        public void Clear()
        {
            AnimatedNumberDic = new Dictionary<string, AnimatedNumber>();
        }
        public void SetAnimatedText(string _name, float _startNumber, float _endNumber, Text _text, string _prefix, string _suffix)
        {
            if (_startNumber == _endNumber)
                return;
            if (AnimatedNumberDic == null)
                AnimatedNumberDic = new Dictionary<string, AnimatedNumber>();
            AnimatedNumber an = new AnimatedNumber();
            an.Init(_startNumber, _endNumber, _text, _prefix, _suffix);
            if (!MyMath.IsInteger(_startNumber) || !MyMath.IsInteger(_endNumber))
            {
                an.AddNumber = (float)((float)(_endNumber - _startNumber) / (float)(PeriodTime / Interval));
            }
            else
            {
                an.AddNumber = (int)((float)(_endNumber - _startNumber) / (float)(PeriodTime / Interval));
                if (Mathf.Abs(an.AddNumber) < 1)
                    if (_endNumber > _startNumber)
                        an.AddNumber = 1;
                    else
                        an.AddNumber = -1;
            }
            if (!AnimatedNumberDic.ContainsKey(_name))
            {
                AnimatedNumberDic.Add(_name, an);
            }
        }

        public void Play(string _name)
        {
            StartCoroutine(RunNumberText(_name));
        }

        IEnumerator RunNumberText(string _name)
        {
            if (AnimatedNumberDic != null && AnimatedNumberDic.ContainsKey(_name))
            {
                yield return new WaitForSeconds(Interval);
                AnimatedNumberDic[_name].RunText();
                if (!AnimatedNumberDic[_name].CheckIfEnd())
                    Play(_name);
            }
        }
    }
    public class AnimatedNumber
    {
        public float StartNumber;
        public float EndNumber;
        public Text NumberText;
        public float AddNumber;
        public float CurNumber;
        public string Prefix;
        public string Suffix;


        public void Init(float _startNumber, float _endNumber, Text _text, string _prefix, string _suffix)
        {
            StartNumber = _startNumber;
            EndNumber = _endNumber;
            NumberText = _text;
            NumberText.text = StartNumber.ToString();
            CurNumber = StartNumber;
            Prefix = _prefix;
            Suffix = _suffix;
        }
        public void RunText()
        {
            CurNumber += AddNumber;
            if (EndNumber > StartNumber && CurNumber > EndNumber)
                CurNumber = EndNumber;
            else if (EndNumber < StartNumber && CurNumber < EndNumber)
                CurNumber = EndNumber;
            NumberText.text = string.Format("{0}{1}{2}", Prefix, CurNumber, Suffix);
        }
        public bool CheckIfEnd()
        {
            return (CurNumber == EndNumber);
        }
    }
}
