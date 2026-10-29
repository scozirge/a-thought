using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public partial class PassiveBomber : PassiveSkill, IPrepareSkill
    {
        [LabelOverride("產生在目標位置")]
        [SerializeField]
        protected bool SpawnAtTargetPos = false;
        [LabelOverride("炸彈子彈物件")]
        [SerializeField]
        Bomb AttackPrefab = null;
        [Tooltip("爆炸前的特效物件")]
        [SerializeField]
        ParticleSystem PrepareParticle = null;
        //Collider2D Dector;
        [Tooltip("距離爆炸的準備時間(秒)")]
        [SerializeField]
        protected float PrepareTime;
        [Tooltip("產生炸彈子彈後是否死亡")]
        [SerializeField]
        bool Suicide = true;

        List<GameObject> PrepareObjs;//存入爆炸前的特效物件，爆炸後要移除


        protected override void Awake()
        {
            base.Awake();
            if (PrepareTime != 0)
            {
                PrepareTimer = new MyTimer(PrepareTime, Boom, false, false);
                PrepareObjs = new List<GameObject>();
            }

        }
        protected override void IrrationalSettingWarn()
        {
            base.IrrationalSettingWarn();
            if (Suicide && SpawnedInSelf)
                Debug.LogWarning("Suicide 和 SpawnedInSelf都設定為true會因為腳色自爆時連同子彈一併被移除(因為子彈在腳色身上)");
        }
        void Boom()
        {
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
            base.Spell(_info);
            if (PrepareTimer == null)
            {
                Boom();
            }
            else
            {
                PrepareTimer.StartRunTimer = true;
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
        }
        /// <summary>
        /// 一般有連線時，技能施放都是呼叫RPC CastSkill來同步，但像Bomb這種有準備特效的技能，是呼叫RPC SkillSpawnAttackPrefab來同步
        /// </summary>
        [PunRPC]
        public override void SpawnAttackPrefab(float _remainLagTime)
        {
            base.SpawnAttackPrefab(_remainLagTime);
            RemovePrepareObjs();
            if (Myself.MyForce == Force.Player)
                AmmoData.Add("TargetRoleTag", string.Format("{0},{1}", Force.Opponent, Force.Neutral));
            else
            {
                AmmoData.Add("TargetRoleTag", string.Format("{0},{1},{2}", Force.Player, Force.Opponent, Force.Neutral));
            }
            AmmoData.Add("Target", BotAttackTarget);
            //自身子彈
            if (AttackPrefab)
            {
                GameObject go = Instantiate(AttackPrefab.gameObject, Vector3.zero, Quaternion.identity) as GameObject;
                //GameObject go = PhotonNetwork.InstantiateSceneObject(AttackPrefab.name, Vector3.zero, Quaternion.identity, 0) as GameObject;
                Ammo ammo = go.GetComponent<Ammo>();
                go.transform.SetParent(AmmoParent);
                go.transform.position = transform.position;
                if (SpawnAtTargetPos)
                    go.transform.position = BotAttackPosition;
                ammo.Init(AmmoData);
                if (ConnectToAmmo)
                {
                    if (SubordinateAmmos == null)
                        SubordinateAmmos = new List<Ammo>();
                    SubordinateAmmos.Add(ammo);
                }
            }
            if (Suicide)
                Myself.ReceiveDmg(999999);
        }
        [PunRPC]
        public void SpawnPreparePrefab()
        {
            if (PrepareParticle)
                PrepareObjs.Add(EffectEmitter.EmitParticle(PrepareParticle, Vector3.zero, Vector3.zero, transform, Myself.MyForce).gameObject);
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
