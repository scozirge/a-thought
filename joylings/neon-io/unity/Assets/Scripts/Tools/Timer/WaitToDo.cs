using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class WaitToDo<T>
    {
        public delegate void MyDelegate();
        public delegate void MyTDelegate(T _parameter);
        MyDelegate TimeOutDoAction;
        MyTDelegate TimeOutDoActionWithT;
        public float CurTimer;
        public float MaxTime { get; private set; }
        public bool StartRunTimer;
        T Parameter;

        public WaitToDo(float _maxTime, MyDelegate _timeOutFunc, bool _startRunTimer)
        {
            TimeOutDoAction = _timeOutFunc;
            MaxTime = _maxTime;
            CurTimer = MaxTime;
            StartRunTimer = _startRunTimer;
            if (MaxTime == 0)
            {
                Debug.LogWarning(string.Format("{0}'s MaxTime of WaitToDo is 0", _timeOutFunc.Method.Name));
            }
        }
        public WaitToDo(float _maxTime, MyTDelegate _timeOutFunc, bool _startRunTimer, T _parameter)
        {
            TimeOutDoActionWithT = _timeOutFunc;
            Parameter = _parameter;
            MaxTime = _maxTime;
            CurTimer = MaxTime;
            StartRunTimer = _startRunTimer;
            if (MaxTime == 0)
            {
                Debug.LogWarning(string.Format("{0}'s MaxTime of WaitToDo is 0", _timeOutFunc.Method.Name));
            }
        }
        public void RestartCountDown()
        {
            CurTimer = MaxTime;
        }
        public void ResetMaxTime(float _maxTime)
        {
            MaxTime = _maxTime;
        }
        public void RunTimer()
        {
            if (MaxTime == 0)
                return;
            if (!StartRunTimer)
                return;
            if (CurTimer > 0)
                CurTimer -= Time.deltaTime;
            else
            {
                DoAction();
            }
        }
        public void DoAction()
        {
            CurTimer = MaxTime;
            StartRunTimer = false;
            if (TimeOutDoActionWithT != null)
                TimeOutDoActionWithT(Parameter);
            if (TimeOutDoAction != null)
                TimeOutDoAction();
        }
    }
}
