using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;
using UnityEngine.UI;

namespace Starbro.NeonIO
{
    public abstract class Role : MonoBehaviourPunCallbacks, IPunObservable
    {
        #region Public Field
        [LabelOverride("使用Json資料")]
        public bool UseJsonData = false;
        [LabelOverride("血量")]
        public int MaxHealth = 1000;
        private int health;
        public int Health
        {
            get { return health; }
            set
            {
                if (IsInit && !HasSimulationAuthority && !ApplyingNetworkState) return;
                if (value < 0)
                    value = 0;
                else if (value > MaxHealth)
                    value = MaxHealth;
                health = value;
                if (HealthImage != null) HealthImage.fillAmount = HealthRatio;
                DeathCheck();
            }
        }
        public string Name;//玩家名稱
        public float HealthRatio { get { return MaxHealth > 0 ? (float)Health / MaxHealth : 0; } }
        [LabelOverride("攻擊力")]
        public int BaseDamage = 50;
        int Damage
        {
            get
            {
                return Mathf.RoundToInt(BaseDamage * (1 + (Buffers.ContainsKey(RoleBuffer.Sick) ?
                    -GameSettingData.SickDamageReduce : 0) +
                    (Buffers.ContainsKey(RoleBuffer.DamageUp) ? Buffers[RoleBuffer.DamageUp].Value : 0)
                    ));
            }
        }
        public int MeleeDamage
        {
            get
            {
                return Mathf.RoundToInt(Damage * (1 + (Buffers.ContainsKey(RoleBuffer.MeleeDamageUp) ? Buffers[RoleBuffer.MeleeDamageUp].Value : 0)));
            }
        }
        public int SkillDamage
        {
            get
            {
                return Mathf.RoundToInt(Damage * (1 + (Buffers.ContainsKey(RoleBuffer.SkillDamageUp) ? Buffers[RoleBuffer.SkillDamageUp].Value : 0)));
            }
        }
        [LabelOverride("腳色移動")]
        public float BaseMoveSpeed = 600;
        public float MoveSpeed
        {
            get
            {
                return BaseMoveSpeed * (1 + (Buffers.ContainsKey(RoleBuffer.Freeze) ?
                    -GameSettingData.FreezeMove : 0) +
                    (Buffers.ContainsKey(RoleBuffer.SpeedUp) ? Buffers[RoleBuffer.SpeedUp].Value : 0)
                    );
            }
        }
        public Role Myself = null;
        [LabelOverride("腳色動作播放器")]
        [SerializeField]
        protected AnimationPlayer RoleAniPlayer;
        public bool IsAlive { get; protected set; }//腳色是否存活
        public Force MyForce { get; protected set; }//所屬勢力
        public bool IsPreAttack { get; protected set; }//中立腳色在攻擊前會先標示IsPreAttack為true
        [HideInInspector]
        public Vector3 Movetorward { get; protected set; }//腳色移動方向
        [HideInInspector]
        public Rigidbody2D MyRigi;
        public int ID;
        #endregion

        #region Private Field
        public int LV = 1;
        [LabelOverride("外觀物件")]
        [Tooltip("玩家操縱的腳色死亡或隱形時會關閉外觀物件顯示")]
        [SerializeField]
        protected GameObject AppearanceObj = null;
        [LabelOverride("腳色Canvas")]
        [SerializeField]
        public Canvas RoleCanvas = null;
        [LabelOverride("腳色面向箭頭")]
        [SerializeField]
        protected Transform TowardDirTrans = null;
        protected float ArrowAngle;//箭頭朝向角度
        [LabelOverride("普攻碰撞物件")]
        [SerializeField]
        Collider2D AttackCollider = null;
        [LabelOverride("自身碰撞體")]
        [Tooltip("死亡時會關閉自身碰撞功能")]
        [SerializeField]
        protected Collider2D SelfCollider = null;
        [LabelOverride("攻擊時反作用力")]
        [SerializeField]
        protected int SelfKnockForce = 1000;
        [LabelOverride("肉搏目標暈眩時間")]
        [SerializeField]
        protected float MeleeStunTime = 1f;
        [LabelOverride("肉搏自身暈眩時間")]
        [SerializeField]
        protected float MeleeSelfStunTime = 1f;
        [LabelOverride("非攻擊碰撞暈眩時間")]
        [SerializeField]
        protected float BumpStunTime = 0.3f;
        [LabelOverride("擊退時摩擦力")]
        [SerializeField]
        protected float KnockDrag = 20;
        [LabelOverride("一般摩擦力")]
        [SerializeField]
        protected float NormalDrag = 50;
        [LabelOverride("擊退摩擦持續時間")]
        [SerializeField]
        protected float KnockDragDuration = 0.1f;
        protected MyTimer DragTimer;
        [LabelOverride("血量UI")]
        [SerializeField]
        Image HealthImage = null;
        [LabelOverride("死亡特效")]
        [SerializeField]
        ParticleSystem DeathEffect = null;
        [LabelOverride("死亡音效")]
        [SerializeField]
        AudioClip DeathSound = null;
        [SerializeField]
        protected SpriteRenderer[] FeatureSpriteRenderer = new SpriteRenderer[3];
        [LabelOverride("獲得部位特效")]
        [SerializeField]
        ParticleSystem GainFeatureEffect = null;
        [LabelOverride("獲得經驗音效")]
        [SerializeField]
        AudioClip GainFeatureSound = null;
        [LabelOverride("LootAbsorber物件")]
        [SerializeField]
        LootAbsorber MyLootAbsorber = null;
        [LabelOverride("玩家稱號Text物件")]
        [SerializeField]
        protected Text TitleLabel = null;
        [LabelOverride("玩家名Text物件")]
        [SerializeField]
        protected Text NameLabel = null;
        [LabelOverride("喊話物件")]
        [SerializeField]
        protected ClamorText ClamorTextPrefab = null;
        [HideInInspector]
        public Role ClosestOpponent;//最靠近玩家的Role(PlaerRole會每偵更新，NeutralRole為每秒更新)
        [HideInInspector]
        public int ColliderRadius = 0;
        //public Role LastMeleeTarget;//最後一個肉搏的目標目前用不到先註解掉，以後需要可以用
        protected bool IsStay;//不動做，且沒受到攻擊後1秒會進入閒置狀態
        protected MyTimer StayTimer;
        protected bool IsNoDamageTaken;//沒受到傷害後3秒會進入沒受到傷害的狀態
        protected MyTimer NoDamageTakenTimer;
        protected MyTimer WaitToBeInvisibleTimer;//等待幾秒隱形(關閉外觀物件)，不能立刻關閉，因為進入隱形狀態前會慢慢淡出，不是直接不見
        protected MyTimer ClamorCDTimer;
        bool CanClamor = true;
        protected bool IsInit = false;
        public bool IsInitialized { get { return IsInit; } }
        public virtual bool CanCollectStars => true;
        protected bool CanInitialize { get { return BattleManager.BM != null && BattleManager.BM.IsReadyToSpawn && (!PhotonNetwork.IsConnected || photonView.IsReady); } }
        public bool HasSimulationAuthority { get { return !PhotonNetwork.IsConnected || photonView.IsMine; } }
        bool HasAppliedNetworkState;
        bool ApplyingNetworkState;
        protected int NetworkLifeRevision;
        int LastNotifiedDeath = -1;
        int LastAttackerViewId;
        Role lastOfflineAttacker;
        double LastAttackerTime;
        int HitSequence;
        readonly Dictionary<int, int> LastHealingHit = new Dictionary<int, int>();
        readonly List<RoleBuffer> BufferKeysScratch = new List<RoleBuffer>();
        readonly List<RoleBuffer> ExpiredBuffersScratch = new List<RoleBuffer>();
        PassiveSkill[] CachedPassiveSkills = System.Array.Empty<PassiveSkill>();
        bool PassiveSkillsDirty = true;
        protected Dictionary<RoleBuffer, ParticleSystem> BufferParticles = new Dictionary<RoleBuffer, ParticleSystem>();
        protected Dictionary<RoleBuffer, BufferData> Buffers = new Dictionary<RoleBuffer, BufferData>();
        readonly SpeedBuffStack speedBuffs = new SpeedBuffStack();
        protected Dictionary<RoleBuffer, float> BufferTimers = new Dictionary<RoleBuffer, float>();
        protected Dictionary<RoleBuffer, PreciseTimer> PreciseBufferTimers = new Dictionary<RoleBuffer, PreciseTimer>();
        public Dictionary<FeaturePart, Skill> SkillDic = new Dictionary<FeaturePart, Skill>();//技能清單
        protected Dictionary<FeaturePart, FeatureData> FeatureDic = new Dictionary<FeaturePart, FeatureData>();//能力部位清單
        protected RoleBuffer[] NegativeBuffs = new RoleBuffer[5] { RoleBuffer.Burn, RoleBuffer.Freeze, RoleBuffer.Sick, RoleBuffer.Stun, RoleBuffer.Bleed };
        protected RoleBuffer[] ResistanceNegativeBuffs = new RoleBuffer[2] { RoleBuffer.Immortal, RoleBuffer.Ghost };
        protected RoleBuffer[] NotLoopParticleBuffs = new RoleBuffer[1] { RoleBuffer.Bleed };//不是循環播放的狀態特效，此類型特效不會因為狀態移除就跟著移除特效，而是等特效時間到自然移除，類似流血+血跡特效
        #endregion

