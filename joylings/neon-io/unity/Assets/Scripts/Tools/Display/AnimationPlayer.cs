using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class AnimationPlayer : MonoBehaviour
    {
        public Animator MyAni;

        public void Play(string _motion, float _normalizedTime)
        {
            MyAni.Play(_motion, 0, _normalizedTime);
            //if (Animator.StringToHash(string.Format("Base Layer.{0}", _motion)) != MyAni.GetCurrentAnimatorStateInfo(0).fullPathHash)
            //MyAni.Play(_motion, 0, _normalizedTime);

        }
        public void PlayInFixedTime(string _motion, float _fixedTime)
        {
            MyAni.PlayInFixedTime(_motion, 0, _fixedTime);
        }
        public void Play(string _motion, string _layer)
        {
            MyAni.Play(_motion, MyAni.GetLayerIndex(_layer), 0);
        }
        public void Play(string _motion, string _layer, float _normalizedTime)
        {
            MyAni.Play(_motion, MyAni.GetLayerIndex(_layer), _normalizedTime);
        }
        public void Play_NoPlayback(string _motion, float _normalizedTime)
        {
            if (Animator.StringToHash(string.Format("Base Layer.{0}", _motion)) != MyAni.GetCurrentAnimatorStateInfo(0).fullPathHash)
                MyAni.Play(_motion, 0, _normalizedTime);
        }
        public void Play_NoPlayback(string _motion, string _layer)
        {
            if (Animator.StringToHash(string.Format("{0}.{1}", _layer, _motion)) != MyAni.GetCurrentAnimatorStateInfo(0).fullPathHash)
                MyAni.Play(_motion, MyAni.GetLayerIndex(_layer), 0);
        }
        public void Play_NoPlayback(string _motion, string _layer, float _normalizedTime)
        {
            if (Animator.StringToHash(string.Format("{0}.{1}", _layer, _motion)) != MyAni.GetCurrentAnimatorStateInfo(MyAni.GetLayerIndex(_layer)).fullPathHash)
                MyAni.Play(_motion, MyAni.GetLayerIndex(_layer), _normalizedTime);
        }
        public void PlayFloat(string _motion, float _value)
        {
            MyAni.SetFloat(_motion, _value);
        }
        public void PlayTrigger(string _motion)
        {
            MyAni.Play(_motion, 0, 0);
        }
    }
}
