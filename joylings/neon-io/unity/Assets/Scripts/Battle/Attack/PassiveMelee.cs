using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;

namespace Starbro.NeonIO {
	public class PassiveMelee : PassiveSkill
	{
        #region Public Field
        [Tooltip("攻擊方向")]
        [SerializeField]
        protected DirectionPatetern Patetern;
        [Tooltip("起始發射角度")]
        [SerializeField]
        protected float StartAngle;
        [Tooltip("(Pattern為Default時才有效)若亂數角度為true")]
        [LabelOverride("亂數角度(連線遊戲禁用)")]
        [SerializeField]
        protected bool RandomAngle;
        [Tooltip("肉搏子彈物件")]
        [SerializeField]
        MeleeAmmo AttackPrefab = null;
        [Tooltip("子彈產生半徑(距離攻擊者多少距離)")]
        [SerializeField]
        protected float AttackRadius = 0;
        protected Vector3 AttackDir = Vector3.zero;
        #endregion

        #region Private Field
        #endregion

        #region MonoBehaviour Func
        #endregion

        #region Public Func
        /// <summary>
        /// 一般有連線時，技能施放都是呼叫RPC CastSkill來同步，但像Bomb這種有準備特效的技能，是呼叫RPC SkillSpawnAttackPrefab來同步
        /// </summary>
        [PunRPC]
        public override void SpawnAttackPrefab(float _remainLagTime)
        {
            if (TargetRole == null && Patetern == DirectionPatetern.TowardTarget)
                return;
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
            //GameObject ammoGO = PhotonNetwork.InstantiateSceneObject(AttackPrefab.name, Vector3.zero, Quaternion.identity, 0) as GameObject;
            GameObject ammoGO = Instantiate(AttackPrefab.gameObject, Vector3.zero, Quaternion.identity) as GameObject;
            Ammo ammo = ammoGO.GetComponent<Ammo>();
            ammo.transform.SetParent(AmmoParent);
            ammo.transform.position = transform.position + AttackRadius * AttackDir;
            ammo.Init(AmmoData);
            if (ConnectToAmmo)
            {
                if (SubordinateAmmos == null)
                    SubordinateAmmos = new List<Ammo>();
                SubordinateAmmos.Add(ammo);
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
            SpawnAttackPrefab(remainLagTime);
        }
        #endregion

        #region Private Func
        protected void SetAmmoData()
        {
            //Set AmmoData
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
                    if (Myself.Movetorward.x>=0)
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
                    AttackDir = (GetTargetPos()- Myself.transform.position);
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
        #endregion
    }
}
