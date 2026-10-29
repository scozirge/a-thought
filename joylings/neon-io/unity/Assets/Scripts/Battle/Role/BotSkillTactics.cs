using UnityEngine;
using Neon.Networking;

namespace Starbro.NeonIO
{
    // Read the live skill/prefab parameters, without a parallel balance table.
    public struct BotSkillTactics
    {
        public bool Offensive, Ranged, Homing, Returning, Area, TargetArea, Trail, Contact, Persistent, Control, Defensive, Recovery, Sustain, QuietRecovery, StationaryRecovery, Harvest;
        public bool Slow, Stun, Weaken, Knockback, Protection, Concealment, Mobility, MeleePower;
        public bool Reactive, DeathOnly, MeleeTrigger, MeleeSustain, RangedSustain, LootRecovery, QuietBenefit;
        public DirectionPatetern Pattern;
        public float Range, Speed, Acceleration, StartAngle, AngleStep, Delay, Weight, Cycle, BurstDuration, QuietDelay, StunTime;
        public int Shots;
        // An on-hit/retaliation projectile is a payoff, not a weapon that can open an engagement.
        public bool IndependentOffense => (Offensive || Slow || Stun || Weaken) && !Reactive && !DeathOnly && !Trail;
        public bool Poke => IndependentOffense && !Contact && (Ranged || TargetArea);
        public bool SetupControl => Slow || StunTime >= .75f;
        public float Power => Weight * (1 + Mathf.Min(5, Mathf.Max(0, Shots - 1)) * .12f) / (1 + Cycle * .12f);
        public BotSkillTactics WithAccessory(int id)
        {
            var value = this;
            // AccessoryMotion implements this teleport outside the serialized SelfBuffers.
            if (id == 117) value.Defensive = value.Mobility = true;
            return value;
        }
        public bool FixedLane => Ranged && !Homing && !Area &&
            (Pattern == DirectionPatetern.Default || Pattern == DirectionPatetern.LeftRight || Pattern == DirectionPatetern.TopDown);
        public void ReadAmmo(Ammo ammo, float offset = 0)
        {
            if (!ammo) return;
            Offensive = ammo.FixedDamage >= 0 ? ammo.FixedDamage > 0 : ammo.ValuePercent > 0;
            Control = ammo.BotControl;
            Slow = ammo.BotHasEffect(RoleBuffer.Freeze); Stun = ammo.BotHasEffect(RoleBuffer.Stun);
            StunTime = ammo.BotEffectDuration(RoleBuffer.Stun);
            Weaken = ammo.BotHasEffect(RoleBuffer.Sick); Knockback = ammo.BotKnockback;
            if (ammo is MeleeAmmo melee) { Protection |= melee.BotDefense; Defensive |= melee.BotDefense; Offensive &= melee.BotDamage; }
            if (Control && !Offensive) Defensive = true;
            Weight = Mathf.Clamp(ammo.FixedDamage >= 0 ? ammo.FixedDamage / 100f : ammo.ValuePercent, .3f, 3);
            Range = Mathf.Max(80, offset + ammo.BotRadius);
            if (ammo is ShootAmmo shot)
            {
                Ranged = true; Speed = shot.BotSpeed; Acceleration = shot.BotAcceleration;
                Homing = shot.BotHoming; Returning = shot.BotReturning;
                // Some control is carried by the explosion, not the travelling projectile.
                if (shot.BotExplosion)
                {
                    Slow |= shot.BotExplosion.BotHasEffect(RoleBuffer.Freeze);
                    Stun |= shot.BotExplosion.BotHasEffect(RoleBuffer.Stun);
                    StunTime = Mathf.Max(StunTime, shot.BotExplosion.BotEffectDuration(RoleBuffer.Stun));
                    Weaken |= shot.BotExplosion.BotHasEffect(RoleBuffer.Sick);
                    Knockback |= shot.BotExplosion.BotKnockback;
                    Control |= Slow || Stun || Weaken || Knockback;
                }
                Range = Mathf.Max(Range, shot.BotTravelRange);
            }
        }
    }
    public partial class Skill
    {
        public virtual BotSkillTactics BotTactics => default;
        public virtual float BotCooldown => IsWaitingForSpell ? WaitToSpellTime : 0;
        public virtual bool BotDefenseEligible => true;
        bool botCast;
        Vector3 botPoint, botFacing;
        Role botTarget;
        protected Vector3 BotAttackPosition => botCast ? botPoint : GetTargetPos();
        protected Vector3 BotFacing => botCast ? botFacing : Myself.Movetorward;
        protected Role BotAttackTarget => botCast ? botTarget : TargetRole;
        internal void SetBotCast(Vector3 point, Vector3 facing, Role target)
        { botCast = true; botPoint = point; botFacing = facing; botTarget = target; }
        // Passive triggers remain automatic; tactics never bypass their cooldown/conditions.
        protected void RequestSpell()
        {
            if (Myself is NeutralRole seat && seat.IsArenaPlayerSeat && seat.HasSimulationAuthority)
            {
                var brain = seat.ArenaBrain;
                brain.NotifyCast(this);
                Role target = brain.Target;
                Vector3 point = brain.AimPoint(this);
                Vector3 facing = seat.Movetorward;
                if (PhotonNetwork.IsConnected)
                    seat.photonView.RPC("CastBotSkill", RpcTarget.All, MyFeaturePart, FeaturePartSerialNumber,
                        MyFeatureDataID, target ? target.photonView.ViewID : 0, point, facing);
                else { SetBotCast(point, facing, target); Spell(new PhotonMessageInfo()); }
                return;
            }
            if (PhotonNetwork.IsConnected)
                Myself.photonView.RPC("CastSkill", RpcTarget.All, MyFeaturePart, FeaturePartSerialNumber);
            else Spell(new PhotonMessageInfo());
        }
    }
    public partial class Attack
    {
        public override float BotCooldown => AttackOnce && SpellTimes > 0 ? 0 : IsWaitingForSpell ? WaitToSpellTime : OnCD ? Mathf.Max(0, Timer) : 0;
        public override BotSkillTactics BotTactics => new BotSkillTactics
        {
            Pattern = Patetern, StartAngle = StartAngle, Shots = 1, Delay = WaitToSpellTime,
            Range = DetecteRadius > 0 ? DetecteRadius : 500, Area = SpawnAtTargetPos, TargetArea = SpawnAtTargetPos, Weight = 1, Cycle = Interval
        };
        protected BotSkillTactics LimitBotRange(BotSkillTactics t)
        { if (DetecteRadius > 0) t.Range = Mathf.Min(t.Range, DetecteRadius); return t; }
    }
    public partial class Shoot
    {
        public override BotSkillTactics BotTactics
        {
            get
            {
                var t = base.BotTactics; t.ReadAmmo(AttackPrefab);
                t.StartAngle = Myself ? OriginalStartAngle : StartAngle; t.Shots = AmmoNum; t.AngleStep = AngleInterval;
                t.BurstDuration = Mathf.Max(0, AmmoNum - 1) * AmmoInterval;
                return LimitBotRange(t);
            }
        }
    }
    public partial class Melee
    {
        public override BotSkillTactics BotTactics
        {
            get
            {
                var t = base.BotTactics; t.ReadAmmo(AttackPrefab, AttackRadius); t.Contact = true; t.Area = true;
                t.Persistent = AttackOnce || AttackPrefab && AttackPrefab.BotLifetime > 30;
                t.Defensive |= DetectedTargetType != TargetType.Role || MyFeatureDataID == 25;
                return LimitBotRange(t);
            }
        }
    }
    public partial class Bomber
    {
        public override BotSkillTactics BotTactics
        {
            get
            {
                var t = base.BotTactics; t.ReadAmmo(AttackPrefab); t.Delay += PrepareTime;
                t.Area = true; t.Trail = !SpawnAtTargetPos && !SpawnedInSelf;
                t.Contact = !SpawnAtTargetPos && !t.Trail;
                if (SpawnAtTargetPos) t.Range = DetecteRadius > 0 ? DetecteRadius : 500;
                return LimitBotRange(t);
            }
        }
    }
    public partial class PassiveSkill
    {
        public override float BotCooldown => IsCooldown && CDTimer != null ? CDTimer.CurTimer : 0;
        float BotHealthThreshold => ValueList != null && ValueList.Count > 1 ? ValueList[1] : HPBelowRatio;
        public bool BotRecoveryAvailable => TriggerType != PSkillTriggerCondition.HPBelow || Myself && Myself.HealthRatio <= BotHealthThreshold;
        public override bool BotDefenseEligible => TriggerType != PSkillTriggerCondition.Die &&
            (TriggerType != PSkillTriggerCondition.HPBelow && TriggerType != PSkillTriggerCondition.BeAttackHPBelow ||
             Myself && Myself.HealthRatio <= BotHealthThreshold);
        public override BotSkillTactics BotTactics
        {
            get
            {
                var t = new BotSkillTactics { Range = 100, Shots = 1, Weight = .5f, Delay = WaitToSpellTime,
                    Cycle = ValueList != null && ValueList.Count > 0 ? ValueList[0] : 0 };
                t.MeleeTrigger = t.Contact = TriggerType == PSkillTriggerCondition.MeleeAttack;
                t.DeathOnly = TriggerType == PSkillTriggerCondition.Die;
                t.Reactive = TriggerType != PSkillTriggerCondition.Cycle && TriggerType != PSkillTriggerCondition.StartOnce &&
                    TriggerType != PSkillTriggerCondition.NoDamageTaken && TriggerType != PSkillTriggerCondition.Stay;
                t.Harvest = TriggerType == PSkillTriggerCondition.GainExp || MyFeatureDataID == 11 || MyFeatureDataID == 122;
                if (SelfBuffers != null) foreach (var buff in SelfBuffers)
                {
                    if (buff.Type == RoleBuffer.MeleeDamageUp) t.MeleePower = t.Contact = true;
                    if (buff.Type == RoleBuffer.Heal || buff.Type == RoleBuffer.Recover) t.Recovery = true;
                    if (buff.Type == RoleBuffer.Immortal || buff.Type == RoleBuffer.Block || buff.Type == RoleBuffer.Invisible ||
                        buff.Type == RoleBuffer.Ghost || buff.Type == RoleBuffer.Teleport) t.Defensive = true;
                    if (buff.Type == RoleBuffer.Immortal || buff.Type == RoleBuffer.Block) t.Protection = true;
                    if (buff.Type == RoleBuffer.Invisible) t.Concealment = true;
                    if (buff.Type == RoleBuffer.SpeedUp || buff.Type == RoleBuffer.Teleport) t.Mobility = true;
                }
                t.QuietBenefit = TriggerType == PSkillTriggerCondition.NoDamageTaken;
                t.QuietDelay = t.QuietBenefit && ValueList != null && ValueList.Count > 1 ? ValueList[1] : 0;
                t.QuietRecovery = t.Recovery && t.QuietBenefit;
                t.StationaryRecovery = t.Recovery && TriggerType == PSkillTriggerCondition.Stay;
                t.Sustain = t.Recovery && (TriggerType == PSkillTriggerCondition.AllAttack || TriggerType == PSkillTriggerCondition.SkillAttack ||
                    TriggerType == PSkillTriggerCondition.MeleeAttack);
                t.MeleeSustain = t.Sustain && TriggerType != PSkillTriggerCondition.SkillAttack;
                t.RangedSustain = t.Sustain && TriggerType != PSkillTriggerCondition.MeleeAttack;
                t.LootRecovery = t.Recovery && TriggerType == PSkillTriggerCondition.GainExp;
                if (t.Sustain || t.LootRecovery || TriggerType == PSkillTriggerCondition.BeAttack || TriggerType == PSkillTriggerCondition.BeAttackHPBelow)
                    t.Recovery = false;
                // Death-only effects cannot be planned as an available escape in elimination mode.
                if (t.DeathOnly) t.Recovery = t.Defensive = t.Protection = t.Concealment = t.Mobility = false;
                return t.WithAccessory(MyFeatureDataID);
            }
        }
    }
    public partial class PassiveShoot
    {
        public override BotSkillTactics BotTactics
        {
            get
            {
                var t = base.BotTactics; t.ReadAmmo(AttackPrefab); t.Pattern = Patetern;
                t.TargetArea = SpawnAtTargetPos;
                t.StartAngle = Myself ? OriginalStartAngle : StartAngle; t.Shots = AmmoNum; t.AngleStep = AngleInterval;
                t.BurstDuration = Mathf.Max(0, AmmoNum - 1) * AmmoInterval;
                return t;
            }
        }
    }
    public partial class PassiveMelee
    {
        public override BotSkillTactics BotTactics
        {
            get
            {
                var t = base.BotTactics; t.ReadAmmo(AttackPrefab, AttackRadius); t.Area = true;
                t.Contact = t.Offensive; t.Persistent = TriggerType == PSkillTriggerCondition.StartOnce;
                t.Defensive |= MyFeatureDataID == 107 || MyFeatureDataID == 114 || MyFeatureDataID == 28;
                return t;
            }
        }
    }
    public partial class PassiveBomber
    {
        public override BotSkillTactics BotTactics
        {
            get
            {
                var t = base.BotTactics; t.ReadAmmo(AttackPrefab); t.Area = true;
                t.Trail = !SpawnAtTargetPos; t.TargetArea = SpawnAtTargetPos; t.Defensive = true; t.Weight *= .3f; return t;
            }
        }
    }
    public partial class Ammo
    {
        public float BotLifetime => LifeTime;
        public bool BotKnockback => KnockIntensity > 0;
        public bool BotHasEffect(RoleBuffer type)
        {
            if (Buffers != null) foreach (var buff in Buffers) if (buff.Type == type) return true;
            return false;
        }
        public float BotEffectDuration(RoleBuffer type)
        {
            float time = 0;
            if (Buffers != null) foreach (var buff in Buffers) if (buff.Type == type) time = Mathf.Max(time, buff.Time);
            return time;
        }
        public bool BotControl
        {
            get
            {
                if (KnockIntensity > 0) return true;
                if (Buffers != null) foreach (var buff in Buffers)
                    if (buff.Type == RoleBuffer.Stun || buff.Type == RoleBuffer.Freeze || buff.Type == RoleBuffer.Sick) return true;
                return false;
            }
        }
        public float BotRadius
        {
            get
            {
                float size = 30;
                foreach (var col in GetComponentsInChildren<Collider2D>(true))
                {
                    float r = col is CircleCollider2D circle ? circle.radius :
                        col is BoxCollider2D box ? box.size.magnitude * .5f :
                        col is CapsuleCollider2D capsule ? capsule.size.magnitude * .5f : 50;
                    Vector3 scale = col.transform.lossyScale;
                    size = Mathf.Max(size, (r + col.offset.magnitude) * Mathf.Max(Mathf.Abs(scale.x), Mathf.Abs(scale.y)));
                }
                return Mathf.Clamp(size * RangeScale, 30, 900);
            }
        }
        public bool BotVisibleThreat(Role observer) => IsLaunch && isActiveAndEnabled && !HildinOpponentView &&
            (Attacker != observer || (this is ShootAmmo shot && shot.BotReflected)) &&
            (Value > 0 || Buffers != null && Buffers.Count > 0) && TargetRoleTags.Contains(observer.tag);
        public Vector2 BotVelocity => MyRigi ? MyRigi.linearVelocity : Vector2.zero;
    }
    public partial class MeleeAmmo
    {
        public bool BotDefense => MyMeleeType != MeleeType.Damage;
        public bool BotDamage => MyMeleeType != MeleeType.Block && MyMeleeType != MeleeType.Reflect;
    }
    public partial class ShootAmmo
    {
        public Bomb BotExplosion => BombPrefab;
        public float BotSpeed => AmmoSpeed;
        public float BotAcceleration => ForwardAcceleration;
        public bool BotHoming => TraceFactor > 0 && !TraceSelf;
        public bool BotReturning => TraceSelf;
        public bool BotReflected => BeReflect;
        public float BotTravelRange => Mathf.Clamp(AmmoSpeed * Mathf.Min(LifeTime, 4) +
            .5f * Mathf.Max(0, ForwardAcceleration) * Mathf.Pow(Mathf.Min(LifeTime, 4), 2), 80, 2000);
    }
    public partial class NeutralRole
    {
        ArenaBotBrain arenaBrain;
        public ArenaBotBrain ArenaBrain => arenaBrain ?? (arenaBrain = new ArenaBotBrain(this));
        [PunRPC]
        public void CastBotSkill(FeaturePart part, int index, int feature, int targetId, Vector3 point, Vector3 facing, PhotonMessageInfo info)
        {
            if (!IsArenaPlayerSeat || !IsAlive || !SkillDic.TryGetValue(part, out var root)) return;
            var skills = root.GetComponentsInChildren<Skill>();
            if (index < 0 || index >= skills.Length || skills[index].MyFeatureDataID != feature) return;
            var targetView = PhotonView.Find(targetId);
            skills[index].SetBotCast(point, facing, targetView ? targetView.GetComponent<Role>() : null);
            skills[index].Spell(info);
        }
    }
}