        #region MonoBehaviour Func

        public override void OnEnable() { base.OnEnable(); CombatRegistry.Add(this); }
        public override void OnDisable() { CombatRegistry.Remove(this); base.OnDisable(); }

        protected virtual void Awake()
        {
            // Fusion assigns authority in Spawned, after Unity Awake.
            MyRigi = GetComponent<Rigidbody2D>();
            RoleMovementArrow.Attach(this, TowardDirTrans);
        }
        protected virtual IEnumerator Start()
        {
            while (!CanInitialize) yield return null;
            Init();
        }
        public virtual void Init()
        {
            if (IsInit || !CanInitialize)
                return;
            Myself = this;
            IsAlive = true;//這要在GetProperties前不然不能施放技能或buffer
            RemoveFeature();
            GetProperties();
            MyRigi = GetComponent<Rigidbody2D>();
            Movetorward = Vector3.up;
            StayTimer = new MyTimer(1, Stay, true, false);
            NoDamageTakenTimer = new MyTimer(3, NoDamageTaken, true, false);
            DragTimer = new MyTimer(KnockDragDuration, DragRecovery, false, false);
            WaitToBeInvisibleTimer = new MyTimer(0.2f, ExecuteInvisible, false, false);
            if(GameSettingData.ClamorCD>0)
                ClamorCDTimer = new MyTimer(GameSettingData.ClamorCD, SetCanClamor, false, false);
            //BurnTimer = new PreciseTimer(GameSettingData.BurnTriggerInterval,, Burn, false, true);
            //BleedTimer = new MyTimer(GameSettingData.BleedTriggerInterval, Bleed, false, false);
            DragRecovery();
            ColliderRadius = (int)GetComponent<CircleCollider2D>().radius;
            Neon.Astral.FactionVisuals.Apply(transform, MyForce);
            IsInit = true;
        }

        protected virtual void Update()
        {
            if (!IsInit || NeonArenaFlow.CombatBlocked) return;
            if (!HasSimulationAuthority)
            {
                // Proxy state comes from snapshots; only presentation timers run here.
                if (WaitToBeInvisibleTimer != null) WaitToBeInvisibleTimer.RunTimer();
                if (ClamorCDTimer != null) ClamorCDTimer.RunTimer();
                return;
            }
            if (!IsAlive) return;
            if (IsStay)
                ExecuteSkillTrigger(PSkillTriggerCondition.Stay);
            if (IsNoDamageTaken)
                ExecuteSkillTrigger(PSkillTriggerCondition.NoDamageTaken);
            ExecuteSkillTrigger(PSkillTriggerCondition.HPBelow);
            ExecuteSkillTrigger(PSkillTriggerCondition.Cycle);
            if (StayTimer != null)
                StayTimer.RunTimer();//閒置計時器
            if (NoDamageTakenTimer != null)
                NoDamageTakenTimer.RunTimer();//沒受到傷害計時器
            if (WaitToBeInvisibleTimer != null)
                WaitToBeInvisibleTimer.RunTimer();
            //BurnTimer.RunTimer();//燃燒計時器
            //BleedTimer.RunTimer();//流血計時器
            BufferTimerFunc();//狀態buffer時間計算
            if (DragTimer != null)
                DragTimer.RunTimer();//摩擦力時間計算
            if (ClamorCDTimer != null)
                ClamorCDTimer.RunTimer();//喊話CD計時器
            OutsideBattleAreaGetDebuff();
        }
        void OutsideBattleAreaGetDebuff()
        {
            if (NeonArenaFlow.Active || BattleManager.BM == null || !HasSimulationAuthority) return;
            bool inside = Circle.CheckIfPointInsiedTheCircle(BattleManager.BM.BattleFieldRadius, Vector2.zero, transform.position);
            if (!inside)
            {
                if (!BuffersExist(RoleBuffer.OutsideCurse))
                    AddBuffer(RoleBuffer.OutsideCurse, 0.5f);
            }
        }
        protected virtual void FixedUpdate()
        {
        }
        #endregion

