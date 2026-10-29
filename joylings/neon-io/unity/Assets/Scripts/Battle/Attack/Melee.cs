using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public partial class Melee : Attack
    {
        [Tooltip("肉搏子彈物件")]
        [SerializeField]
        MeleeAmmo AttackPrefab = null;
        [Tooltip("子彈產生半徑(距離攻擊者多少距離)")]
        [SerializeField]
        protected float AttackRadius = 0;
        /// <summary>
        /// 一般有連線時，技能施放都是呼叫RPC CastSkill來同步，但像Bomb這種有準備特效的技能，是呼叫RPC SkillSpawnAttackPrefab來同步
        /// </summary>
        public override void SpawnAttackPrefab(float _remainLagTime)
        {
            base.SpawnAttackPrefab(_remainLagTime);
            //GameObject ammoGO = PhotonNetwork.InstantiateSceneObject(AttackPrefab.name, Vector3.zero, Quaternion.identity, 0) as GameObject;
            GameObject ammoGO = Instantiate(AttackPrefab.gameObject, Vector3.zero, Quaternion.identity) as GameObject;
            Ammo ammo = ammoGO.GetComponent<Ammo>();
            ammo.transform.SetParent(AmmoParent);
            ammo.transform.position = transform.position + AttackRadius * AttackDir;
            if (SpawnAtTargetPos)
                ammo.transform.position = BotAttackPosition + AttackRadius * AttackDir;

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
    }
}
