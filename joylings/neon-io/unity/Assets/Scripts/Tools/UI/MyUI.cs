using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public interface IMyUI
    {
        void Init();

        void SetActive(bool _bool);

        void OnEnable();

        void RefreshText();
    }
}