        #region Public Func
        /*設定最後一個肉搏的目標目前用不到先註解掉，以後需要可以用
        [PunRPC]
        public void SetCurMeleeTarget_RPC(int _senderView)
        {
            PhotonView senderView = PhotonView.Find(_senderView);
            if (senderView != null)
                SetCurMeleeTarget(senderView.GetComponent<Role>());
        }
        public void SetCurMeleeTarget(Role _target)
        {
            if (_target != null)
                LastMeleeTarget = _target;
        }
         */
        public void Clamor(string _str, ClamorText.ClamorType _type)
        {
            if (!CanClamor)
                return;
            if (_str == "")
                return;
            if (!ProbabilityGetter.GetResult(GameSettingData.ClamorProbabilities[(int)_type]))
                return;
            ClamorText ct = Instantiate(ClamorTextPrefab);
            ct.Init(_str, _type, Myself);
            if(ClamorCDTimer!=null)
            {
                CanClamor = false;
                ClamorCDTimer.RestartCountDown();
                ClamorCDTimer.StartRunTimer = true;
            }
        }
        void SetCanClamor()
        {
            CanClamor = true;
        }
        public void CallToEmitParticle(string _name, Vector3 _pos, Force? visualForce = null)
        {
            EffectData ed = GameDictionary.GetEffect(_name);
            if (ed != null)
            {
                if (ed.Particle) EffectEmitter.EmitParticle(ed.Particle, _pos, Vector3.zero, null, visualForce ?? MyForce);
                if (ed.Audio) AudioPlayer.PlaySound(ed.Audio);
            }
        }
        [PunRPC]
        public virtual void OnKilling(string _killer, string _loser)
        {
            BattleUI.ShowKillLog(_killer, _loser);
            //喊話
            Clamor(BattleManager.GetClamor(Name, ((int)ClamorText.ClamorType.Kill).ToString()), ClamorText.ClamorType.Kill);
        }
        [PunRPC]
        public void BeAttackAndCallParticle(int _dmg, Vector2 _force, string _particleName, Vector2 _particlePos, PhotonMessageInfo _info)
        {
            BeAttack(_dmg, _force);
            CallToEmitParticle(_particleName, _particlePos);
            if (!IsAlive)
                return;
            //喊話
            Clamor(BattleManager.GetClamor(Name, ((int)ClamorText.ClamorType.BeHit).ToString()), ClamorText.ClamorType.BeHit);
        }
        [PunRPC]
        public void BeAttackAndAddBuffer(int _dmg, Vector2 _force, int[] _typeArray, float[] _timeArray, float[] _value1Array, float[] _value2Array, PhotonMessageInfo _info)
        {
            BeAttack(_dmg, _force);
            if (!IsAlive)
                return;
            //喊話
            Clamor(BattleManager.GetClamor(Name, ((int)ClamorText.ClamorType.BeHit).ToString()), ClamorText.ClamorType.BeHit);
            //AddBuffer
            if (_typeArray != null && _timeArray != null && _value1Array != null && _value2Array != null && _typeArray.Length == _timeArray.Length && _typeArray.Length == _value1Array.Length && _typeArray.Length == _value2Array.Length)
            {
                for (int i = 0; i < _typeArray.Length; i++)
                {
                    RoleBuffer roleBuffer = (RoleBuffer)_typeArray[i];
                    AddBuffer(new BufferData(roleBuffer, _timeArray[i], _value1Array[i], _value2Array[i]));
                }
            }
            else
            {
                Debug.LogWarning("錯誤的RoleBuffer傳入值");
            }
        }
        [PunRPC]
        public void BeAttackAndCallParticleAndAddBuffer(int _dmg, Vector2 _force, string _particleName, Vector2 _particlePos, int[] _typeArray, float[] _timeArray, float[] _value1Array, float[] _value2Array, PhotonMessageInfo _info)
        {
            BeAttack(_dmg, _force);
            CallToEmitParticle(_particleName, _particlePos);
            if (!IsAlive)
                return;
            //喊話
            Clamor(BattleManager.GetClamor(Name, ((int)ClamorText.ClamorType.BeHit).ToString()), ClamorText.ClamorType.BeHit);
            //AddBuffer
            if (_typeArray != null && _timeArray != null && _value1Array != null && _value2Array != null && _typeArray.Length == _timeArray.Length && _typeArray.Length == _value1Array.Length && _typeArray.Length == _value2Array.Length)
            {
                for (int i = 0; i < _typeArray.Length; i++)
                {
                    RoleBuffer roleBuffer = (RoleBuffer)_typeArray[i];
                    AddBuffer(new BufferData(roleBuffer, _timeArray[i], _value1Array[i], _value2Array[i]));
                }
            }
            else
            {
                Debug.LogWarning("錯誤的RoleBuffer傳入值");
            }
        }
        [PunRPC]
        public virtual void BeAttack(int _dmg, Vector2 _force)
        {
            if (!HasSimulationAuthority || !IsAlive || NeonArenaFlow.CombatBlocked) return;
            if (BuffersExist(RoleBuffer.Invisible))
                RemoveBufferByTypes(RoleBuffer.Invisible);
            if (BuffersExist(RoleBuffer.Immortal))
            {
                AudioPlayer.PlaySound(GameDictionary.GetSound("ShieldHit"));
                return;
            }
            if (BuffersExist(RoleBuffer.Block))
            {
                AudioPlayer.PlaySound(GameDictionary.GetSound("ShieldHit"));
                _dmg = Mathf.RoundToInt((_dmg * (1 - Buffers[RoleBuffer.Block].Value)));
                if (Buffers[RoleBuffer.Block].Value2 != 0)//如果Block可使用次數是0代表可以無限次使用就不處理，如果不是0代表是有次數限制所以要扣使用次數，若扣到0就要移除此Buffer
                {
                    int times = (int)Buffers[RoleBuffer.Block].Value2 - 1;
                    if (times > 0)
                    {
                        Buffers[RoleBuffer.Block] = new BufferData(RoleBuffer.Block, Buffers[RoleBuffer.Block].Time, Buffers[RoleBuffer.Block].Value, times);
                    }
                    else
                    {
                        RemoveBufferByTypes(RoleBuffer.Block);
                    }
                }
            }
            //擊退
            BeKnock(_force);
            //被攻擊觸發技能
            ExecuteSkillTrigger(PSkillTriggerCondition.BeAttack);
            ExecuteSkillTrigger(PSkillTriggerCondition.BeAttackHPBelow);
            if (IsStay)
                BreakStay();
            ReceiveDmg(_dmg);
            if (IsAlive)
            {
                //喊話
                Clamor(BattleManager.GetClamor(Name, ((int)ClamorText.ClamorType.BeHit).ToString()), ClamorText.ClamorType.BeHit);
            }
        }
        public virtual void BeKnock(Vector2 _force)
        {
            if (_force == Vector2.zero || !HasSimulationAuthority)
                return;
            if (MyRigi == null)
                return;
            ChangeToKnockDrag();
            _force *= (1 - (BuffersExist(RoleBuffer.Stable) ? Buffers[RoleBuffer.Stable].Value : 0));
            MyRigi.linearVelocity = _force;
        }
        public virtual void ReceiveDmg(int _dmg)
        {
            if (!HasSimulationAuthority || !IsAlive || NeonArenaFlow.CombatBlocked) return;
            if (BuffersExist(RoleBuffer.Immortal))
                return;
            int arenaDamage = Mathf.Clamp(_dmg, 0, Health);
            NeonArena.Report(this, PhotonNetwork.Time - LastAttackerTime <= 15 ? LastAttackerViewId : 0, arenaDamage, false);
            Health -= _dmg;
            BreakNoDamageTaken();
        }
        public void ArenaStormDamage(int damage)
        {
            if (!NeonArenaFlow.Active || NeonArenaFlow.CombatBlocked || !HasSimulationAuthority || !IsAlive) return;
            LastAttackerViewId = 0; LastAttackerTime = 0; lastOfflineAttacker = null;
            Health -= damage;
            if (Health <= 0 && IsAlive) Die();
        }
        public virtual void HealHP(int _heal)
        {
            EffectData ed = GameDictionary.GetEffect(RoleBuffer.Heal.ToString());
            EffectEmitter.EmitParticle(ed.Particle, Vector3.zero, Vector3.zero, transform, MyForce);
            AudioPlayer.PlaySound(ed.Audio);
            Health += _heal;
        }
        public virtual void HealProportionOfHP(float _proportion)
        {
            EffectData ed = GameDictionary.GetEffect(RoleBuffer.Heal.ToString());
            EffectEmitter.EmitParticle(ed.Particle, Vector3.zero, Vector3.zero, transform, MyForce);
            AudioPlayer.PlaySound(ed.Audio);
            Health += Mathf.RoundToInt((MaxHealth * _proportion));
        }
        public virtual void SetProportionOfHP(float _proportion)
        {
            Health = Mathf.RoundToInt((MaxHealth * _proportion));
        }
        public virtual void ExtendMaxHP(int _value)
        {
            MaxHealth += _value;
            HealHP(_value);
        }
        protected virtual bool DeathCheck()
        {
            if (!HasSimulationAuthority) return !IsAlive;
            if (!IsAlive)
                return !IsAlive;
            if (Health <= 0)
            {
                ExecuteSkillTrigger(PSkillTriggerCondition.Die);
                if (!BuffersExist(RoleBuffer.Ghost))
                    Die();
                else
                    RemoveAllBufferExcept(RoleBuffer.Ghost);
            }
            else IsAlive = true;
            return !IsAlive;
        }

