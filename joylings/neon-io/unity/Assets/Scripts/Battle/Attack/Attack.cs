using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public class Attack : Skill
    {
        [LabelOverride("偵測距離)")]
        [Tooltip("偵測有目標在半徑範圍內才會攻擊，若填0代不偵測CD到自動施放)")]
        [SerializeField]
        protected int DetecteRadius = 800;
        [Tooltip("是否只會攻擊一次")]
        [SerializeField]
        protected bool AttackOnce;
        [LabelOverride("產生在目標位置")]
        [SerializeField]
        protected bool SpawnAtTargetPos = false;
        [Tooltip("每次攻擊的間隔時間")]
        [SerializeField]
        protected float Interval;
        [LabelOverride("第一次攻擊不等待")]
        [SerializeField]
        protected bool FirstAttackNoWait;
        [Tooltip("攻擊方向")]
        [SerializeField]
        protected DirectionPatetern Patetern;
        [Tooltip("(Pattern為Default時才有效)若亂數角度為true")]
        [LabelOverride("亂數角度(連線遊戲禁用)")]
        [SerializeField]
        protected bool RandomAngle;
        [Tooltip("起始發射角度")]
        [SerializeField]
        protected float StartAngle;

        protected float Timer;
        protected Vector3 AttackDir = Vector3.zero;
        float CurInterval;
        bool InRange;


        void OnDrawGizmos()
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(transform.position, DetecteRadius);
            /*
            if (Selection.Contains(gameObject))
            {

            }
            */
        }
        protected override void Awake()
        {
            base.Awake();
            InRange = false;
            CurInterval = Interval;
            if (SpawnedInSelf)
                AmmoParent = transform;
            if (FirstAttackNoWait)
                Timer = 0;
            else
                Timer = Interval;
        }
        public override float GetCDRatio()
        {
            if ((Timer / CurInterval) < 1)
                return 1 - (Timer / CurInterval);
            else
                return 1;
        }
        protected override void Update()
        {
            base.Update();
        }
        public override void SpawnAttackPrefab(float _remainLagTime)
        {
            base.SpawnAttackPrefab(_remainLagTime);
            SetAmmoData();

            if (Myself.MyForce == Force.Player)
                AmmoData.Add("TargetRoleTag", string.Format("{0},{1}", Force.Opponent, Force.Neutral));
            else
            {
                AmmoData.Add("TargetRoleTag", string.Format("{0},{1},{2}", Force.Player, Force.Opponent, Force.Neutral));
            }

            AmmoData.Add("Direction", AttackDir);
            AmmoData.Add("Target", TargetRole);
        }

        protected override void TimerFunc()
        {
            if (IsWaitingForSpell)
                return;
            if (BehaviorSkill)
                return;
            if (Myself.BuffersExist(RoleBuffer.Stun))
                return;
            if (!CheckIfHasTarget())
                return;
            if (AttackOnce && SpellTimes > 0)
                return;
            //目標是否在距離內判斷
            if (DetecteRadius <= 0)
                InRange = true;
            else
            {
                int targetRadius = 0;
                Vector3 targetPos = GetTargetPos();
                if (TargetRole!=null && targetPos==TargetRole.transform.position)
                {
                    targetRadius = TargetRole.ColliderRadius;
                }

                if (Vector2.Distance(targetPos, transform.position) <= DetecteRadius+ targetRadius)
                    InRange = true;
                else
                    InRange = false;
            }
            base.TimerFunc();
            if (Timer > 0 && OnCD)
            {
                Timer -= Time.deltaTime;
            }
            else
            {
                OnCD = false;
                Timer = CurInterval;
                if (InRange)
                {
                    if (!PhotonNetwork.IsConnected)//只有在網路有連線時才使用RPC
                    {
                        Spell(new PhotonMessageInfo());
                    }
                    else if (Myself.photonView.IsMine)
                    {
                        Myself.photonView.RPC("CastSkill", RpcTarget.All, MyFeaturePart, FeaturePartSerialNumber);
                    }

                }
            }
        }
        public override void Spell(PhotonMessageInfo _info)
        {
            base.Spell(_info);
        }
        protected override void EndWaitToSpell(object _remainLagTime)
        {
            base.EndWaitToSpell(_remainLagTime);
            InRange = false;
            SpellTimes++;
        }
        public override void Freeze(bool _freeze)
        {
            base.Freeze(_freeze);
            if (_freeze)
            {
                CurInterval = Interval * (1 + GameSettingData.FreezeMove);
            }
            else
            {
                CurInterval = Interval;
            }
            if (Timer > CurInterval)
                Timer = CurInterval;
        }
        protected virtual void SetAmmoData()
        {
            //Set AmmoData
            float origAngle;
            int reverse = 1;
            float angle = 0;

            switch (Patetern)
            {
                case DirectionPatetern.Default:

                    if (RandomAngle)
                        angle = Random.Range(0, 360) * Mathf.Deg2Rad;
                    else
                        angle = StartAngle * Mathf.Deg2Rad;
                    AttackDir = new Vector3(Mathf.Cos(angle), Mathf.Sin(angle), 0).normalized;
                    //AmmoRotation = (Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + (StartAngle + CurSpawnAmmoNum * AngleInterval)* Mathf.Deg2Rad;
                    break;
                case DirectionPatetern.LeftRight:
                    if (Myself.Movetorward.x >= 0)
                    {
                        reverse = 1;
                        AttackDir = Vector2.right;
                    }
                    else
                    {
                        reverse = -1;
                        AttackDir = Vector2.left;
                    }
                    origAngle = ((Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + StartAngle * reverse) * Mathf.Deg2Rad;
                    AttackDir = new Vector3(Mathf.Cos(origAngle), Mathf.Sin(origAngle), 0).normalized;
                    //AmmoRotation = (Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + (StartAngle + CurSpawnAmmoNum * AngleInterval * reverse) * Mathf.Deg2Rad;
                    break;
                case DirectionPatetern.TopDown:
                    if (Myself.Movetorward.y >= 0)
                    {
                        reverse = 1;
                        AttackDir = Vector2.up;
                    }
                    else
                    {
                        reverse = -1;
                        AttackDir = Vector2.down;
                    }
                    origAngle = ((Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + StartAngle * reverse) * Mathf.Deg2Rad;
                    AttackDir = new Vector3(Mathf.Cos(origAngle), Mathf.Sin(origAngle), 0).normalized;
                    //AmmoRotation = (Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + (StartAngle + CurSpawnAmmoNum * AngleInterval * reverse) * Mathf.Deg2Rad;
                    break;
                case DirectionPatetern.TowardTarget:

                    AttackDir = (GetTargetPos() - Myself.transform.position);
                    origAngle = ((Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + StartAngle) * Mathf.Deg2Rad;
                    AttackDir = new Vector3(Mathf.Cos(origAngle), Mathf.Sin(origAngle), 0).normalized;
                    //AmmoRotation = (Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + (StartAngle + CurSpawnAmmoNum * AngleInterval) * Mathf.Deg2Rad;
                    break;
                case DirectionPatetern.FaceDirection:
                    AttackDir = Myself.Movetorward;
                    origAngle = ((Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + StartAngle) * Mathf.Deg2Rad;
                    AttackDir = new Vector3(Mathf.Cos(origAngle), Mathf.Sin(origAngle), 0).normalized;

                    break;
            }
        }
    }
}
