using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;

namespace Starbro.NeonIO
{
    public class PreciseTimer 
    {
        public float CurTimer;
        public float CircleTime { get; private set; }
        public bool StartRunTimer;
        public bool Loop;
        public object Obj;
        public delegate void MyDelegate();
        public delegate void MyParameterDelegate(object _obj);
        MyDelegate TimeOutFunc;
        MyDelegate RunTimeFunc;
        MyParameterDelegate TimeOutFuncWithObj;
        float DurationTime = 0;
        int MaxTriggerTimes=0;
        int TriggerTimes = 0;


        public PreciseTimer(float _circleTime,float _durationTime, MyDelegate _timeOutFunc, bool _startRunTimer, bool _loop)
        {
            CircleTime = _circleTime;
            CurTimer = CircleTime;
            TimeOutFunc = _timeOutFunc;
            StartRunTimer = _startRunTimer;
            DurationTime = _durationTime;
            MaxTriggerTimes = Mathf.RoundToInt(DurationTime / CircleTime);
            Loop = _loop;
            TriggerTimes = 0;
            if (CircleTime == 0)
            {
                Debug.LogWarning(string.Format("{0}'s CircleTime of MyTimer is 0", _timeOutFunc.Method.Name));
            }
        }
        public PreciseTimer(float _circleTime, float _durationTime, MyDelegate _timeOutFunc, MyDelegate _runTimeFunc, bool _startRunTimer, bool _loop)
        {
            CircleTime = _circleTime;
            CurTimer = CircleTime;
            TimeOutFunc = _timeOutFunc;
            RunTimeFunc = _runTimeFunc;
            StartRunTimer = _startRunTimer;
            DurationTime = _durationTime;
            MaxTriggerTimes = (int)(DurationTime / CircleTime);
            Loop = _loop;
            TriggerTimes = 0;
            if (CircleTime == 0)
                Debug.LogWarning("CircleTime of MyTimer is 0");
        }
        public PreciseTimer(float _circleTime, float _durationTime, MyParameterDelegate _timeOutFunc, MyDelegate _runTimeFunc, bool _startRunTimer, bool _loop, object _obj)
        {
            CircleTime = _circleTime;
            CurTimer = CircleTime;
            TimeOutFuncWithObj = _timeOutFunc;
            RunTimeFunc = _runTimeFunc;
            StartRunTimer = _startRunTimer;
            DurationTime = _durationTime;
            MaxTriggerTimes = (int)(DurationTime / CircleTime);
            Loop = _loop;
            Obj = _obj;
            TriggerTimes = 0;
            if (CircleTime == 0)
            {
                Debug.LogWarning(string.Format("{0}'s CircleTime of MyTimer is 0", _timeOutFunc.Method.Name));
            }
        }
        public PreciseTimer(float _circleTime, float _durationTime, MyParameterDelegate _timeOutFunc, bool _startRunTimer, bool _loop, object _obj)
        {
            CircleTime = _circleTime;
            CurTimer = CircleTime;
            TimeOutFuncWithObj = _timeOutFunc;
            StartRunTimer = _startRunTimer;
            DurationTime = _durationTime;
            MaxTriggerTimes = (int)(DurationTime / CircleTime);
            Loop = _loop;
            Obj = _obj;
            TriggerTimes = 0;
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
        public void RunTimer(ref float _remainTime)
        {
            RunTimer(ref _remainTime, Time.deltaTime);
        }
        public void RunTimer(ref float _remainTime, float deltaTime)
        {
            if (CircleTime <= 0 || !StartRunTimer || deltaTime < 0 || float.IsNaN(deltaTime) || float.IsInfinity(deltaTime)) return;
            RunTimeFunc?.Invoke();
            CurTimer -= deltaTime;
            // Periodic damage must keep the same tick count on a slow frame.
            // The original configured total is retained; a finished timer stops.
            int limit = Mathf.Max(1, MaxTriggerTimes);
            while (StartRunTimer && CurTimer <= 0.000001f && TriggerTimes < limit)
            {
                TriggerTimes++;
                CurTimer += CircleTime;
                if (TriggerTimes < limit)
                    _remainTime = DurationTime - (TriggerTimes * CircleTime);
                else
                    _remainTime = 0;
                //Debug.Log("_remainTime=" + _remainTime);
                StartRunTimer = Loop && TriggerTimes < limit;
                if (TimeOutFunc != null)
                    TimeOutFunc();
                else
                    TimeOutFuncWithObj?.Invoke(Obj);
            }
        }
    }
}