        [PunRPC]
        public void AddBuffer(int[] _typeArray, float[] _timeArray, float[] _value1Array, float[] _value2Array)//因為PunPRC要傳自訂類別或結構必須要另外註冊，所以改用此AddBuffer方法
        {
            if (!IsAlive)
                return;
            if (_typeArray != null && _timeArray != null && _value1Array != null && _value2Array != null && _typeArray.Length == _timeArray.Length && _typeArray.Length == _value1Array.Length && _typeArray.Length == _value2Array.Length)
            {
                for (int i = 0; i < _typeArray.Length; i++)
                {
                    RoleBuffer roleBuffer = (RoleBuffer)_typeArray[i];
                    AddBuffer(new BufferData(roleBuffer, _timeArray[i], _value1Array[i], _value2Array[i]));
                }
            }
            else
            {
                Debug.LogWarning("錯誤的RoleBuffer傳入值");
            }
        }
        public virtual void AddBuffer(RoleBuffer _bufferType, params float[] _values)
        {
            if (!IsAlive)
                return;
            if (_values.Length > 0 && _values[0] != 0)
            {
                switch (_values.Length)
                {
                    case 1:
                        AddBuffer(new BufferData(_bufferType, _values[0], 0, 0));
                        break;
                    case 2:
                        AddBuffer(new BufferData(_bufferType, _values[0], _values[1], 0));
                        break;
                    case 3:
                        AddBuffer(new BufferData(_bufferType, _values[0], _values[1], _values[2]));
                        break;
                    default:
                        Debug.LogWarning("傳入的buffer格式不正確");
                        break;
                }
            }
        }
        [PunRPC]
        public void TeleportToPos(int _type, float _radius)
        {
            // Select the random destination once; all clients receive the same position.
            if (!HasSimulationAuthority) return;
            EffectData ed = GameDictionary.GetEffect(RoleBuffer.Teleport.ToString());
            EffectEmitter.EmitParticle(ed.Particle, transform.position, Vector3.zero, null, MyForce);
            AudioPlayer.PlaySound(ed.Audio);
            Vector2 targetPos = Vector2.zero;
            switch (_type)
            {
                case 0:
                    targetPos = Circle.GetRandomPosInCircle(Vector2.zero, BattleManager.BM.SpawnRoleRadius);
                    break;
                case 1:
                    targetPos = (MyRigi.linearVelocity.normalized) * _radius + (Vector2)transform.position;
                    break;
                default:
                    targetPos = Circle.GetRandomPosInCircle(Vector2.zero, _radius);
                    break;
            }
            targetPos = AccessoryMotion.SafePoint(targetPos);
            if (PhotonNetwork.IsConnected)
                photonView.RPC("ApplyTeleport", RpcTarget.All, targetPos);
            else
                ApplyTeleport(targetPos);
        }
        [PunRPC]
        public void ApplyTeleport(Vector2 targetPos)
        {
            transform.position = targetPos;
            if (MyRigi != null) { MyRigi.position = targetPos; MyRigi.linearVelocity = Vector2.zero; }
            EffectData ed = GameDictionary.GetEffect(RoleBuffer.Teleport.ToString());
            if (ed != null)
            {
                EffectEmitter.EmitParticle(ed.Particle, transform.position, Vector3.zero, null, MyForce);
                AudioPlayer.PlaySound(ed.Audio);
            }
        }
        [PunRPC]
        public virtual bool AddBuffer(BufferData _buffer)
        {
            if (!IsAlive)
                return false;
            if (BuffersExist(ResistanceNegativeBuffs))//如果腳色身上有抵抗負面狀態效果的狀態
                if (System.Array.FindAll(NegativeBuffs, p => p == _buffer.Type).Length > 0)//如果要賦予的buffer屬於負面狀態就返回
                    return false;
            switch (_buffer.Type)
            {
                case RoleBuffer.Heal://Heal是直接補血不會加到狀態
                    HealProportionOfHP(_buffer.Value);
                    return false;
                case RoleBuffer.Teleport://Teleport是直接傳送腳色不會加到狀態
                    if (PhotonNetwork.IsConnected)
                    {
                        if (photonView.IsMine)
                            photonView.RPC("TeleportToPos", RpcTarget.All, (int)_buffer.Value, _buffer.Value2);
                    }
                    else
                        TeleportToPos((int)_buffer.Value, _buffer.Value2);
                    return false;
            }
            /*
            if (PhotonNetwork.IsConnected && photonView.IsMine)//將目前取得的資料記錄到Server上(已供後來加入的玩家進行同步)
            {
                PhotonTools.AddStringToUniqueStringProp(PhotonNetwork.LocalPlayer, PunCustomProp.Buffers, ((int)_buffer.Type).ToString());
            }
            */
            if (_buffer.Type == RoleBuffer.Stun && BufferTimers.TryGetValue(RoleBuffer.Stun, out float stunRemaining))
                _buffer.Time = SpeedBuffStack.StunDuration(stunRemaining, _buffer.Time);
            if (_buffer.Type == RoleBuffer.SpeedUp)
            {
                speedBuffs.Set((int)_buffer.Value2, _buffer.Time, _buffer.Value);
                _buffer = new BufferData(RoleBuffer.SpeedUp, speedBuffs.Remaining, speedBuffs.Total, 0);
            }
            if (Buffers.ContainsKey(_buffer.Type))
            {
                Buffers[_buffer.Type] = _buffer;
                BufferTimers[_buffer.Type] = _buffer.Time;
            }
            else
            {
                Buffers.Add(_buffer.Type, _buffer);
                BufferTimers[_buffer.Type] = _buffer.Time;
                //如果是循環狀態特效才產生追加特效並加到字典，若是非循環特效就先不處理，最後處理
                if ((System.Array.FindAll(NotLoopParticleBuffs, p => p == _buffer.Type).Length > 0) == false)
                {
                    ParticleSystem ps = EmitRoleBufferParticle(_buffer.Type);
                    if (ps)
                        BufferParticles.Add(_buffer.Type, ps);
                }
            }
            //如果是非循環狀態特效，要把特效持續時間設定為跟狀態時間一樣
            if (System.Array.FindAll(NotLoopParticleBuffs, p => p == _buffer.Type).Length > 0)//如果buffer不是循環特效
            {
                if (BufferParticles.ContainsKey(_buffer.Type))
                {
                    if (BufferParticles[_buffer.Type] == null)
                    {
                        ParticleSystem ps = EmitRoleBufferParticle(_buffer.Type);
                        BufferParticles[_buffer.Type] = ps;
                        //將特效持續時間改為Buffer時間，並重新播放
                        ParticleManager.SetParticlesDuration(ps, _buffer.Time);
                    }
                    else
                    {
                        DiscardNotLoopParticle(_buffer.Type);
                        ParticleSystem ps = EmitRoleBufferParticle(_buffer.Type);
                        if (ps)
                            BufferParticles.Add(_buffer.Type, ps);
                        //將特效持續時間改為Buffer時間，並重新播放
                        ParticleManager.SetParticlesDuration(ps, _buffer.Time);
                    }
                }
                else
                {
                    ParticleSystem ps = EmitRoleBufferParticle(_buffer.Type);
                    if (ps)
                        BufferParticles.Add(_buffer.Type, ps);
                    //將特效持續時間改為Buffer時間，並重新播放
                    ParticleManager.SetParticlesDuration(ps, _buffer.Time);
                }
            }
            BufferEffectChange(_buffer.Type, true, _buffer.Time);
            return true;
        }
        ParticleSystem EmitRoleBufferParticle(RoleBuffer _type)
        {
            if (!BufferParticles.ContainsKey(_type))
            {
                EffectData ed = GameDictionary.GetEffect(_type.ToString());
                if (ed != null)
                {
                    ParticleSystem ps = EffectEmitter.EmitParticle(ed.Particle, Vector3.zero, Vector3.zero, AppearanceObj.transform, MyForce).MyParticle;
                    if (NegativeBuffs.Contains(_type))
                        ps.transform.SetParent(transform);
                    else if (_type == RoleBuffer.MeleeDamageUp)
                        ps.transform.SetParent(TowardDirTrans);
                    ps.transform.localPosition = Vector3.zero;
                    ps.transform.localRotation = Quaternion.identity;
                    AudioPlayer.PlaySound(ed.Audio);
                    return ps;
                }
            }
            return null;
        }
        /// <summary>
        ///如果要移除的buffer不是循環特效那就不用移除此特效(因為此種類的特效有設定生命週期會自行移除)
        ///而是把該狀態特效所指定的特定子特效關閉(像流血特效就是身上流血效果會關閉，但血跡只是設定為不再產生粒子但不會被關閉)
        /// </summary>
        /// <param name="_type"></param>
        void DiscardNotLoopParticle(RoleBuffer _type)
        {
            switch (_type)
            {
                case RoleBuffer.Bleed:
                    if (BufferParticles[_type])
                    {
                        BufferParticles[_type].GetComponent<ParticleManager>().ActiveParticleGroup(false, 0);
                        BufferParticles[_type].GetComponent<ParticleManager>().SetIfEmitCertainParticles(false, 1);
                    }
                    break;
            }
            BufferParticles.Remove(_type);
        }
        public BufferData GetBuffer(RoleBuffer _type)
        {
            if (Buffers.ContainsKey(_type))
                return Buffers[_type];
            Debug.LogWarningFormat("{0}身上取不到{1}Buffer，在取Buffer之前要先確認有此Buffer", name, _type);
            return new BufferData(RoleBuffer.Absorb, 0, 0, 0);
        }
        public bool BuffersExist(params RoleBuffer[] _buffs)
        {
            for (int i = 0; i < _buffs.Length; i++)
            {
                if (Buffers.ContainsKey(_buffs[i]))
                    return true;
            }
            return false;
        }
        public bool BuffersExistExcept(RoleBuffer _except, params RoleBuffer[] _buffs)
        {
            for (int i = 0; i < _buffs.Length; i++)
            {
                if (_buffs[i] == _except)
                    continue;
                if (Buffers.ContainsKey(_buffs[i]))
                    return true;
            }
            return false;
        }
        public void RemoveAllBufferExcept(params RoleBuffer[] _exceptTypes)
        {
            List<RoleBuffer> removeTypes = Buffers.Keys.ToList();
            for (int i = 0; i < _exceptTypes.Length; i++)
            {
                removeTypes.Remove(_exceptTypes[i]);
            }
            RemoveBufferByTypes(removeTypes.ToArray());
        }
        public void RemoveSpeedSource(int source)
        {
            speedBuffs.Remove(source);
            UpdateSpeedAggregate();
        }
        void UpdateSpeedAggregate()
        {
            if (speedBuffs.Count == 0) { RemoveBufferByTypes_RPC(RoleBuffer.SpeedUp); return; }
            Buffers[RoleBuffer.SpeedUp] = new BufferData(RoleBuffer.SpeedUp, speedBuffs.Remaining, speedBuffs.Total, 0);
            BufferTimers[RoleBuffer.SpeedUp] = speedBuffs.Remaining;
        }
        public void RemoveAllBuffer()
        {
            RoleBuffer[] types = Buffers.Keys.ToArray();
            RemoveBufferByTypes(types);
            Buffers.Clear();
            speedBuffs.Clear();
            BufferTimers.Clear();
            PreciseBufferTimers.Clear();
        }
        [PunRPC]
        public void RemoveBufferByTypes_RPC(RoleBuffer _buffers)
        {
            if (_buffers == RoleBuffer.SpeedUp) speedBuffs.Clear();
            if (Buffers.ContainsKey(_buffers))
                Buffers.Remove(_buffers);
            BufferTimers.Remove(_buffers);
            PreciseBufferTimers.Remove(_buffers);
            if (BufferParticles.ContainsKey(_buffers))
            {
                if ((System.Array.FindAll(NotLoopParticleBuffs, p => p == _buffers).Length > 0) == false)//如果要移除的buffer循環特效那就移除此特效
                {
                    if (BufferParticles[_buffers])
                        Destroy(BufferParticles[_buffers].gameObject);
                    else
                        Debug.LogWarning(string.Format("特效被非預期的移除了，有可能是該buff特效沒有勾loop:{0}", _buffers));
                    BufferParticles.Remove(_buffers);
                }
                else
                {
                    DiscardNotLoopParticle(_buffers);
                }
            }
            BufferEffectChange(_buffers, false, 0);
        }
        public void RemoveBufferByTypes(params RoleBuffer[] _buffers)
        {
            for (int i = 0; i < _buffers.Length; i++)
            {
                if (_buffers[i] == RoleBuffer.SpeedUp) speedBuffs.Clear();
                if (Buffers.ContainsKey(_buffers[i]))
                    Buffers.Remove(_buffers[i]);
                BufferTimers.Remove(_buffers[i]);
                PreciseBufferTimers.Remove(_buffers[i]);

                if (BufferParticles.ContainsKey(_buffers[i]))
                {
                    if ((System.Array.FindAll(NotLoopParticleBuffs, p => p == _buffers[i]).Length > 0) == false)//如果要移除的buffer循環特效那就移除此特效
                    {
                        if (BufferParticles[_buffers[i]])
                            Destroy(BufferParticles[_buffers[i]].gameObject);
                        else
                            Debug.LogWarning(string.Format("特效被非預期的移除了，有可能是該buff特效沒有勾loop:{0}", _buffers[i]));
                        BufferParticles.Remove(_buffers[i]);
                    }
                    else
                    {
                        DiscardNotLoopParticle(_buffers[i]);
                    }
                }
                BufferEffectChange(_buffers[i], false, 0);
            }
        }

