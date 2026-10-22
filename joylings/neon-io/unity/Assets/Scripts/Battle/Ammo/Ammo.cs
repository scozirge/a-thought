using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public partial class Ammo : MonoBehaviour
    {
        [Tooltip("自身跟隨特效物件")]
        [SerializeField]
        ParticleSystem[] LocalParticles = null;
        [Tooltip("不跟隨的特效物件")]
        [SerializeField]
        ParticleSystem[] GlobalParticle = null;
        [Tooltip("攻擊者跟隨特效物件")]
        [SerializeField]
        ParticleSystem[] LocalAttackerParticles = null;
        [Tooltip("死亡特效")]
        [SerializeField]
        protected ParticleSystem[] DeadParticles = null;
        [LabelOverride("目標命中特效")]
        [SerializeField]
        protected ParticleSystem HitTargetParticle = null;
        [LabelOverride("目標命中特效隨機角度")]
        [SerializeField]
        protected bool HitTargetParticleRandomAngle = false;
        [LabelOverride("外觀父層")]
        [Tooltip("有些子彈是對手看不到的就塞這個物件的子層中")]
        [SerializeField]
        protected GameObject AppearanceObjs = null;
        [LabelOverride("是否在對手視角中隱藏")]
        [SerializeField]
        protected bool HildinOpponentView = false;
        [LabelOverride("產生時音效")]
        [SerializeField]
        protected AudioClip SpawnSound = null;
        [LabelOverride("命中時音效")]
        [SerializeField]
        protected AudioClip HitTargetSound = null;
        [LabelOverride("傷害倍率")]
        [Tooltip("傷害倍率(傷害=傷害倍率x腳色攻擊力))")]
        [SerializeField]
        public float ValuePercent = 1;//一般來說，子彈發射前就會賦予傷害強度了，但需要記錄這像是因為當腳色中攻擊力弱化狀態時，有些子彈只會產生一次並永久存在，這種子彈要再每次擊中時重新計算傷害
        [LabelOverride("吸血比例")]
        [Tooltip("每發攻擊的吸血比例")]
        [SerializeField]
        protected float VampireProportion;
        [LabelOverride("子彈存活時間(秒)")]
        [SerializeField]
        protected float LifeTime = 0;
        [LabelOverride("子彈擊退力道")]
        [SerializeField]
        protected int KnockIntensity = 0;
        [LabelOverride("重力")]
        [SerializeField]
        protected float Gravity = 0;
        [LabelOverride("子彈類型")]
        [Tooltip("選擇穿透就是子彈擊中玩家後不會移除，且可能造成多次傷害(傷害間隔短就可能連續觸發傷害)")]
        [SerializeField]
        public ShootAmmoType AmmoType = ShootAmmoType.Default;
        [LabelOverride("同目標觸發CD(秒)")]
        [Tooltip("對同一目標傷害週期，只有子彈類型是穿透(代表擊中敵方後不會消失)才需要設定，如果填0代表同一個目標只會命中一次")]
        [SerializeField]
        protected float TriggerTargetCD = 0;
        [LabelOverride("子彈觸發週期")]
        [Tooltip("觸發CD，觸發傷害後要過多久才能再次觸發(在CD中會關閉LocalParticles)，只有子彈類型是穿透(代表擊中敵方後不會消失)才需要設定，填0代表可以一直觸發")]
        [SerializeField]
        protected float TriggerCD = 0;
        [Tooltip("暈眩(秒數)、燃燒(秒數)、冰凍(秒數)、傷害Buff(秒數,增/減值)、無敵(秒數)、格檔(時間,秒數)")]
        [SerializeField]
        protected List<BufferData> Buffers = null;

        protected Force AttackerRoleTag;
        public Force VisualForce => AttackerRoleTag;
        protected List<string> TargetRoleTags = new List<string>();
        protected bool IsLaunch;
        [HideInInspector]
        public int Value;
        protected Role Target;
        protected float LifeTimer;
        protected Rigidbody2D MyRigi;
        protected Transform ParticleParent;
        float DestructMargin_Left;
        float DestructMargin_Right;
        protected Role Attacker;
        protected List<MyTimer> ReadyToTriggerTargetTimers;//針對每個腳色可以觸發傷害的CD
        protected MyTimer ReadyToTriggerTimer;//技能本身可以觸發傷害的CD
        List<GameObject> LocalParticleObjs;
        protected bool CanTrigger = true;
        protected Dictionary<string, bool> ReadyToDamageTargets;
        protected bool AttackerPhotonViewIsMine = false;
        protected float RemainLag;//網路delay時間超過等待施法後仍剩餘的delay秒數
        public void OnDisable()
        {
        }
        public void OnEnable()
        {
            if (SpawnSound)
                AudioPlayer.PlaySound(SpawnSound);
        }

        public virtual void TriggerHitCondition(Role _role)
        {
            if (Buffers == null || Buffers.Count == 0)
                return;
            if (PhotonNetwork.IsConnected)
            {
                //給buffer跟受到傷害的func合併
            }
            else
            {
                for (int i = 0; i < Buffers.Count; i++)
                {
                    _role.AddBuffer(Buffers[i]);
                }
            }
        }
        public void SetBuffersTime(float _time)
        {
            if (Buffers == null) return;
            for (int i = 0; i < Buffers.Count; i++)
            {
                Buffers[i] = new BufferData(Buffers[i].Type, _time, Buffers[i].Value, Buffers[i].Value2);
            }
        }
        public void AddBuffer(params BufferData[] _datas)
        {
            if (_datas == null) return;
            if (Buffers == null) Buffers = new List<BufferData>();
            foreach (BufferData data in _datas)
            {
                int index = Buffers.FindIndex(existing => existing.Type == data.Type);
                if (index >= 0) Buffers[index] = data;
                else Buffers.Add(data);
            }
        }
        Animation ani;
        public virtual void Init(Dictionary<string, object> _dic)
        {
            ReadyToDamageTargets = new Dictionary<string, bool>();
            ReadyToTriggerTargetTimers = new List<MyTimer>();
            CanTrigger = true;
            if (TriggerCD > 0)
            {
                ReadyToTriggerTimer = new MyTimer(TriggerCD, ReadyToTrigger, false, false);
                LocalParticleObjs = new List<GameObject>();
            }
            ParticleParent = GameObject.FindGameObjectWithTag("ParticleParent").transform;
            if (MyRigi == null)
            {
                MyRigi = gameObject.AddComponent<Rigidbody2D>();
            }
            if (Gravity == 0)
                MyRigi.bodyType = RigidbodyType2D.Kinematic;
            else
                MyRigi.bodyType = RigidbodyType2D.Dynamic;
            MyRigi.gravityScale = Gravity;
            MyRigi.sleepMode = RigidbodySleepMode2D.NeverSleep;
            MyRigi.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
            LifeTimer = LifeTime;
            RemainLag = float.Parse(_dic["RemainLag"].ToString());
            AttackerRoleTag = ((Force)(_dic["AttackerForce"]));
            string[] tartgetTagStrs = ((string)(_dic["TargetRoleTag"])).Split(',');
            for (int i = 0; i < tartgetTagStrs.Length; i++)
            {
                TargetRoleTags.Add(tartgetTagStrs[i]);
            }
            if (AttackerRoleTag == Force.Player)
                tag = AmmoForce.PlayerAmmo.ToString();
            else if (AttackerRoleTag == Force.Opponent)
                tag = AmmoForce.OpponentAmmo.ToString();
            else if (AttackerRoleTag == Force.Neutral)
                tag = AmmoForce.NeutralAmmo.ToString();

            Attacker = (Role)(_dic["Attacker"]);
            Neon.Astral.FactionVisuals.Apply(transform, AttackerRoleTag);
            Value = Mathf.RoundToInt(Attacker.SkillDamage * ValuePercent);
            SpawnParticles();

            if (PhotonNetwork.IsConnected)
            {
                if (Attacker.MyForce != Force.Player)
                    AppearanceObjs.SetActive(!HildinOpponentView);//若不是自己的子彈且該子彈是隱形的就關閉外觀父層
                if (Attacker)
                {
                    if (Attacker.photonView.IsMine)
                        AttackerPhotonViewIsMine = true;//若有連線則設定施法者是不是此玩家擁有的物件
                }
            }
            else
                AttackerPhotonViewIsMine = false;
        }
        protected virtual void SpawnParticles()
        {
            //產生特效
            for (int i = 0; i < LocalParticles.Length; i++)
            {
                if (LocalParticles[i] == null)
                    continue;
                GameObject go = EffectEmitter.EmitParticle(LocalParticles[i], Vector3.zero, Vector3.zero, AppearanceObjs.transform, AttackerRoleTag).gameObject;
                if (LocalParticleObjs != null)
                    LocalParticleObjs.Add(go);
            }
            for (int i = 0; i < GlobalParticle.Length; i++)
            {
                if (GlobalParticle[i] == null)
                    continue;
                EffectEmitter.EmitParticle(GlobalParticle[i], transform.position, Vector3.zero, ParticleParent, AttackerRoleTag);
            }
            if (Attacker)
            {
                for (int i = 0; i < LocalAttackerParticles.Length; i++)
                {
                    if (LocalAttackerParticles[i] == null)
                        continue;
                    EffectEmitter.EmitParticle(LocalAttackerParticles[i], Vector3.zero, Vector3.zero, Attacker.transform, AttackerRoleTag);
                }
            }
        }
        protected virtual void SpawnDeadParticles(Vector2 _pos)
        {

            for (int i = 0; i < DeadParticles.Length; i++)
            {
                if (DeadParticles[i] == null)
                    continue;
                EffectEmitter.EmitParticle(DeadParticles[i], _pos, Vector3.zero, ParticleParent, AttackerRoleTag);
            }
        }
        public virtual void Launch()
        {
            IsLaunch = true;
        }
        protected virtual void OnTriggerEnter2D(Collider2D _col)
        {
            if (!IsLaunch)
                return;
            if (TargetRoleTags.Contains(_col.tag.ToString()))
            {
                Role role = _col.GetComponent<Role>();
                if (role != null && role.IsAlive) TriggerTarget(role, transform.position);
            }
        }
        protected virtual void OnTriggerStay2D(Collider2D _col)
        {
            if (!IsLaunch)
                return;
            if (TargetRoleTags.Contains(_col.tag.ToString()))
            {
                Role role = _col.GetComponent<Role>();
                if (role != null && role.IsAlive) TriggerTarget(role, transform.position);
            }
        }
        protected void ReadyToTriggerTargets(object _key)
        {
            string key = (string)_key;
            if (ReadyToDamageTargets.ContainsKey(key))
            {
                ReadyToDamageTargets[key] = true;
            }
        }
        protected bool CheckReadyToTriggerTarget(GameObject _obj)
        {
            string id = _obj.GetInstanceID().ToString();
            if (ReadyToDamageTargets.ContainsKey(id))
            {
                if (ReadyToDamageTargets[id])
                {
                    ReadyToDamageTargets[id] = false;
                    return true;
                }
                else
                    return false;
            }
            else
            {
                if (TriggerTargetCD > 0)
                    ReadyToTriggerTargetTimers.Add(new MyTimer(TriggerTargetCD, ReadyToTriggerTargets, true, true, id));
                ReadyToDamageTargets.Add(id, false);
                return true;
            }
        }
        protected bool CheckReadyToTrigger()
        {
            if (ReadyToTriggerTimer == null)
                return true;
            if (CanTrigger)
            {
                LocalParticleObjs.RemoveAll(x => x == null);
                for (int i = 0; i < LocalParticleObjs.Count; i++)
                {
                    LocalParticleObjs[i].SetActive(false);
                }
                ReadyToTriggerTimer.ResetCircleTime(ReadyToTriggerTimer.CircleTime);
                ReadyToTriggerTimer.StartRunTimer = true;
                CanTrigger = false;
                return true;
            }
            else
                return false;
        }
        protected void ReadyToTrigger()
        {
            if(LocalParticleObjs!=null)
            {
                LocalParticleObjs.RemoveAll(x => x == null);
                for (int i = 0; i < LocalParticleObjs.Count; i++)
                {
                    LocalParticleObjs[i].SetActive(true);
                }
            }
            CanTrigger = true;
        }
        protected void SendNetworkHit(Role target, int damage, Vector2 force, Vector2 position, int hitType)
        {
            if (!AttackerPhotonViewIsMine || Attacker == null || target == null) return;
            int count = Buffers == null ? 0 : Buffers.Count;
            int[] types = new int[count];
            float[] times = new float[count];
            float[] values = new float[count];
            float[] values2 = new float[count];
            for (int i = 0; i < count; i++)
            {
                types[i] = (int)Buffers[i].Type;
                times[i] = Buffers[i].Time;
                values[i] = Buffers[i].Value;
                values2[i] = Buffers[i].Value2;
            }
            target.photonView.RPC("ReceiveNetworkHit", RpcTarget.All,
                Attacker.photonView.ViewID, damage, force, "", position,
                types, times, values, values2, hitType, VampireProportion);
        }

        protected virtual void TriggerTarget(Role _role, Vector2 _pos)
        {
            if (_role == null) return;
            if (AppearanceObjs) AppearanceObjs.SetActive(true);
            if (HitTargetSound)
                AudioPlayer.PlaySound(HitTargetSound);
            if (HitTargetParticle != null)
            {               
                Vector2 directionOfTravel = _role.transform.position - transform.position;
                Vector2 finalPos = (Vector2)_role.transform.position + directionOfTravel.normalized * -_role.ColliderRadius;
                if (!HitTargetParticleRandomAngle)
                    EffectEmitter.EmitParticle(HitTargetParticle, finalPos, Vector3.zero, ParticleParent, AttackerRoleTag);
                else
                    EffectEmitter.EmitParticle(HitTargetParticle, finalPos, new Vector3(0, 0, UnityEngine.Random.Range(0, 360)), ParticleParent, AttackerRoleTag);
            }
            if (Attacker == null) return;
            if (_role != Attacker)//輔助技能可能會有目標為自身的情況發生，所以若目標為自身時不能觸發
            {
                Attacker.ExecuteSkillTrigger(PSkillTriggerCondition.AllAttack);
                Attacker.ExecuteSkillTrigger(PSkillTriggerCondition.SkillAttack);
                if (!PhotonNetwork.IsConnected) _role.ExecuteSkillTrigger(PSkillTriggerCondition.BeSkillAttack);
            }
            if (_role.IsAlive)
            {
                TriggerHitCondition(_role);
                //喊話
                Attacker.Clamor(BattleManager.GetClamor(Attacker.Name, ((int)ClamorText.ClamorType.Hit).ToString()), ClamorText.ClamorType.Hit);
            }
            // The victim's authority awards network kills after applying damage and survival passives.
        }
        protected virtual void Update()
        {
            if (!IsLaunch)
                return;
            LifeTimerFunc();
            if (ReadyToTriggerTimer != null)
                ReadyToTriggerTimer.RunTimer();
            for (int i = 0; i < ReadyToTriggerTargetTimers.Count; i++)
            {
                ReadyToTriggerTargetTimers[i].RunTimer();
            }
        }
        public virtual void SelfDestroy()
        {
            Destroy(gameObject);
        }
        protected virtual void LifeTimerFunc()
        {
            if (LifeTimer > 0)
                LifeTimer -= Time.deltaTime;
            else
            {
                SpawnDeadParticles(transform.position);
                SelfDestroy();
            }
        }



    }
}
