using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public partial class PassiveShoot : PassiveSkill
    {
        [LabelOverride("產生在目標位置")]
        [SerializeField]
        protected bool SpawnAtTargetPos = false;
        [Tooltip("飛射子彈物件")]
        [SerializeField]
        ShootAmmo AttackPrefab = null;
        [Tooltip("每次攻擊發射的子彈數")]
        [SerializeField]
        protected int AmmoNum;
        [Tooltip("若子彈數不只一發，每發間隔的時間")]
        [SerializeField]
        protected float AmmoInterval;
        [Tooltip("起始發射角度")]
        [SerializeField]
        protected float StartAngle;
        [Tooltip("若子彈數不只一發，每發間隔的角度")]
        [SerializeField]
        protected float AngleInterval;
        [Tooltip("是否會被牆阻擋")]
        [SerializeField]
        protected bool TriggerWall = true;
        [Tooltip("攻擊方向")]
        [SerializeField]
        protected DirectionPatetern Patetern;


        protected Vector3 AttackDir = Vector3.zero;

        protected float AmmoIntervalTimer;
        protected bool WaitingToSpawnNextAmmo;
        protected float OriginalStartAngle = 0;

        protected override void Awake()
        {
            base.Awake();
            OriginalStartAngle = StartAngle;
        }
        protected override void Update()
        {
            base.Update();
            AttackExecuteFunc();
        }
        protected void AttackExecuteFunc()
        {
            if (!WaitingToSpawnNextAmmo)
                return;
            if (AmmoIntervalTimer > 0)
            {
                AmmoIntervalTimer -= Time.deltaTime;
            }
            else
            {
                WaitingToSpawnNextAmmo = false;
                SpawnAttackPrefab(0);
                AmmoIntervalTimer = AmmoInterval;
            }
        }
        public override void Spell(PhotonMessageInfo _info)
        {
            base.Spell(_info);
        }
        protected override void EndWaitToSpell(object _remainLagTime)
        {
            base.EndWaitToSpell(_remainLagTime);
            float remainLagTime = (float)_remainLagTime;
            AmmoIntervalTimer = AmmoInterval;
            CurSpawnAmmoNum = 0;
            if (AmmoInterval > 0)//如果子彈間隔時間大於0用計時器去各別創造子彈
            {
                SpawnAttackPrefab(remainLagTime);
            }
            else//如果子彈間隔時間小於等於0就不跑計時器，直接用回圈創造子彈(避免子彈不會同時產生的問題)
            {
                for (int i = 0; i < AmmoNum; i++)
                {
                    SpawnAttackPrefab(remainLagTime);
                }
            }
        }
        public override void SpawnAttackPrefab(float _remainLagTime)
        {
            base.SpawnAttackPrefab(_remainLagTime);
            SetAmmoData();
            GameObject ammoGO = null;
            ammoGO = Instantiate(AttackPrefab.gameObject, Vector3.zero, Quaternion.identity) as GameObject;
            //ammoGO = PhotonNetwork.InstantiateSceneObject(AttackPrefab.name, Vector3.zero, Quaternion.identity, 0) as GameObject;
            Ammo ammo = ammoGO.GetComponent<Ammo>();
            ammo.transform.SetParent(AmmoParent);
            ammo.transform.position = transform.position;
            if (SpawnAtTargetPos)
                ammo.transform.position = BotAttackPosition;
            if (Myself.MyForce == Force.Player)
                AmmoData.Add("TargetRoleTag", string.Format("{0},{1}", Force.Opponent, Force.Neutral));
            else
            {
                AmmoData.Add("TargetRoleTag", string.Format("{0},{1},{2}", Force.Player, Force.Opponent, Force.Neutral));
            }
            AmmoData.Add("Direction", AttackDir);
            AmmoData.Add("Target", BotAttackTarget);
            AmmoData.Add("TriggerWall", TriggerWall);
            ammo.Init(AmmoData);
            if (ConnectToAmmo)
            {
                if (SubordinateAmmos == null)
                    SubordinateAmmos = new List<Ammo>();
                SubordinateAmmos.Add(ammo);
            }
            CurSpawnAmmoNum++;
            if (AmmoInterval > 0)
            {
                if (CurSpawnAmmoNum < AmmoNum)
                {
                    WaitingToSpawnNextAmmo = true;
                }
            }
        }
        protected void SetAmmoData()
        {
            //Set AmmoData
            StartAngle = OriginalStartAngle + (CurSpawnAmmoNum * AngleInterval);
            float origAngle;
            int reverse = 1;
            float angle = 0;

            switch (Patetern)
            {
                case DirectionPatetern.Default:
                    angle = StartAngle * Mathf.Deg2Rad;
                    AttackDir = new Vector3(Mathf.Cos(angle), Mathf.Sin(angle), 0).normalized;
                    //AmmoRotation = (Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + (StartAngle + CurSpawnAmmoNum * AngleInterval)* Mathf.Deg2Rad;
                    break;
                case DirectionPatetern.LeftRight:
                    if (BotFacing.x >= 0)
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
                    if (BotFacing.y >= 0)
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
                    AttackDir = (BotAttackPosition - Myself.transform.position);
                    origAngle = ((Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + StartAngle) * Mathf.Deg2Rad;
                    AttackDir = new Vector3(Mathf.Cos(origAngle), Mathf.Sin(origAngle), 0).normalized;
                    //AmmoRotation = (Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + (StartAngle + CurSpawnAmmoNum * AngleInterval) * Mathf.Deg2Rad;
                    break;
                case DirectionPatetern.FaceDirection:
                    AttackDir = BotFacing;
                    origAngle = ((Mathf.Atan2(AttackDir.y, AttackDir.x) * Mathf.Rad2Deg) + StartAngle) * Mathf.Deg2Rad;
                    AttackDir = new Vector3(Mathf.Cos(origAngle), Mathf.Sin(origAngle), 0).normalized;

                    break;
            }
        }
    }
}