        public void RecordOfflineHit(Role attacker, int damage, List<BufferData> buffers)
        {
            if (PhotonNetwork.IsConnected || !IsAlive || attacker == null || attacker == this) return;
            bool harmful = damage > 0;
            if (buffers != null)
                foreach (BufferData buffer in buffers) harmful |= buffer.Type == RoleBuffer.Burn || buffer.Type == RoleBuffer.Bleed;
            if (!harmful) return;
            lastOfflineAttacker = attacker;
            LastAttackerTime = PhotonNetwork.Time;
        }
        public virtual void Die()
        {
            if (!HasSimulationAuthority || !IsAlive || NeonArenaFlow.CombatBlocked) return;
            Vector2 deathPosition = transform.position;
            int killerViewId = PhotonNetwork.Time - LastAttackerTime <= 15 ? LastAttackerViewId : 0;
            NeonArena.Report(this, killerViewId, 0, true);
            NetworkLifeRevision++;
            ApplyDeathPresentation();
            if (PhotonNetwork.IsConnected)
                photonView.RPC("NotifyDeath", RpcTarget.All, NetworkLifeRevision, killerViewId, GetDeathLootCount(), deathPosition);
            else
            {
                Role killer = PhotonNetwork.Time - LastAttackerTime <= 15 ? lastOfflineAttacker : null;
                if (GetDeathLootCount() > 0) LootSpawner.SpawnExpLoot(GetDeathLootCount(), deathPosition, killer != this ? killer : null);
                HandleMatchDeath();
            }
        }
        protected virtual int GetDeathLootCount() { return 0; }
        protected void BeginNewLife()
        {
            if (!HasSimulationAuthority) return;
            NetworkLifeRevision++;
            LastAttackerViewId = 0;
            lastOfflineAttacker = null;
            LastAttackerTime = 0;
            LastHealingHit.Clear();
        }
        void ApplyDeathPresentation()
        {
            IsAlive = false;
            health = 0;
            if (HealthImage != null) HealthImage.fillAmount = 0;
            if (DeathEffect != null) EffectEmitter.EmitParticle(DeathEffect, transform.position, Vector3.zero, null, MyForce);
            if (DeathSound != null) AudioPlayer.PlaySound(DeathSound);
            RemoveFeature();
            RemoveSkill();
            RemoveAllBuffer();
            gameObject.tag = "Untagged";
            if (MyRigi != null) MyRigi.linearVelocity = Vector2.zero;
            if (SelfCollider != null) SelfCollider.enabled = false;
            if (AppearanceObj != null) AppearanceObj.SetActive(false);
            Clamor(BattleManager.GetClamor(Name, ((int)ClamorText.ClamorType.Die).ToString()), ClamorText.ClamorType.Die);
        }
        void HandleMatchDeath()
        {
            if (BattleManager.BM == null || NeonArenaFlow.Active) return;
            if (PhotonLauncher.SelectGameType == GameType.Challenge)
            {
                BattleManager.BM.ConfirmChallengeDeath(this);
            }
            else if (this is PlayerRole && MyForce == Force.Player)
                BattleManager.BM.EndGame();
        }
        [PunRPC]
        public void NotifyDeath(int revision, int killerViewId, int dropCount, Vector2 position)
        {
            if (revision <= LastNotifiedDeath) return;
            LastNotifiedDeath = revision;
            if (revision >= NetworkLifeRevision)
            {
                NetworkLifeRevision = revision;
                if (IsAlive) ApplyDeathPresentation();
                HandleMatchDeath();
            }
            // Every client receives the same confirmed death. Only the scene authority
            // creates drops, and only the killer authority changes that player's score.
            PhotonView killerView = killerViewId != 0 ? PhotonView.Find(killerViewId) : null;
            Role killer = killerView != null ? killerView.GetComponent<Role>() : null;
            if (PhotonNetwork.IsMasterClient && dropCount > 0)
                LootSpawner.SpawnExpLoot(dropCount, position, killer != this ? killer : null);
            if (killer != null && killer != this && killerView.IsMine)
            {
                if (killer is PlayerRole)
                    PhotonTools.AddIntProp(PhotonNetwork.LocalPlayer, PunCustomProp.Kills, 1);
                killerView.RPC("OnKilling", RpcTarget.All, killer.Name, Name);
            }
        }

