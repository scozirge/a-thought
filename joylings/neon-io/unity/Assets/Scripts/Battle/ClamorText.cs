using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Scoz.Func;
namespace Starbro.NeonIO
{
    public class ClamorText : MonoBehaviour
    {
        [SerializeField]
        Text MyClamorText = null;
        [SerializeField]
        Rigidbody2D MyRigid = null;
        [SerializeField]
        AnimationPlayer MyAniPlayer = null;

        MyTimer DurationTimer;

        public enum ClamorType
        {
            Kill,
            Die,
            LevelUp,
            Hit,
            BeHit,
            Debut,
            Spell,
        }
        public void Init(string _str, ClamorType _type, Role _caller)
        {
            MyClamorText.text = _str;            
            DurationTimer = new MyTimer(GameSettingData.ClamorTextDuration, SelfDestry, true, false);
            SetAni(_type);
            switch (_type)
            {
                case ClamorType.Kill:
                    MyRigid.bodyType = RigidbodyType2D.Kinematic;
                    transform.SetParent(_caller.RoleCanvas.transform);
                    transform.localPosition = new Vector2(0, 150);
                    break;
                case ClamorType.Die:
                    transform.SetParent(BattleManager.BM.MyPlayerRole.BattleObjsUICanvas.transform);
                    transform.position = _caller.transform.position;
                    break;
                case ClamorType.LevelUp:
                    MyRigid.bodyType = RigidbodyType2D.Kinematic;
                    transform.SetParent(_caller.RoleCanvas.transform);
                    transform.localPosition = new Vector2(0, 150);
                    break;
                case ClamorType.Hit:
                    MyRigid.bodyType = RigidbodyType2D.Kinematic;
                    transform.SetParent(_caller.RoleCanvas.transform);
                    transform.localPosition = new Vector2(0, 150);
                    break;
                case ClamorType.BeHit:
                    transform.SetParent(BattleManager.BM.MyPlayerRole.BattleObjsUICanvas.transform);
                    transform.position = _caller.transform.position;
                    float angle = Random.Range(0, 360) * Mathf.Deg2Rad;
                    Vector3 dir = new Vector3(Mathf.Cos(angle), Mathf.Sin(angle), 0).normalized;
                    MyRigid.linearVelocity = dir * 100;
                    break;
                case ClamorType.Debut:
                    MyRigid.bodyType = RigidbodyType2D.Kinematic;
                    transform.SetParent(_caller.RoleCanvas.transform);
                    transform.localPosition = new Vector2(0, 150);
                    break;
                case ClamorType.Spell:
                    MyRigid.bodyType = RigidbodyType2D.Kinematic;
                    transform.SetParent(_caller.RoleCanvas.transform);
                    transform.localPosition = new Vector2(0, 150);
                    break;
            }
        }
        void Update()
        {
            if (DurationTimer != null)
                DurationTimer.RunTimer();
        }
        void SetAni(ClamorType _type)
        {
            MyAniPlayer.Play(_type.ToString(), 0);
        }
        public void SelfDestry()
        {
            Destroy(gameObject);
        }
    }
}
