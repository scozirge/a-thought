using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Neon.Networking;
using Scoz.Func;
namespace Starbro.NeonIO
{
    public class Shoot : Attack
    {
        [Tooltip("飛射子彈物件")]
        [SerializeField]
        ShootAmmo AttackPrefab = null;
        [Tooltip("每次攻擊發射的子彈數")]
        [SerializeField]
        protected int AmmoNum;
        [Tooltip("若子彈數不只一發，每發間隔的時間")]
        [SerializeField]
        protected float AmmoInterval;
        [Tooltip("若子彈數不只一發，每發間隔的角度")]
        [SerializeField]
        protected float AngleInterval;
        [Tooltip("是否會被牆阻擋")]
        [SerializeField]
        protected bool TriggerWall = true;

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
        public override void SpawnAttackPrefab(float _remainLagTime)
        {
            base.SpawnAttackPrefab(_remainLagTime);
            GameObject ammoGO = null;
            ammoGO = Instantiate(AttackPrefab.gameObject, Vector3.zero, Quaternion.identity) as GameObject;
            //ammoGO = PhotonNetwork.InstantiateSceneObject(AttackPrefab.name, Vector3.zero, Quaternion.identity, 0) as GameObject;
            Ammo ammo = ammoGO.GetComponent<Ammo>();
            ammo.transform.SetParent(AmmoParent);
            ammo.transform.position = transform.position;
            if (SpawnAtTargetPos)
                ammo.transform.position = GetTargetPos();
            AmmoData.Add("TriggerWall", TriggerWall);
            ammo.Init(AmmoData);
            CurSpawnAmmoNum++;
            if (AmmoInterval > 0)
            {
                if (CurSpawnAmmoNum < AmmoNum)
                {
                    WaitingToSpawnNextAmmo = true;
                }
            }
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
        protected override void SetAmmoData()
        {
            StartAngle = OriginalStartAngle + (CurSpawnAmmoNum * AngleInterval);
            base.SetAmmoData();
        }
    }
}