        public void SendNetworkHit(Role attacker, int damage, Vector2 force, string particle,
            Vector2 position, List<BufferData> buffers, int hitType, float vampireProportion = 0)
        {
            if (attacker == null || !attacker.photonView.IsMine) return;
            int count = buffers != null ? buffers.Count : 0;
            int[] types = new int[count];
            float[] times = new float[count], values = new float[count], values2 = new float[count];
            for (int i = 0; i < count; i++)
            {
                types[i] = (int)buffers[i].Type; times[i] = buffers[i].Time;
                values[i] = buffers[i].Value; values2[i] = buffers[i].Value2;
            }
            photonView.RPC("ReceiveNetworkHit", RpcTarget.All, attacker.photonView.ViewID,
                damage, force, particle ?? string.Empty, position, types, times, values, values2, hitType, vampireProportion);
        }
        [PunRPC]
        public void ReceiveNetworkHit(int attackerViewId, int damage, Vector2 force, string particle,
            Vector2 position, int[] types, float[] times, float[] values, float[] values2,
            int hitType, float vampireProportion, PhotonMessageInfo info)
        {
            if (!string.IsNullOrEmpty(particle))
            {
                // Resolve the caster on each client; a sender's Force enum is viewer-relative.
                var casterView=PhotonView.Find(attackerViewId);
                var caster=casterView?casterView.GetComponent<Role>():null;
                CallToEmitParticle(particle, position, caster?caster.MyForce:MyForce);
            }
            if (!HasSimulationAuthority || !IsAlive || NeonArenaFlow.CombatBlocked) return;
            if (types == null || times == null || values == null || values2 == null ||
                types.Length != times.Length || types.Length != values.Length || types.Length != values2.Length) return;
            bool harmful = damage > 0;
            for (int i = 0; i < types.Length; i++)
                harmful |= types[i] == (int)RoleBuffer.Burn || types[i] == (int)RoleBuffer.Bleed;
            if (harmful && attackerViewId != 0)
            {
                LastAttackerViewId = attackerViewId;
                LastAttackerTime = PhotonNetwork.Time;
            }
            int previousHealth = Health;
            int victimNetworkId = photonView.ViewID;
            int sequence = ++HitSequence;
            BeAttack(damage, force);
            if (IsAlive)
            {
                AddBuffer(types, times, values, values2);
                if (hitType == 1) ExecuteSkillTrigger(PSkillTriggerCondition.BeMeleeAttack);
                else if (hitType == 2) ExecuteSkillTrigger(PSkillTriggerCondition.BeSkillAttack);
            }
            int actualDamage = Mathf.Max(0, previousHealth - Health);
            int healing = Mathf.RoundToInt(actualDamage * Mathf.Clamp01(vampireProportion));
            if (healing > 0)
            {
                PhotonView attackerView = PhotonView.Find(attackerViewId);
                if (attackerView != null)
                    attackerView.RPCToAuthority("ConfirmLifeSteal", victimNetworkId, sequence, healing);
            }
        }
        [PunRPC]
        public void ConfirmLifeSteal(int victimViewId, int sequence, int heal, PhotonMessageInfo info)
        {
            if (!HasSimulationAuthority || !IsAlive || heal <= 0) return;
            if (LastHealingHit.TryGetValue(victimViewId, out int previous) && sequence <= previous) return;
            LastHealingHit[victimViewId] = sequence;
            HealHP(heal);
        }
        [PunRPC]
        public virtual void CastPrepareSkill(FeaturePart _part, int _featurePartSerialNumber)
        {
            if (!IsAlive)
                return;
            if (SkillDic.ContainsKey(_part))
            {
                //SkillDic[_part].GetComponent<IPrepareSkill>().SpawnPreparePrefab();
                Skill[] skills = SkillDic[_part].GetComponentsInChildren<Skill>();
                if (_featurePartSerialNumber >= 0 && _featurePartSerialNumber < skills.Length && skills[_featurePartSerialNumber] != null)
                    skills[_featurePartSerialNumber].GetComponent<IPrepareSkill>().SpawnPreparePrefab();
            }
            else
                Debug.LogWarning("沒有此部位技能(可能是腳色死亡後才接收到封包導致，無須理會):" + _part);
        }
        [PunRPC]
        public virtual void CastSkill(FeaturePart _part, int _featurePartSerialNumber, PhotonMessageInfo _info)
        {
            if (!IsAlive)
                return;
            if (SkillDic.ContainsKey(_part))
            {
                Skill[] skills = SkillDic[_part].GetComponentsInChildren<Skill>();
                if (_featurePartSerialNumber >= 0 && _featurePartSerialNumber < skills.Length && skills[_featurePartSerialNumber] != null)
                {
                    skills[_featurePartSerialNumber].Spell(_info);
                    //喊話
                    string triggerID = string.Format("spellclamor{0}", skills[_featurePartSerialNumber].MyFeatureDataID);
                    Clamor(BattleManager.GetClamor(Name, triggerID), ClamorText.ClamorType.Spell);
                }
            }
            else
                Debug.LogWarning("沒有此部位技能(可能是腳色死亡後才接收到封包導致，無須理會):" + _part);
        }
        /// <summary>
        /// 一般有連線時，技能施放都是呼叫RPC CastSkill來同步，但像Bomb這種有準備特效的技能，是呼叫RPC SkillSpawnAttackPrefab來同步
        /// </summary>
        [PunRPC]
        public virtual void SkillSpawnAttackPrefab(FeaturePart _part, int _featurePartSerialNumber, PhotonMessageInfo _info)
        {
            if (SkillDic.ContainsKey(_part))
            {
                float lag = (float)(PhotonNetwork.Time - _info.SentServerTime);
                Skill[] skills = SkillDic[_part].GetComponentsInChildren<Skill>();
                if (_featurePartSerialNumber >= 0 && _featurePartSerialNumber < skills.Length && skills[_featurePartSerialNumber] != null)
                {
                    skills[_featurePartSerialNumber].SpawnAttackPrefab(lag);
                    //喊話
                    string triggerID = string.Format("spellclamor{0}", skills[_featurePartSerialNumber].MyFeatureDataID);
                    Clamor(BattleManager.GetClamor(Name, triggerID), ClamorText.ClamorType.Spell);
                }
            }
            else
                Debug.LogWarning("沒有此部位技能:" + _part);
        }

        public int EquippedFeatureId(FeaturePart part) => FeatureDic.TryGetValue(part, out var feature) ? feature.ID : 0;

        public bool HasAccessory(int id)
        {
            foreach (var feature in FeatureDic.Values) if (feature.ID == id) return true;
            return false;
        }
        [PunRPC]
        public virtual void GetFeature(FeaturePart _part, int _featureDataID)
        {
            FeatureData data = FeatureData.GetFeatureData(_featureDataID);
            if (data == null)
                return;

            //新增技能
            if (SkillDic.ContainsKey(_part))
            {
                RemoveSkill(_part);
            }
            //喊話
            Clamor(BattleManager.GetClamor(Name, ((int)ClamorText.ClamorType.LevelUp).ToString()), ClamorText.ClamorType.LevelUp);
            Skill skillPrefab = Resources.Load<Skill>(string.Format("Gameobjects/Battle/Skill/{0}", data.SkillPrefabName));

            if (skillPrefab)
            {
                Skill mySkill = Instantiate(skillPrefab, transform);
                SkillDic.Add(_part, mySkill);
                PassiveSkillsDirty = true;
                //抓出所有技能一起初始化
                Skill[] skills = mySkill.GetComponentsInChildren<Skill>();
                for (int i = 0; i < skills.Length; i++)
                {
                    skills[i].Init(_part, data.MyFeatureType, data.ID, i);
                }
            }
            else
            {
                Debug.LogWarningFormat(string.Format("找不到Gameobjects/Battle/Skill/{0}", data.SkillPrefabName));
            }
            //新增部位
            if (FeatureDic.ContainsKey(_part))
            {
                RemoveFeature(_part);
            }
            FeatureDic.Add(_part, data);
            if ((_featureDataID == 11 || _featureDataID == 122 || _featureDataID == 117) && !GetComponent<AccessoryMotion>())
                gameObject.AddComponent<AccessoryMotion>();
            FeatureSpriteRenderer[(int)_part].sprite = data.IconSprite;
            Neon.Astral.FactionVisuals.Apply(transform, MyForce);
            if (GainFeatureSound) AudioPlayer.PlaySound(GainFeatureSound);
            if (GainFeatureEffect)
            {
                ParticleSystem ps = EffectEmitter.EmitParticle(GainFeatureEffect, Vector3.zero, Vector3.zero, transform, MyForce).GetComponent<ParticleSystem>();
                var renderer = ps.GetComponentInChildrenExcludeSelf<Renderer>();
                renderer.material.SetTexture("_MainTex", FeatureData.GetIconSprite(_featureDataID).texture);
                ps.Play();
            }
        }
        public virtual void RemoveSkill(FeaturePart _part)
        {
            if (SkillDic.ContainsKey(_part))
            {
                /*
                if (SkillDic[_part].GetType().IsAssignableFrom(typeof(PassiveSkill)))//有些技能被移除後會移除給予的常駐狀態(目前的寫法狀態無法堆疊，且編輯錯誤容易出錯，如果之後有要擴充功能再進行優化)
                {
                    if (((PassiveSkill)SkillDic[_part]).CheckIfRemoveAssignedBuffer())
                        switch (SkillDic[_part].MyFeatureType)
                        {
                            case FeatureType.EnemyDirection:
                                RemoveBufferByTypes(RoleBuffer.TargetIndicate);
                                break;
                        }
                }
                 */
                foreach (var skill in SkillDic[_part].GetComponentsInChildren<PassiveSkill>())
                    RemoveSpeedSource(1 + (int)skill.MyFeaturePart * 256 + skill.FeaturePartSerialNumber);
                SkillDic[_part].SelfDestroy();
                SkillDic.Remove(_part);
                PassiveSkillsDirty = true;
            }
            else
            {
                Debug.LogWarningFormat("無此Skill Key：{0}", _part);
            }
        }
        public virtual void RemoveSkill()
        {
            List<FeaturePart> list = new List<FeaturePart>(SkillDic.Keys);
            for (int i = 0; i < list.Count; i++)
            {
                RemoveSkill(list[i]);
            }
            SkillDic.Clear();
        }
        public virtual void RemoveFeature(FeaturePart _part)
        {
            FeatureDic.Remove(_part);
            switch (_part)
            {
                case FeaturePart.Head:
                    FeatureSpriteRenderer[(int)FeaturePart.Head].sprite = FeatureData.DefaultHeadSprite;
                    break;
                case FeaturePart.Body:
                    FeatureSpriteRenderer[(int)FeaturePart.Body].sprite = FeatureData.DefaultBodySprite;
                    break;
                case FeaturePart.Back:
                    FeatureSpriteRenderer[(int)FeaturePart.Back].sprite = null;
                    break;
            }
        }
        public virtual void RemoveFeature()
        {
            FeatureDic.Clear();
            //重置腳色圖形
            if (FeatureSpriteRenderer == null || FeatureSpriteRenderer.Length != 3)
                return;
            FeatureSpriteRenderer[(int)FeaturePart.Head].sprite = FeatureData.DefaultHeadSprite;
            FeatureSpriteRenderer[(int)FeaturePart.Body].sprite = FeatureData.DefaultBodySprite;
            FeatureSpriteRenderer[(int)FeaturePart.Back].sprite = null;
        }
        //攻擊敵人後會有反作用力在自己身上，所以會被擊退
        public void Counterforce(Vector3 _forceDir)
        {
            Vector2 force = Vector2.zero;
            force = _forceDir * SelfKnockForce * -1;
            AddBuffer(new BufferData(RoleBuffer.Stun, MeleeSelfStunTime, 0, 0));
            BeKnock(force);
        }
        public void ReplacePlayerAttack(bool _replace, Transform _newAttackTrans)
        {
            if (_replace)
            {
                AttackCollider.enabled = false;
                Vector3 pos = _newAttackTrans.localPosition;
                _newAttackTrans.SetParent(AttackCollider.transform);
                _newAttackTrans.localPosition = pos;
                _newAttackTrans.localScale = Vector3.one;
                _newAttackTrans.localRotation = Quaternion.identity;
            }
            else
            {
                AttackCollider.enabled = true;
            }
        }
        #endregion

