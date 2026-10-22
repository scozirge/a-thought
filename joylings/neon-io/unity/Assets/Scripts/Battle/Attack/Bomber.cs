using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Neon.Networking;
using Scoz.Func;
namespace Starbro.NeonIO
{
    public class Bomber : Attack, IPrepareSkill
    {
        [Tooltip("爆炸前的特效物件")]
        [SerializeField]
        ParticleSystem[] PrepareParticle = null;
        [Tooltip("炸彈子彈物件")]
        [SerializeField]
        Bomb AttackPrefab = null;
        //Collider2D Dector;
        [Tooltip("距離爆炸的準備時間(秒)")]
        [SerializeField]
        protected float PrepareTime;
        WaitToDo<float> WaitToBoom;
        [Tooltip("產生炸彈子彈後是否死亡")]
        [SerializeField]
        bool Suicide = true;



        bool IsPrepare = false;
        protected Force TargetForce;
        List<GameObject> PrepareObjs;//存入爆炸前的特效物件，爆炸後要移除

        protected override void Awake()
        {
            if (PrepareTime > 0)
            {
                WaitToBoom = new WaitToDo<float>(PrepareTime, Boom, false);
                PrepareObjs = new List<GameObject>();
            }
            base.Awake();
        }
        void Boom()
        {
            IsPrepare = false;
            if (WaitToBoom != null)
                WaitToBoom.RestartCountDown();
            if (PhotonNetwork.IsConnected)//只有在網路有連線時才使用RPC
            {
                if (Myself.photonView.IsMine)
                    Myself.photonView.RPC("SkillSpawnAttackPrefab", RpcTarget.All, MyFeaturePart,FeaturePartSerialNumber);
            }
            else
                SpawnAttackPrefab(0);
        }
        public override void Spell(PhotonMessageInfo _info)
        {
            if (IsPrepare)
                return;
            base.Spell(_info);
            if (WaitToBoom == null)
            {
                Boom();
            }
            else
            {
                WaitToBoom.StartRunTimer = true;
                if (PhotonNetwork.IsConnected)//只有在網路有連線時才使用RPC
                {
                    if (Myself.photonView.IsMine)
                        Myself.photonView.RPC("CastPrepareSkill", RpcTarget.All, MyFeaturePart, FeaturePartSerialNumber);
                }
                else
                    SpawnPreparePrefab();
            }
        }
        protected override void Update()
        {
            base.Update();
            if (WaitToBoom != null)
                WaitToBoom.RunTimer();
        }
        public void SpawnPreparePrefab()
        {
            IsPrepare = true;
            WaitToBoom.StartRunTimer = true;
            for (int i = 0; i < PrepareParticle.Length; i++)
            {
                if (PrepareParticle[i] == null)
                    continue;
                PrepareObjs.Add(EffectEmitter.EmitParticle(PrepareParticle[i], Vector3.zero, Vector3.zero, transform, Myself.MyForce).gameObject);
            }
        }
        public override void SpawnAttackPrefab(float _remainLagTime)
        {
            RemovePrepareObjs();
            base.SpawnAttackPrefab(_remainLagTime);
            //自身子彈
            if (AttackPrefab)
            {
                GameObject go = Instantiate(AttackPrefab.gameObject, Vector3.zero, Quaternion.identity) as GameObject;
                //GameObject go = PhotonNetwork.InstantiateSceneObject(AttackPrefab.name, Vector3.zero, Quaternion.identity, 0) as GameObject;
                Ammo ammo = go.GetComponent<Ammo>();
                go.transform.SetParent(AmmoParent);
                go.transform.position = transform.position;
                if (SpawnAtTargetPos)
                    go.transform.position = GetTargetPos();
                ammo.Init(AmmoData);
                if (ConnectToAmmo)
                {
                    if (SubordinateAmmos == null)
                        SubordinateAmmos = new List<Ammo>();
                    SubordinateAmmos.Add(ammo);
                }
            }
            if (Suicide)
            {
                if (Myself.MyForce != Force.Player)
                    SelfDestroy();
                else
                {
                    this.enabled = false;
                }
            }
        }
        void RemovePrepareObjs()
        {
            if (PrepareObjs == null)
                return;
            for (int i = 0; i < PrepareObjs.Count; i++)
            {
                if (PrepareObjs[i])
                    Destroy(PrepareObjs[i]);
            }
            PrepareObjs.Clear();
        }

    }
}
