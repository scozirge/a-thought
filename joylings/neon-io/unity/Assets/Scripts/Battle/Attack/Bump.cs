using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public class Bump : MonoBehaviourPunCallbacks
    {
        [LabelOverride("攻擊者")]
        [SerializeField]
        Role Attacker = null;
        [LabelOverride("擊退力道")]
        [SerializeField]
        float KnockForce = 0;
        [Tooltip("暈眩(秒數)、燃燒(秒數)、冰凍(秒數)、傷害Buff(秒數,增/減值)、無敵(秒數)、格檔(時間,秒數)")]
        [SerializeField]
        protected List<BufferData> Buffers = null;
        [LabelOverride("傷害間隔")]
        [Tooltip("碰撞間隔，最低為0.1，代表每0.1秒傷害一次")]
        [SerializeField]
        protected float DamageInterval = 0.3f;

        protected List<MyTimer> ReadyToDamageTimers;
        protected Dictionary<string, bool> ReadyToDamageTargets;
        protected Dictionary<string, MyTimer> ReadyToDamageTimerDic;
        void Start()
        {
            ReadyToDamageTargets = new Dictionary<string, bool>();
            ReadyToDamageTimers = new List<MyTimer>();
            ReadyToDamageTimerDic = new Dictionary<string, MyTimer>();
            if (DamageInterval < 0.1f)
                DamageInterval = 0.1f;
        }
        void Update()
        {
            for (int i = 0; i < ReadyToDamageTimers.Count; i++)
            {
                ReadyToDamageTimers[i].RunTimer();
            }
        }
        public void SetRange()
        {
            //RangeCol.radius = RangeCol.radius * (1 + Attacker.MyEnchant[EnchantProperty.AttackRange]);
        }
        void OnTriggerStay2D(Collider2D collider)
        {
            if (Attacker == null || !Attacker.IsInitialized || !Attacker.IsAlive || collider == null) return;
            if (PhotonNetwork.IsConnected && !Attacker.photonView.IsMine) return;
            if (collider.gameObject == Attacker.gameObject) return;
            if (!collider.CompareTag(Force.Player.ToString()) && !collider.CompareTag(Force.Opponent.ToString()) && !collider.CompareTag(Force.Neutral.ToString())) return;
            if (Attacker.BuffersExist(RoleBuffer.Ghost)) return;
            Role victim = collider.GetComponent<Role>();
            if (victim == null || !victim.IsAlive || victim.BuffersExist(RoleBuffer.Ghost) || !CheckReadyToDamageTarget(collider)) return;
            Vector2 force = (victim.transform.position - transform.position).normalized * KnockForce;
            Vector2 impact = Vector2.Lerp(victim.transform.position, transform.position, 0.5f);
            if (PhotonNetwork.IsConnected)
            {
                victim.SendNetworkHit(Attacker, 0, force, "BumpHit", impact, Buffers, 0);
                Attacker.BeKnock(-force);
            }
            else
            {
                victim.CallToEmitParticle("BumpHit", impact);
                victim.BeAttack(0, force);
                TriggerHitCondition(victim);
                Attacker.Counterforce((victim.transform.position - transform.position).normalized);
                Attacker.ExecuteSkillTrigger(PSkillTriggerCondition.AllAttack);
                Attacker.ExecuteSkillTrigger(PSkillTriggerCondition.MeleeAttack);
            }
        }

        protected bool CheckReadyToDamageTarget(Collider2D _target)
        {
            string id = _target.GetInstanceID().ToString();
            if (ReadyToDamageTargets.ContainsKey(id))
            {
                if (ReadyToDamageTargets[id])
                {
                    ReadyToDamageTargets[id] = false;
                    ReadyToDamageTimerDic[id].StartRunTimer = true;
                    return true;
                }
                else
                    return false;
            }
            else
            {
                if (DamageInterval > 0)
                {
                    MyTimer tiemr = new MyTimer(DamageInterval, ReadyToDamageTimeOutFunc, true, false, id);
                    ReadyToDamageTimers.Add(tiemr);
                    ReadyToDamageTargets.Add(id, false);
                    ReadyToDamageTimerDic.Add(id, tiemr);
                }
                return true;
            }
        }
        protected void ReadyToDamageTimeOutFunc(object _key)
        {
            string key = (string)_key;
            if (ReadyToDamageTargets.ContainsKey(key))
            {
                ReadyToDamageTargets[key] = true;
            }
        }
        public void AddStunBuffers(float _time)
        {
            BufferData stunBuffer = new BufferData(RoleBuffer.Stun, _time, 0, 0);
            if (Buffers == null) Buffers = new List<BufferData>();
            Buffers.Add(stunBuffer);
        }
        public virtual void TriggerHitCondition(Role _role)
        {
            if (Buffers == null || Buffers.Count <= 0)
                return;
            for (int i = 0; i < Buffers.Count; i++)
            {
                _role.AddBuffer(Buffers[i]);
            }
            /*
            if (PhotonNetwork.IsConnected)//只有在網路有連線時才使用RPC
            {
                if (Buffers.Count == 1)
                {
                    _role.photonView.RPC("AddBuffer", RpcTarget.All, Buffers[0]);
                }
                else
                {
                    int[] typeArray = new int[Buffers.Count];
                    float[] timeArray = new float[Buffers.Count];
                    float[] valueArray = new float[Buffers.Count];
                    float[] value2Array = new float[Buffers.Count];
                    for (int i = 0; i < Buffers.Count; i++)
                    {
                        typeArray[i] = (int)Buffers[i].Type;
                        timeArray[i] = Buffers[i].Time;
                        valueArray[i] = Buffers[i].Value;
                        value2Array[i] = Buffers[i].Value2;
                    }
                    _role.photonView.RPC("AddBuffer", RpcTarget.All, typeArray, timeArray, valueArray, value2Array);
                }
            }
            else
            {
                for (int i = 0; i < Buffers.Count; i++)
                {
                    _role.AddBuffer(Buffers[i]);
                }
            }   
            */
        }
    }

}