        #region Private Func
        protected virtual void GetProperties()
        {
            if (UseJsonData)
            {
                BaseMoveSpeed = GameSettingData.MoveSpeed;
                MeleeStunTime = GameSettingData.MeleeStunTime;
                MeleeSelfStunTime = GameSettingData.MeleeSelfSturnTime;
                BumpStunTime = GameSettingData.BumpSturnTime;
            }
            //追加肉搏可以暈眩的狀態
            PlayerAttack pa = GetComponentInChildren<PlayerAttack>();
            if (pa != null)
                pa.AddStunBuffers(MeleeStunTime);
            //追加肉搏可以暈眩的狀態
            Bump bump = GetComponent<Bump>();
            if (bump != null)
                bump.AddStunBuffers(BumpStunTime);
        }
        protected virtual void BufferTimerFunc()
        {
            if (speedBuffs.Count > 0) { speedBuffs.Tick(Time.deltaTime); UpdateSpeedAggregate(); }
            BufferKeysScratch.Clear();
            BufferKeysScratch.AddRange(Buffers.Keys);
            ExpiredBuffersScratch.Clear();
            for (int i = 0; i < BufferKeysScratch.Count; i++)
            {
                RoleBuffer type = BufferKeysScratch[i];
                if (type == RoleBuffer.SpeedUp) continue;
                if (!Buffers.ContainsKey(type) || !BufferTimers.TryGetValue(type, out float remain)) continue;
                if (PreciseBufferTimers.TryGetValue(type, out PreciseTimer timer) && timer != null)
                    timer.RunTimer(ref remain);
                else remain -= Time.deltaTime;
                // A damage timer can kill this role and clear all buffers during its callback.
                if (!Buffers.ContainsKey(type)) continue;
                BufferTimers[type] = remain;
                if (remain <= 0) ExpiredBuffersScratch.Add(type);
            }
            for (int i = 0; i < ExpiredBuffersScratch.Count; i++)
                RemoveBufferByTypes_RPC(ExpiredBuffersScratch[i]);
        }
        protected virtual void BufferEffectChange(RoleBuffer _buffer, bool _add, float _remainTime)
        {
            switch (_buffer)
            {
                case RoleBuffer.Burn:
                    if (_add)
                    {
                        if (PreciseBufferTimers.ContainsKey(_buffer))
                            PreciseBufferTimers[_buffer] = new PreciseTimer(GameSettingData.BurnTriggerInterval, _remainTime, Burn, true, true);
                        else
                            PreciseBufferTimers.Add(_buffer, new PreciseTimer(GameSettingData.BurnTriggerInterval, _remainTime, Burn, true, true));
                        Burn();
                    }
                    else
                    {
                        if (PreciseBufferTimers.ContainsKey(_buffer) && PreciseBufferTimers[_buffer] != null)
                            PreciseBufferTimers[_buffer] = null;
                    }
                    break;
                case RoleBuffer.Bleed:
                    if (_add)
                    {
                        if (PreciseBufferTimers.ContainsKey(_buffer))
                            PreciseBufferTimers[_buffer] = new PreciseTimer(GameSettingData.BleedTriggerInterval, _remainTime, Bleed, true, true);
                        else
                            PreciseBufferTimers.Add(_buffer, new PreciseTimer(GameSettingData.BleedTriggerInterval, _remainTime, Bleed, true, true));
                        Bleed();
                    }
                    else
                    {
                        if (PreciseBufferTimers.ContainsKey(_buffer) && PreciseBufferTimers[_buffer] != null)
                            PreciseBufferTimers[_buffer] = null;
                    }
                    break;
                case RoleBuffer.OutsideCurse:
                    if (_add)
                    {
                        if (PreciseBufferTimers.ContainsKey(_buffer))
                            PreciseBufferTimers[_buffer] = new PreciseTimer(GameSettingData.OutsideCurseTriggerInterval, _remainTime, OutsideCurse, true, true);
                        else
                            PreciseBufferTimers.Add(_buffer, new PreciseTimer(GameSettingData.OutsideCurseTriggerInterval, _remainTime, OutsideCurse, true, true));
                        OutsideCurse();
                    }
                    else
                    {
                        if (PreciseBufferTimers.ContainsKey(_buffer) && PreciseBufferTimers[_buffer] != null)
                            PreciseBufferTimers[_buffer] = null;
                    }
                    break;
                case RoleBuffer.Freeze:
                    // Cold now slows movement only; attacks continue at their normal rate.
                    break;
                case RoleBuffer.Ghost:
                    if (RoleAniPlayer != null)
                        if (_add)
                        {
                            RoleAniPlayer.Play("Buffer-" + _buffer.ToString(), "Buffer", 0);
                        }
                        else
                            RoleAniPlayer.Play("Buffer-" + "Default", "Buffer", 0);
                    break;
                case RoleBuffer.Invisible:
                    if (RoleAniPlayer != null)
                        if (_add)
                        {
                            if (PhotonNetwork.IsConnected)
                            {
                                if (photonView.IsMine && MyForce == Force.Player)
                                {
                                    RoleAniPlayer.Play_NoPlayback("Buffer-" + _buffer.ToString() + "SelfView", "Buffer", 0);
                                }
                                else
                                {
                                    WaitToBeInvisibleTimer.StartRunTimer = true;
                                    RoleAniPlayer.Play_NoPlayback("Buffer-" + _buffer.ToString(), "Buffer", 0);
                                }

                            }
                            else
                            {
                                if (MyForce == Force.Player)
                                {
                                    AppearanceObj.SetActive(true);
                                    RoleAniPlayer.Play_NoPlayback("Buffer-" + _buffer.ToString() + "SelfView", "Buffer", 0);
                                }
                                else
                                {
                                    WaitToBeInvisibleTimer.StartRunTimer = true;
                                    RoleAniPlayer.Play_NoPlayback("Buffer-" + _buffer.ToString(), "Buffer", 0);
                                }
                            }
                        }
                        else
                        {
                            WaitToBeInvisibleTimer.StartRunTimer = false;
                            WaitToBeInvisibleTimer.RestartCountDown();
                            AppearanceObj.SetActive(true);
                            RoleAniPlayer.Play("Buffer-" + "Default", "Buffer", 0);
                        }

                    break;
                case RoleBuffer.Absorb:
                    if (MyLootAbsorber != null)
                        if (_add)
                            MyLootAbsorber.SetAbsorbRange(Mathf.RoundToInt(GetBuffer(RoleBuffer.Absorb).Value));
                        else
                            MyLootAbsorber.SetDontAbsorb();
                    break;
                case RoleBuffer.Immortal:
                    if (_add)
                        RemoveBufferByTypes(NegativeBuffs);
                    break;
            }
        }
        void ExecuteInvisible()
        {
            AppearanceObj.SetActive(false);
        }
        //被擊退時會改變摩擦力(通常是調小)，這樣才可以擊退比較遠
        protected void ChangeToKnockDrag()
        {
            if (DragTimer != null)
            {
                DragTimer.RestartCountDown();
                DragTimer.StartRunTimer = true;
                MyRigi.linearDamping = KnockDrag;
            }
        }
        //被擊退一段時間後會把擊退摩擦力改回正常摩擦力
        protected void DragRecovery()
        {
            if (!DragTimer.StartRunTimer)
            {
                MyRigi.linearDamping = NormalDrag;
            }
        }
        //尋找最近的敵人
        protected virtual Role FindClosestOpponent()
        {
            return ClosestOpponent;
        }
        //尋找最近的ShootAmmo(考量到效能問題，擁有DetectType為Ammo或Both的技能的腳色才會每偵執行)
        public virtual ShootAmmo FindClosestShootAmmo()
        {
            return GameobjectFinder.FindClosestShootAmmo(gameObject);
        }
        public void ExecuteSkillTrigger(PSkillTriggerCondition condition)
        {
            if (!HasSimulationAuthority || !IsAlive || ApplyingNetworkState) return;
            if (PassiveSkillsDirty)
            {
                var skills = new List<PassiveSkill>();
                foreach (Skill skill in SkillDic.Values)
                    if (skill != null) skills.AddRange(skill.GetComponentsInChildren<PassiveSkill>());
                CachedPassiveSkills = skills.ToArray();
                PassiveSkillsDirty = false;
            }
            // Trigger callbacks may replace a skill; keep this invocation's stable array.
            PassiveSkill[] current = CachedPassiveSkills;
            for (int i = 0; i < current.Length; i++)
                if (current[i] != null) current[i].Trigger(condition);
        }
        public virtual void SelfDestroy()
        {
            if (PhotonNetwork.IsConnected)
            {
                if (photonView.IsMine)
                {
                    PhotonNetwork.Destroy(gameObject);
                }
                else
                    AppearanceObj.SetActive(false);
            }
            else
                Destroy(gameObject);
        }
        protected void Stay()//進入閒置狀態時執行(沒移動也沒受到攻擊一段時間)
        {
            IsStay = true;
            StayTimer.StartRunTimer = false;
        }
        protected void BreakStay()//解除閒置狀態時執行
        {
            ExecuteSkillTrigger(PSkillTriggerCondition.BreakStay);
            IsStay = false;
            if (StayTimer != null)
            {
                StayTimer.RestartCountDown();
                StayTimer.StartRunTimer = true;
            }
        }
        protected void NoDamageTaken()//沒受到傷害一段時間後執行
        {
            IsNoDamageTaken = true;
            NoDamageTakenTimer.StartRunTimer = false;
        }
        protected void BreakNoDamageTaken()//沒受到傷害後若又受到傷害執行
        {
            if (NoDamageTakenTimer == null)
                return;
            if (IsNoDamageTaken)
                ExecuteSkillTrigger(PSkillTriggerCondition.BreakNoDamageTaken);
            IsNoDamageTaken = false;
            NoDamageTakenTimer.RestartCountDown();
            NoDamageTakenTimer.StartRunTimer = true;
        }
        protected void Burn()
        {
            if (!HasSimulationAuthority || ApplyingNetworkState) return;
            int damage = Mathf.RoundToInt((MaxHealth * GameSettingData.BurnDamage));
            ReceiveDmg(damage);
        }
        protected void Bleed()
        {
            if (!HasSimulationAuthority || ApplyingNetworkState) return;
            int damage = Mathf.RoundToInt((MaxHealth * GameSettingData.BleedDamage));
            ReceiveDmg(damage);
        }
        protected void OutsideCurse()
        {
            if (!HasSimulationAuthority || ApplyingNetworkState) return;
            int damage = Mathf.RoundToInt((MaxHealth * GameSettingData.OutsideCurseDamage));
            ReceiveDmg(damage);
        }
        #endregion

