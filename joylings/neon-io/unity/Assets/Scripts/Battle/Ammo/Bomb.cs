using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Neon.Networking;
using Scoz.Func;
namespace Starbro.NeonIO
{
    public class Bomb : Ammo
    {
        [LabelOverride("幾秒後才爆炸")]
        [SerializeField]
        protected float WaitToBoomTime = 0;
        WaitToDo<float> WaitToLaunch;
        [LabelOverride("碰觸是否提前爆炸")]
        [SerializeField]
        bool TriggerBoom = false;
        [Tooltip("爆炸時特效物件")]
        [SerializeField]
        ParticleSystem[] LaunchGlobalParticle = null;
        [LabelOverride("爆炸時時音效")]
        [SerializeField]
        protected AudioClip BoomSound = null;


        public override void Init(Dictionary<string, object> _dic)
        {
            base.Init(_dic);
            float trueWaitToBoomTime = WaitToBoomTime - RemainLag;
            if (trueWaitToBoomTime > 0)
            {
                WaitToLaunch = new WaitToDo<float>(trueWaitToBoomTime, Launch, true);
            }
            else
                Launch();
        }
        public override void Launch()
        {
            if(!IsLaunch)
            {
                SpawnLaunchParticle();
                if (BoomSound)
                    AudioPlayer.PlaySound(BoomSound);
            }
            base.Launch();
        }
        protected override void Update()
        {
            base.Update();
            if (WaitToLaunch != null)
                WaitToLaunch.RunTimer();
        }
        protected override void TriggerTarget(Role _role, Vector2 _pos)
        {
            if (!CheckReadyToTrigger())
                return;
            if (_role.BuffersExist(RoleBuffer.Ghost))
                return;
            if (!CheckReadyToTriggerTarget(_role.gameObject))
                return;
            Vector2 force = (_role.transform.position - transform.position).normalized * KnockIntensity;
            int damage = Value;
            if (PhotonNetwork.IsConnected)
            {
                if (AttackerPhotonViewIsMine)
                {
                    SendNetworkHit(_role, damage, force, _pos, 2);
                }
            }
            else
            {
                _role.RecordOfflineHit(Attacker, damage, Buffers);
                _role.BeAttack(damage, force);
            }
            if (Attacker && VampireProportion > 0 && damage > 0 && !PhotonNetwork.IsConnected)
                Attacker.HealHP(Mathf.RoundToInt((damage * VampireProportion)));
            base.TriggerTarget(_role, _pos);
        }
        protected void SpawnLaunchParticle()
        {
            //產生特效
            for (int i = 0; i < LaunchGlobalParticle.Length; i++)
            {
                if (LaunchGlobalParticle[i] == null)
                    continue;
                EffectEmitter.EmitParticle(LaunchGlobalParticle[i], transform.position, Vector3.zero, ParticleParent, AttackerRoleTag);
            }
        }
        protected override void OnTriggerEnter2D(Collider2D _col)
        {
            if (Attacker && _col.gameObject == Attacker.gameObject)//不可以打自己
                return;
            if (TargetRoleTags.Contains(_col.tag.ToString()))
            {
                if (TriggerBoom)
                    Launch();
            }
            base.OnTriggerEnter2D(_col);
        }
        protected override void OnTriggerStay2D(Collider2D _col)
        {
            if (Attacker && _col.gameObject == Attacker.gameObject)//不可以打自己
                return;
            if (TargetRoleTags.Contains(_col.tag.ToString()))
            {
                if (TriggerBoom)
                    Launch();
            }
            base.OnTriggerStay2D(_col);
        }
    }
}
