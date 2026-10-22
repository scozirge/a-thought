using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class MyMath : MonoBehaviour
    {
        /// <summary>
        /// 依據X座標取得在兩點連成的直線上的座標點Y
        /// </summary>
        /// <returns></returns>
        public static float GetPointYOnLineOfTwoPointByPointX(Vector2 _pos1, Vector2 _pos2, float _x)
        {
            //(Ｘ2-Ｘ1)(Ｙ-Ｙ1)=(Ｙ2-Ｙ1)(Ｘ-Ｘ1)兩點式直線方程式
            float yPoint = ((_pos2.y - _pos1.y) * (_x - _pos1.x)/ (_pos2.x - _pos1.x)) + _pos1.y;
            return yPoint;
        }
        /// <summary>
        /// 依據Y座標取得在兩點連成的直線上的座標點X
        /// </summary>
        /// <returns></returns>
        public static float GetPointXOnLineOfTwoPointByPointY(Vector2 _pos1, Vector2 _pos2, float _y)
        {
            //(Ｘ2-Ｘ1)(Ｙ-Ｙ1)=(Ｙ2-Ｙ1)(Ｘ-Ｘ1)兩點式直線方程式
            float xPoint = (((_pos2.x - _pos1.x) * (_y - _pos1.y)) / (_pos2.y - _pos1.y)) + _pos1.x;
            return xPoint;
        }
        public static float GetTopProportionInTotal(float _curRank, float _total)
        {
            float result = 0;
            result = _curRank / _total * 100;
            result = Mathf.Round(result);
            return result;
        }
        public static int GetNumber1DividedByNumber2(float _number1, float _number2)
        {
            return (int)(Mathf.Round(_number1 / _number2));
        }
        public static int GetNumber1TimesNumber2(float _number1, float _number2)
        {
            return (int)(Mathf.Round(_number1 * _number2));
        }
        public static float Calculate_ReturnFloat(float _num1, float _num2, Operator _operator)
        {
            float result = 0;
            switch (_operator)
            {
                case Operator.Plus:
                    result = _num1 + _num2;
                    break;
                case Operator.Minus:
                    result = _num1 - _num2;
                    break;
                case Operator.Times:
                    result = _num1 * _num2;
                    break;
                case Operator.Divided:
                    if (_num2 == 0)
                    {
                        result = 0;
                        Debug.LogWarning("不可除以0");
                    }
                    else
                        result = _num1 / _num2;
                    break;
                case Operator.Equal:
                    result = Mathf.Round(_num2);
                    break;
            }
            return result;
        }
        public static int Calculate_ReturnINT(float _num1, float _num2, Operator _operator)
        {
            int result = 0;
            switch (_operator)
            {
                case Operator.Plus:
                    result = (int)Mathf.Round(_num1 + _num2);
                    break;
                case Operator.Minus:
                    result = (int)Mathf.Round(_num1 - _num2);
                    break;
                case Operator.Times:
                    result = (int)Mathf.Round(_num1 * _num2);
                    break;
                case Operator.Divided:
                    result = (int)Mathf.Round(_num1 / _num2);
                    break;
                case Operator.Equal:
                    result = (int)(Mathf.Round(_num2));
                    break;
            }
            return result;
        }
        public static bool IsInteger(float _number)
        {
            if (_number.ToString().IndexOf(".") == -1)
            {
                return true;
            }
            else
            {
                return false;
            }
        }
        public static float StringToNumber(string _str)
        {
            float result;
            float.TryParse(_str, out result);
            return result;
        }
        public static float StringToNumber(string _str, string _prefix, string _suffix)
        {
            float result;
            if (_prefix != "")
                _str = _str.Replace(_prefix, "");
            if (_suffix != "")
                _str = _str.Replace(_suffix, "");
            float.TryParse(_str, out result);
            return result;
        }
        public static bool AllAreEqual<T>(params T[] _args)
        {
            if (_args != null && _args.Length > 1)
            {
                for (int i = 1; i < _args.Length; i++)
                {
                    if (!_args[i].Equals(_args[i - 1])) return false;
                }
            }
            else
                Debug.LogWarning("傳入要比較的參數為null或數量為0");
            return true;
        }
        public static bool EqualToAll<T>(T _beComparedArg, params T[] _compareArgs)
        {
            if (_compareArgs != null && _compareArgs.Length > 1)
            {
                for (int i = 0; i < _compareArgs.Length; i++)
                {
                    if (!_beComparedArg.Equals(_compareArgs[i])) return false;
                }
            }
            else
                Debug.LogWarning("傳入要比較的參數為null或數量為0");
            return true;
        }
        public static bool EqualToOneOfAll<T>(T _beComparedArg, params T[] _compareArgs)
        {
            if (_compareArgs != null && _compareArgs.Length > 1)
            {
                for (int i = 0; i < _compareArgs.Length; i++)
                {
                    if (_beComparedArg.Equals(_compareArgs[i])) return true;
                }
            }
            else
                Debug.LogWarning("傳入要比較的參數為null或數量為0");
            return false;
        }
        public static float GetAngerFormTowPoint2D(Vector2 _form, Vector2 _to)
        {
            Vector2 vector = _form - _to;
            float angle = (float)((Mathf.Atan2(vector.x, vector.y) / Mathf.PI) * 180f);
            if (angle < 0) angle += 360f;
            return angle;
        }
        public static float GetAngleFromVelocity(Vector2 _velocity)
        {
            float angle = Mathf.Atan2(_velocity.y, _velocity.x) * Mathf.Rad2Deg;
            return angle;
        }
        public static Vector3 GetEulerFromAngle(float _angle)
        {
            return Quaternion.AngleAxis(_angle, Vector3.forward) * Vector3.right;
        }
    }
}
