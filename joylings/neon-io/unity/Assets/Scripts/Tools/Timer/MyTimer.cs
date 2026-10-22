using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class MyTimer
    {
        public float CurTimer { get; private set; }
        public float CircleTime { get; private set; }
        public bool StartRunTimer;
        public bool Loop;
        public object Obj;
        public delegate void MyDelegate();
        public delegate void MyKeyDelegate(object _obj);
        MyDelegate TimeOutFunc;
        MyDelegate RunTimeFunc;
        MyKeyDelegate TimeOutFuncWithKey;


        public MyTimer(float _circleTime, MyDelegate _timeOutFunc, bool _startRunTimer, bool _loop)
        {
            CircleTime = _circleTime;
            CurTimer = CircleTime;
            TimeOutFunc = _timeOutFunc;
            StartRunTimer = _startRunTimer;
            Loop = _loop;
            if (CircleTime == 0)
            {
                Debug.LogWarning(string.Format("{0}'s CircleTime of MyTimer is 0", _timeOutFunc.Method.Name));
            }
        }
        public MyTimer(float _circleTime, MyDelegate _timeOutFunc, MyDelegate _runTimeFunc, bool _startRunTimer, bool _loop)
        {
            CircleTime = _circleTime;
            CurTimer = CircleTime;
            TimeOutFunc = _timeOutFunc;
            RunTimeFunc = _runTimeFunc;
            StartRunTimer = _startRunTimer;
            Loop = _loop;
            if (CircleTime == 0)
                Debug.LogWarning("CircleTime of MyTimer is 0");
        }
        public MyTimer(float _circleTime, MyKeyDelegate _timeOutFunc, MyDelegate _runTimeFunc, bool _startRunTimer, bool _loop, object _obj)
        {
            CircleTime = _circleTime;
            CurTimer = CircleTime;
            TimeOutFuncWithKey = _timeOutFunc;
            RunTimeFunc = _runTimeFunc;
            StartRunTimer = _startRunTimer;
            Loop = _loop;
            Obj = _obj;
            if (CircleTime == 0)
            {
                Debug.LogWarning(string.Format("{0}'s CircleTime of MyTimer is 0", _timeOutFunc.Method.Name));
            }
        }
        public MyTimer(float _circleTime, MyKeyDelegate _timeOutFunc, bool _startRunTimer, bool _loop, object _obj)
        {
            CircleTime = _circleTime;
            CurTimer = CircleTime;
            TimeOutFuncWithKey = _timeOutFunc;
            StartRunTimer = _startRunTimer;
            Loop = _loop;
            Obj = _obj;
            if (CircleTime == 0)
            {
                Debug.LogWarning(string.Format("{0}'s CircleTime of MyTimer is 0", _timeOutFunc.Method.Name));
            }
        }
        public void RestartCountDown()
        {
            CurTimer = CircleTime;
        }
        public void ResetCircleTime(float _CircleTime)
        {
            CircleTime = _CircleTime;
        }
        public void SetCurTimer(float _time)
        {            
            CurTimer = _time;
        }
        public void RunTimer()
        {
            if (CircleTime == 0)
                return;
            if (!StartRunTimer)
                return;
            RunTimeFunc?.Invoke();
            if (CurTimer > 0)
                CurTimer -= Time.deltaTime;
            else
            {
                CurTimer = CircleTime;
                StartRunTimer = Loop;
                if (TimeOutFunc != null)
                    TimeOutFunc();
                else 
                    TimeOutFuncWithKey(Obj);
            }
        }
    }
}