        public virtual RoleNetworkState CaptureNetworkState()
        {
            var state = new RoleNetworkState
            {
                health = Health, maxHealth = MaxHealth, level = LV, alive = IsAlive, lifeRevision = NetworkLifeRevision,
                moveDirection = Movetorward, arrowAngle = ArrowAngle, name = Name, id = ID,
                title = TitleLabel != null ? TitleLabel.text : string.Empty,
                head = FeatureDic.ContainsKey(FeaturePart.Head) ? FeatureDic[FeaturePart.Head].ID : 0,
                body = FeatureDic.ContainsKey(FeaturePart.Body) ? FeatureDic[FeaturePart.Body].ID : 0,
                back = FeatureDic.ContainsKey(FeaturePart.Back) ? FeatureDic[FeaturePart.Back].ID : 0,
                buffs = new RoleBufferState[Buffers.Count - (Buffers.ContainsKey(RoleBuffer.SpeedUp) ? 1 : 0) + speedBuffs.Count]
            };
            int index = 0;
            foreach (var pair in Buffers)
            {
                if (pair.Key == RoleBuffer.SpeedUp) continue;
                state.buffs[index++] = new RoleBufferState { type = (int)pair.Key,
                    time = BufferTimers.ContainsKey(pair.Key) ? BufferTimers[pair.Key] : pair.Value.Time,
                    value = pair.Value.Value, value2 = pair.Value.Value2 };
            }
            foreach (var entry in speedBuffs.Entries)
                state.buffs[index++] = new RoleBufferState { type = (int)RoleBuffer.SpeedUp,
                    time = entry.Remaining, value = entry.Value, value2 = entry.Source };
            return state;
        }

        public virtual void ApplyNetworkState(RoleNetworkState state)
        {
            if (state == null || !IsInit || HasSimulationAuthority || state.lifeRevision < NetworkLifeRevision) return;
            NetworkLifeRevision = state.lifeRevision;
            ApplyingNetworkState = true;
            try
            {
                // Late joiners render the current state without replaying past deaths.
                bool wasAlive = IsAlive;
                MaxHealth = Mathf.Max(1, state.maxHealth);
                LV = Mathf.Max(1, state.level);
                health = Mathf.Clamp(state.health, 0, MaxHealth);
                if (wasAlive && !state.alive && HasAppliedNetworkState)
                {
                    ApplyDeathPresentation();
                    HandleMatchDeath();
                }
                IsAlive = state.alive;
                ID = state.id;
                Name = state.name ?? string.Empty;
                if (NameLabel != null) { NameLabel.text = Name; NameLabel.gameObject.SetActive(!string.IsNullOrEmpty(Name)); }
                if (TitleLabel != null) { TitleLabel.text = state.title ?? string.Empty; TitleLabel.gameObject.SetActive(!string.IsNullOrEmpty(state.title)); }
                Movetorward = state.moveDirection;
                ArrowAngle = state.arrowAngle;
                if (TowardDirTrans != null) TowardDirTrans.rotation = Quaternion.Euler(0, 0, ArrowAngle);
                if (HealthImage != null) HealthImage.fillAmount = HealthRatio;
                gameObject.tag = IsAlive ? MyForce.ToString() : "Untagged";
                if (SelfCollider != null) SelfCollider.enabled = IsAlive;
                if (!IsAlive)
                {
                    if (SkillDic.Count > 0) RemoveSkill();
                    if (FeatureDic.Count > 0) RemoveFeature();
                    if (Buffers.Count > 0) RemoveAllBuffer();
                    if (AppearanceObj != null) AppearanceObj.SetActive(false);
                    return;
                }
                if (!wasAlive && AppearanceObj != null) AppearanceObj.SetActive(true);
                ApplyNetworkFeature(FeaturePart.Head, state.head);
                ApplyNetworkFeature(FeaturePart.Body, state.body);
                ApplyNetworkFeature(FeaturePart.Back, state.back);
                var active = new HashSet<RoleBuffer>();
                speedBuffs.Clear();
                if (state.buffs != null)
                    foreach (var item in state.buffs)
                    {
                        var type = (RoleBuffer)item.type;
                        if (item.time <= 0 || !System.Enum.IsDefined(typeof(RoleBuffer), type)) continue;
                        active.Add(type);
                        if (type == RoleBuffer.SpeedUp)
                        {
                            speedBuffs.Set((int)item.value2, item.time, item.value);
                            continue;
                        }
                        if (!Buffers.ContainsKey(type))
                            AddBuffer(new BufferData(type, item.time, item.value, item.value2));
                        else
                        {
                            Buffers[type] = new BufferData(type, item.time, item.value, item.value2);
                            BufferTimers[type] = item.time;
                        }
                    }
                if (speedBuffs.Count > 0) UpdateSpeedAggregate();
                var removed = new List<RoleBuffer>();
                foreach (var type in Buffers.Keys) if (!active.Contains(type)) removed.Add(type);
                RemoveBufferByTypes(removed.ToArray());
                float growth = Mathf.Min((LV - 1) * GameSettingData.GrowthSizeRatio, GameSettingData.GrowthMaxSizeRatio);
                if (!(this is GodRole) && AppearanceObj != null) AppearanceObj.transform.localScale = Vector3.one * (1 + growth);
            }
            finally { ApplyingNetworkState = false; HasAppliedNetworkState = true; }
        }

        void ApplyNetworkFeature(FeaturePart part, int featureId)
        {
            int existing = FeatureDic.ContainsKey(part) ? FeatureDic[part].ID : 0;
            if (existing == featureId) return;
            if (featureId > 0) GetFeature(part, featureId);
            else
            {
                if (SkillDic.ContainsKey(part)) RemoveSkill(part);
                RemoveFeature(part);
            }
        }

        #region Photon Callbacks

        public virtual void OnPhotonSerializeView(PhotonStream stream, PhotonMessageInfo info)
        {
            if (stream.IsWriting)
            {
                stream.SendNext(Health);
                stream.SendNext(Movetorward);
            }
            else
            {
                Health = (int)stream.ReceiveNext();
                Movetorward = (Vector3)stream.ReceiveNext();
            }
        }
        #endregion
    }
}
