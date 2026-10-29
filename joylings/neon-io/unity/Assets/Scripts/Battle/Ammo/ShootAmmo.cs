using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public partial class ShootAmmo : Ammo
    {
        [LabelOverride("旋轉子彈朝向目標")]
        [SerializeField]
        protected bool RotateAmmo = true;
        [LabelOverride("子彈速度")]
        [SerializeField]
        protected float AmmoSpeed;
        [LabelOverride("朝運動方向加速度")]
        [SerializeField]
        protected float ForwardAcceleration;
        [LabelOverride("絕對方向加速度")]
        [SerializeField]
        protected Vector2 AbsoluteAcceleration;
        [LabelOverride("追蹤目標係數")]
        [Tooltip("填0~1，若填1就是100%追蹤")]
        [SerializeField]
        protected float TraceFactor;
        [LabelOverride("是否追蹤自身")]
        [SerializeField]
        protected bool TraceSelf = false;
        protected bool TriggerWall;
        [LabelOverride("死亡爆炸物件")]
        [SerializeField]
        protected Bomb BombPrefab;

        bool BeReflect = false;//是否子彈處於被反彈狀態
        protected Vector3 Ammovelocity;
        public override void Init(Dictionary<string, object> _dic)
        {
            base.Init(_dic);
            Target = ((Role)_dic["Target"]);
            TriggerWall = (bool)_dic["TriggerWall"];

            Ammovelocity = (Vector3)(_dic["Direction"]) * AmmoSpeed;
            //transform.rotation = Quaternion.Euler(new Vector3(0, 0, (float)_dic["AmmoRotation"]));
            //transform.LookAt(MyRigi.velocity);
            Launch();
        }
        private void Start()
        {
            if (!RotateAmmo)
                transform.rotation = Quaternion.identity;
        }
        protected override void OnTriggerEnter2D(Collider2D _col)
        {
            if (!BeReflect)
                if (Attacker && _col.gameObject == Attacker.gameObject)//除非子彈被反彈，否則不可以打自己
                    return;
            if (AmmoType == ShootAmmoType.LockOnTarget && !Target)
                return;
            if (AmmoType != ShootAmmoType.LockOnTarget)
            {
                base.OnTriggerEnter2D(_col);
            }
            else
            {
                if (GameObject.ReferenceEquals(Target.gameObject, _col.gameObject))
                {
                    base.OnTriggerEnter2D(_col);
                }
                if (TriggerWall && _col.tag == "Wall")
                {
                    TriggerWallTarget(transform.position);
                }
            }

        }
        protected override void OnTriggerStay2D(Collider2D _col)
        {
            if (!BeReflect)
                if (Attacker && _col.gameObject == Attacker.gameObject)//除非子彈被反彈，否則不可以打自己
                    return;
            if (AmmoType == ShootAmmoType.LockOnTarget && !Target)
                return;
            if (AmmoType != ShootAmmoType.LockOnTarget)
                base.OnTriggerStay2D(_col);
            else
            {
                if (GameObject.ReferenceEquals(Target.gameObject, _col.gameObject))
                    base.OnTriggerStay2D(_col);
            }
        }
        protected virtual void TriggerWallTarget(Vector2 _pos)
        {
            if (HitTargetSound)
                AudioPlayer.PlaySound(HitTargetSound);
            SpawnDeadParticles(_pos);
            SelfDestroy();
        }
        protected override void TriggerTarget(Role _role, Vector2 _pos)
        {
            if (!CheckReadyToTrigger())
                return;
            if (_role.BuffersExist(RoleBuffer.Ghost))
                return;
            if (!CheckReadyToTriggerTarget(_role.gameObject))
                return;
            if (AmmoType != ShootAmmoType.Permanent)
            {
                SelfDestroy();
            }
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
                Attacker.HealHP((Mathf.RoundToInt((damage * VampireProportion))));
            base.TriggerTarget(_role, _pos);
        }
        protected override void Update()
        {
            base.Update();
            // Dead roles remain in the arena for respawn; their Unity object is
            // still valid, so testing Target alone makes homing shots chase corpses.
            if (Target && !CombatRegistry.IsTarget(Target)) Target = null;
            if (TraceFactor > 0 && Attacker != null)
            {
                if (!TraceSelf)
                {
                    if (Target)
                    {
                        Vector2 targetVel = (Target.transform.position - transform.position).normalized * AmmoSpeed;
                        MyRigi.linearVelocity = Vector2.Lerp(MyRigi.linearVelocity, targetVel, TraceFactor);
                        if (RotateAmmo)
                        {
                            float angle = Mathf.Atan2(MyRigi.linearVelocity.y, MyRigi.linearVelocity.x) * Mathf.Rad2Deg;
                            transform.rotation = Quaternion.AngleAxis(angle, Vector3.forward);
                        }

                    }
                    else
                    {
                        if (Attacker.MyForce == Force.Player)
                        {
                            GameObject go = GameobjectFinder.FindClosestGameobjectWithTags(gameObject, Force.Neutral.ToString(), Force.Opponent.ToString());
                            if (go != null)
                            {
                                Target = go.GetComponent<Role>();
                            }
                        }
                        else if (Attacker.MyForce == Force.Opponent)
                        {
                            GameObject go = GameobjectFinder.FindClosestGameobjectWithTags(gameObject, Force.Neutral.ToString(), Force.Player.ToString());
                            if (go != null)
                            {
                                Target = go.GetComponent<Role>();
                            }
                        }
                        else if (Attacker.MyForce == Force.Neutral)
                        {
                            GameObject go = GameobjectFinder.FindClosestGameobjectWithTags(gameObject, Force.Opponent.ToString(), Force.Player.ToString());
                            if (go != null)
                            {
                                Target = go.GetComponent<Role>();
                            }
                        }
                    }
                }
                else
                {
                    if (Attacker != null)
                    {
                        Vector2 attackerVel = (Attacker.transform.position - transform.position).normalized * AmmoSpeed;
                        MyRigi.linearVelocity = Vector2.Lerp(MyRigi.linearVelocity, attackerVel, TraceFactor);
                        if (RotateAmmo)
                        {
                            float angle = Mathf.Atan2(MyRigi.linearVelocity.y, MyRigi.linearVelocity.x) * Mathf.Rad2Deg;
                            transform.rotation = Quaternion.AngleAxis(angle, Vector3.forward);
                        }
                    }
                }
            }
        }
        public override void Launch()
        {
            base.Launch();

            MyRigi.linearVelocity = Ammovelocity;
            //Debug.Log("RemainLag" + RemainLag);
            transform.position = (Vector2)transform.position + (MyRigi.linearVelocity * RemainLag) + (0.5f * (MyRigi.gravityScale * Physics2D.gravity + AbsoluteAcceleration + (Vector2)Ammovelocity.normalized * ForwardAcceleration) * Mathf.Pow(RemainLag, 2));//vt+1/2at^2
            float angle = Mathf.Atan2(MyRigi.linearVelocity.y, MyRigi.linearVelocity.x) * Mathf.Rad2Deg;
            transform.rotation = Quaternion.AngleAxis(angle, Vector3.forward);
        }
        protected override void SpawnParticles()
        {
            base.SpawnParticles();
        }
        protected void SpawnBomb()
        {
            if (BombPrefab)
            {
                Dictionary<string, object> AmmoData = new Dictionary<string, object>();
                AmmoData.Add("TargetRoleTag", TextManager.StringListToString(TargetRoleTags, ','));
                AmmoData.Add("VampireProportion", VampireProportion);
                AmmoData.Add("RemainLag", 0);
                AmmoData.Add("Attacker", Attacker);
                AmmoData.Add("AttackerForce", AttackerRoleTag);


                GameObject go = Instantiate(BombPrefab.gameObject, Vector3.zero, Quaternion.identity) as GameObject;
                Bomb ammo = go.GetComponent<Bomb>();
                go.transform.position = transform.position;
                ammo.Init(AmmoData);
            }
        }
        public void VelocityControl(float _velocityChange)
        {
            MyRigi.linearVelocity *= _velocityChange;
        }
        public void ForceReverse(Force _spellerForce, float _velocityChange)//spellForce是讓這個子彈反轉的施法者的勢力
        {
            if (BeReflect)//無法連續反射子彈
                return;
            if (_spellerForce == Force.Player)
                tag = AmmoForce.PlayerAmmo.ToString();
            else if (_spellerForce == Force.Opponent)
                tag = AmmoForce.OpponentAmmo.ToString();
            else if (_spellerForce == Force.Neutral)
                tag = AmmoForce.NeutralAmmo.ToString();
            if (AttackerRoleTag == Force.Player && _spellerForce == Force.Opponent)
            {
                AttackerRoleTag = Force.Opponent;
                TargetRoleTags = new List<string>() { Force.Player.ToString(), Force.Neutral.ToString() };
            }
            else if (AttackerRoleTag == Force.Player && _spellerForce == Force.Neutral)
            {
                AttackerRoleTag = Force.Neutral;
                TargetRoleTags = new List<string>() { Force.Opponent.ToString(), Force.Player.ToString() };
            }
            else if (AttackerRoleTag == Force.Opponent && _spellerForce == Force.Player)
            {
                AttackerRoleTag = Force.Player;
                TargetRoleTags = new List<string>() { Force.Opponent.ToString(), Force.Neutral.ToString() };
            }
            else if (AttackerRoleTag == Force.Opponent && _spellerForce == Force.Neutral)
            {
                AttackerRoleTag = Force.Neutral;
                TargetRoleTags = new List<string>() { Force.Opponent.ToString(), Force.Player.ToString() };
            }
            else if (AttackerRoleTag == Force.Neutral && _spellerForce == Force.Player)
            {
                AttackerRoleTag = Force.Player;
                TargetRoleTags = new List<string>() { Force.Opponent.ToString(), Force.Neutral.ToString() };
            }
            else if (AttackerRoleTag == Force.Neutral && _spellerForce == Force.Opponent)
            {
                AttackerRoleTag = Force.Opponent;
                TargetRoleTags = new List<string>() { Force.Player.ToString(), Force.Neutral.ToString() };
            }
            Neon.Astral.FactionVisuals.Apply(transform, AttackerRoleTag);
            Target = Attacker;
            MyRigi.linearVelocity *= (-1 * _velocityChange);
            BeReflect = true;
            //設定為可以再次觸發(因為有些傷害子彈只能觸發一次或有CD)
            ReadyToTrigger();
            //重置存活時間
            LifeTimer = LifeTime;
        }
        public override void SelfDestroy()
        {
            SpawnBomb();
            base.SelfDestroy();
        }
        void FixedUpdate()
        {
            AddAcceleration();
        }
        void AddAcceleration()
        {
            MyRigi.linearVelocity += (Vector2)Ammovelocity.normalized * ForwardAcceleration * Time.deltaTime;
            MyRigi.linearVelocity += AbsoluteAcceleration * Time.deltaTime;
        }
    }
}
