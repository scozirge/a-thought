using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public class MeleeAmmo : Ammo
    {
        [LabelOverride("肉搏類型")]
        [Tooltip("Damage是一般肉搏,Block是擋ShootAmmo子彈,BlockDamage是檔ShootAmmo子彈也可以攻擊人\n\n" +
            "Reflect是反彈ShootAmmo類型的子彈，ReflectDamage是反彈ShootAmmo類型的子彈也可以攻擊人\n\n" +
            "Interrupt是改變ShootAmmo類型的子彈速度，InterruptDamage是改變ShootAmmo類型的子彈速度也可以攻擊人")]
        [SerializeField]
        MeleeType MyMeleeType = MeleeType.Damage;
        [LabelOverride("抵擋參數")]
        [Tooltip("Block&Reflect是格擋強度，1=全部格擋，0.1=只檔10%傷害\n\n" +
            "Mirror&ReflectMirror是反彈子彈後的速度，1=原速度，0.1=原來的10分之1速度\n\n" +
            "Interrupt&InterruptDamage是子彈速度改變(子彈不會反過來傷害對手)，1=原速度，0.1=原來的10分之1速度=")]
        [SerializeField]
        protected float MeleeTypeValue = 1;
        [LabelOverride("動畫播放器")]
        [SerializeField]
        protected AnimationPlayer MyAni = null;
        [LabelOverride("取代原本普攻")]
        [Tooltip("若有勾選取代，則原本普攻的碰撞會被取消，而是用此子彈的碰撞(技能被移除時原本普攻的碰撞會被還原))")]
        [SerializeField]
        protected bool ReplaceAttack = false;


        protected List<string> TargetAmmoForces;

        public override void Init(Dictionary<string, object> _dic)
        {
            base.Init(_dic);
            if (MyMeleeType != MeleeType.Damage)
            {
                if (AttackerRoleTag == Force.Player)
                    TargetAmmoForces = new List<string>() { AmmoForce.OpponentAmmo.ToString(), AmmoForce.NeutralAmmo.ToString() };
                else if (AttackerRoleTag == Force.Opponent)
                    TargetAmmoForces = new List<string>() { AmmoForce.PlayerAmmo.ToString(), AmmoForce.NeutralAmmo.ToString() };
                else if (AttackerRoleTag == Force.Neutral)
                    TargetAmmoForces = new List<string>() { AmmoForce.PlayerAmmo.ToString(), AmmoForce.OpponentAmmo.ToString() };
            }
            Vector3 dir = (Vector3)(_dic["Direction"]);
            float angle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
            transform.localRotation = Quaternion.Euler(new Vector3(0, 0, angle));
            if (MyAni)
                MyAni.PlayInFixedTime("Play", RemainLag);
            if (ReplaceAttack)
                Attacker.ReplacePlayerAttack(true, transform);
            Launch();
        }
        protected override void OnTriggerStay2D(Collider2D _col)
        {
            if (Attacker && _col.gameObject == Attacker.gameObject)//不可以打自己
                return;
            base.OnTriggerStay2D(_col);
            if (TargetAmmoForces != null)
                if (TargetAmmoForces.Contains(_col.tag.ToString()))
                {
                    if (_col.GetComponent<ShootAmmo>() != null)
                    {
                        TriggerAmmo(_col.GetComponent<ShootAmmo>());
                    }
                }
        }
        protected override void OnTriggerEnter2D(Collider2D _col)
        {
            if (Attacker && _col.gameObject == Attacker.gameObject)//不可以打自己
                return;
            base.OnTriggerEnter2D(_col);
            if (TargetAmmoForces != null)
                if (TargetAmmoForces.Contains(_col.tag.ToString()))
                {
                    if (_col.GetComponent<ShootAmmo>() != null)
                    {
                        TriggerAmmo(_col.GetComponent<ShootAmmo>());
                    }
                }
        }
        protected override void TriggerTarget(Role _role, Vector2 _pos)
        {
            if (MyMeleeType == MeleeType.Block || MyMeleeType == MeleeType.Reflect)//如果肉搏類型的目標是子彈就返回(因為TriggerTarget的對象為Role)
                return;
            if (!CheckReadyToTrigger())
                return;
            if (_role.BuffersExist(RoleBuffer.Ghost))
                return;
            if (!CheckReadyToTriggerTarget(_role.gameObject))
                return;
            Vector2 force = (_role.transform.position - transform.position).normalized * KnockIntensity;
            int damage = Value;
            if (Attacker != null)
                if (!ReplaceAttack)
                {
                    damage = Mathf.RoundToInt((Attacker.SkillDamage * ValuePercent));//使用攻擊者當下的攻擊力(不然雙刀怪這種技能不會受到詛咒而導致攻擊下降)
                }
                else
                {
                    damage = Mathf.RoundToInt((Attacker.MeleeDamage * ValuePercent));//使用攻擊者當下的攻擊力(不然雙刀怪這種技能不會受到詛咒而導致攻擊下降)
                }

            if (PhotonNetwork.IsConnected)//如果有連線且是玩家自己就跑同步Func
            {
                if (AttackerPhotonViewIsMine)
                {                    
                    SendNetworkHit(_role, damage, force, _pos, ReplaceAttack ? 1 : 2);

                    if (_role.IsAlive && ReplaceAttack)
                    {
                        Attacker.Counterforce((_role.transform.position - transform.position).normalized);
                        Attacker.ExecuteSkillTrigger(PSkillTriggerCondition.AllAttack);
                        Attacker.ExecuteSkillTrigger(PSkillTriggerCondition.MeleeAttack);
                    }
                }
            }
            else
            {
                _role.RecordOfflineHit(Attacker, damage, Buffers);
                _role.BeAttack(damage, force);
                if (_role.IsAlive && ReplaceAttack)
                {
                    Attacker.Counterforce((_role.transform.position - transform.position).normalized);
                    _role.ExecuteSkillTrigger(PSkillTriggerCondition.BeMeleeAttack);
                    Attacker.ExecuteSkillTrigger(PSkillTriggerCondition.AllAttack);
                    Attacker.ExecuteSkillTrigger(PSkillTriggerCondition.MeleeAttack);
                }
            }
            if (Attacker && VampireProportion > 0 && damage > 0 && !PhotonNetwork.IsConnected)
                Attacker.HealHP(Mathf.RoundToInt((damage * VampireProportion)));
            if (AmmoType != ShootAmmoType.Permanent)
                SelfDestroy();
            base.TriggerTarget(_role, _pos);
        }
        protected void TriggerAmmo(ShootAmmo _ammo)
        {
            if (MyMeleeType == MeleeType.Damage)
                return;
            if (!CheckReadyToTrigger())
                return;
            if (!CheckReadyToTriggerTarget(_ammo.gameObject))
                return;
            //如果要阻擋的目標是穿透性(Permanent)子彈就不呼叫擊中特效(因為無法阻擋)，除此之外都要呼叫特效
            if (_ammo.AmmoType != ShootAmmoType.Permanent || !MyMath.EqualToOneOfAll<MeleeType>(MyMeleeType, MeleeType.Block, MeleeType.BlockDamage))
            {
                if (HitTargetParticle != null)
                {
                    Vector3 angle = Vector3.zero;
                    if (!HitTargetParticleRandomAngle)
                        EffectEmitter.EmitParticle(HitTargetParticle, _ammo.transform.position, Vector3.zero, ParticleParent, AttackerRoleTag);
                    else
                        EffectEmitter.EmitParticle(HitTargetParticle, _ammo.transform.position, new Vector3(0, 0, UnityEngine.Random.Range(0, 360)), ParticleParent, AttackerRoleTag);
                }
                if (HitTargetSound)
                    AudioPlayer.PlaySound(HitTargetSound);
            }



            if (MyMath.EqualToOneOfAll<MeleeType>(MyMeleeType, MeleeType.Block, MeleeType.BlockDamage))
            {
                if (MeleeTypeValue < 1)//格檔係數小於1才要算傷害，大於等於1就是全格檔不用算傷害
                {
                    if (_ammo.AmmoType != ShootAmmoType.Permanent)//如果是穿透性子彈無法抵銷目標子彈所以也不用計算傷害
                    {
                        int damage = Mathf.RoundToInt((_ammo.Value * -(MeleeTypeValue - 1)));

                        if (PhotonNetwork.IsConnected)
                        {
                            if (Attacker.photonView.IsMine)
                                Attacker.ReceiveDmg(damage);
                        }
                        else
                            Attacker.ReceiveDmg(damage);
                    }
                }
            }
            else if (MyMath.EqualToOneOfAll<MeleeType>(MyMeleeType, MeleeType.Reflect, MeleeType.ReflectDamage))
            {
                _ammo.ForceReverse(Attacker.MyForce, MeleeTypeValue);
            }
            else if (MyMath.EqualToOneOfAll<MeleeType>(MyMeleeType, MeleeType.Interrupt, MeleeType.InterruptDamage))
            {
                _ammo.VelocityControl(MeleeTypeValue);
            }

            if (AmmoType != ShootAmmoType.Permanent)
                SelfDestroy();
        }
        public override void SelfDestroy()
        {
            if (ReplaceAttack && Attacker)
                Attacker.ReplacePlayerAttack(false, transform);
            base.SelfDestroy();
        }
    }
}
