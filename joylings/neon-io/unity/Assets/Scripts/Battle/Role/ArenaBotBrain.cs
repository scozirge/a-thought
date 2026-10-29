using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;

namespace Starbro.NeonIO
{
    public enum ArenaBotIntent { Farm, Rotate, Poke, Engage, Disengage, Recover }

    public static class BotTacticalMath
    {
        public static Vector2 Rotate(Vector2 v, float degrees)
        {
            float a = degrees * Mathf.Deg2Rad, s = Mathf.Sin(a), c = Mathf.Cos(a);
            return new Vector2(v.x * c - v.y * s, v.x * s + v.y * c);
        }
        // Solve |relative + velocity*t| = speed*t, capped to avoid clairvoyant long leads.
        public static float InterceptTime(Vector2 relative, Vector2 velocity, float speed, float maximum)
        {
            if (speed <= 1) return 0;
            float a = velocity.sqrMagnitude - speed * speed, b = 2 * Vector2.Dot(relative, velocity), c = relative.sqrMagnitude;
            float time = relative.magnitude / speed;
            if (Mathf.Abs(a) < .001f) { if (b < -.001f) time = -c / b; }
            else
            {
                float discriminant = b * b - 4 * a * c;
                if (discriminant >= 0)
                {
                    float root = Mathf.Sqrt(discriminant), x = (-b - root) / (2 * a), y = (-b + root) / (2 * a);
                    if (x > 0 && y > 0) time = Mathf.Min(x, y); else if (x > 0 || y > 0) time = Mathf.Max(x, y);
                }
            }
            return Mathf.Clamp(time, 0, maximum);
        }
        public static Vector2 Lane(BotSkillTactics skill, Vector2 toTarget)
        {
            Vector2 best = toTarget.normalized;
            float score = -2;
            for (int i = 0; i < Mathf.Clamp(skill.Shots, 1, 32); i++)
            {
                float angle = skill.StartAngle + i * skill.AngleStep;
                int variants = skill.Pattern == DirectionPatetern.Default ? 1 : 2;
                for (int sign = 0; sign < variants; sign++)
                {
                    float a = skill.Pattern == DirectionPatetern.LeftRight ? (sign == 0 ? angle : 180 - angle) :
                        skill.Pattern == DirectionPatetern.TopDown ? (sign == 0 ? 90 + angle : 270 - angle) : angle;
                    var dir = Rotate(Vector2.right, a);
                    float dot = Vector2.Dot(dir, toTarget.normalized);
                    if (dot > score) { score = dot; best = dir; }
                }
            }
            return best;
        }
        // Healthy bots keep contesting fights, including the final four. Extra threats or
        // spent protection only force a retreat once health is genuinely at risk.
        public static bool ShouldRetreat(float health, float threshold, int nearbyThreats, bool defenseSpent)
            => health < threshold || (nearbyThreats >= 3 && health < .5f) ||
                (defenseSpent && health < threshold + .1f);
        public static float SafeRadius(float radius, float margin) => Mathf.Max(0, radius - Mathf.Min(margin, radius * .15f));
        public static float ProjectileRisk(Vector2 position, Vector2 velocity, Vector2 shot, Vector2 shotVelocity, float horizon, float clearance)
        {
            Vector2 p = shot - position, v = shotVelocity - velocity;
            float t = v.sqrMagnitude > .001f ? Mathf.Clamp(-Vector2.Dot(p, v) / v.sqrMagnitude, 0, horizon) : 0;
            return Mathf.Clamp01(1 - (p + v * t).magnitude / clearance);
        }
    }

    // One authority-side brain per ranked AI. Resource bots retain the legacy movement/aim.
    public sealed class ArenaBotBrain
    {
        struct Seen { public Role Role; public Vector2 Position, Velocity; public float Time; }
        struct Equipped { public Skill Skill; public BotSkillTactics Tactics; }
        struct Shot { public Vector2 Position, Velocity; public float Radius; }
        readonly NeutralRole self;
        NeonBotDifficulty difficulty;
        readonly List<Seen> seen = new List<Seen>(32);
        readonly Dictionary<Role, Seen> previous = new Dictionary<Role, Seen>();
        readonly List<Equipped> equipped = new List<Equipped>(8);
        readonly List<Shot> shots = new List<Shot>(24);
        readonly Dictionary<Skill, float> castTimes = new Dictionary<Skill, float>();
        readonly Dictionary<Skill, float> burstWaits = new Dictionary<Skill, float>();
        int loadoutHash, lastHealth, orbitSign;
        float nextDecision, retreatUntil, nextOrbit, aimError, observedAt, lastHurtAt = -1000;
        float commitUntil, resetUntil;
        Role commitTarget;
        bool commitProtected;
        Vector2 movement, goal;
        Equipped primary, aimWeapon;
        bool hasAimWeapon;
        bool hasPrimary, recovery, quietRecovery, stationaryRecovery, harvest, defenseSpent, meleeBuild, trail;
        public BotLoadoutPlan Plan { get; private set; }
        public float PreferredRange { get; private set; }
        public bool InCommit => commitTarget && observedAt < commitUntil;
        public Role Target { get; private set; }
        public ArenaBotIntent Intent { get; private set; }
        public Vector2 Movement => movement;
        public float FacingAngle { get; private set; }
        public bool HasAim => Target && CombatRegistry.IsTarget(Target) && !Target.BuffersExist(RoleBuffer.Invisible, RoleBuffer.Ghost);
        public ArenaBotBrain(NeutralRole role) { self = role; difficulty = role.ArenaDifficulty; lastHealth = role.Health; orbitSign = role.ID % 2 == 0 ? 1 : -1; }

        void RefreshLoadout()
        {
            int hash = 17;
            foreach (var root in self.SkillDic.Values) hash = unchecked(hash * 31 + (root ? root.GetInstanceID() : 0));
            if (hash == loadoutHash) return;
            loadoutHash = hash; equipped.Clear();
            castTimes.Clear(); burstWaits.Clear(); commitTarget = null; commitUntil = resetUntil = nextDecision = 0;
            var plan = new BotLoadoutPlan();
            foreach (var root in self.SkillDic.Values)
                if (root) foreach (var skill in root.GetComponentsInChildren<Skill>())
                {
                    var tactics = skill.BotTactics;
                    equipped.Add(new Equipped { Skill = skill, Tactics = tactics });
                    plan.Add(tactics);
                }
            plan.Complete(); Plan = plan;
        }
        public void Sense(float now)
        { Sense(now, self.ArenaDifficulty); }
        internal void Sense(float now, NeonBotDifficulty tuning)
        {
            RefreshLoadout();
            difficulty = tuning;
            observedAt = now;
            if (self.Health < lastHealth) lastHurtAt = now;
            lastHealth = self.Health;
            Vector2 position = self.transform.position;
            seen.Clear();
            foreach (var role in CombatRegistry.Roles)
            {
                if (role == self || !CombatRegistry.IsTarget(role) || role.BuffersExist(RoleBuffer.Invisible, RoleBuffer.Ghost)) continue;
                Vector2 p = role.transform.position;
                if ((p - position).sqrMagnitude > tuning.Sight * tuning.Sight) continue;
                var entry = new Seen { Role = role, Position = p, Time = now };
                if (previous.TryGetValue(role, out var old) && now > old.Time && now - old.Time < .7f)
                {
                    Vector2 measured = (p - old.Position) / (now - old.Time);
                    // Teleport is not a velocity to extrapolate. Only observed movement is used.
                    if (measured.magnitude < Mathf.Max(100, role.MoveSpeed * 1.6f))
                        entry.Velocity = Vector2.Lerp(old.Velocity, measured, .65f);
                }
                seen.Add(entry);
            }
            previous.Clear();
            foreach (var entry in seen) previous[entry.Role] = entry;
            SelectTarget(position, tuning); ReadLoadout(position);
            aimError = Random.Range(-tuning.AimError, tuning.AimError);
            if (HasAim)
            {
                var aiming = hasAimWeapon ? aimWeapon : primary;
                Vector2 delta = AimPoint(hasPrimary ? aiming.Skill : null) - (Vector3)position;
                float offset = hasPrimary && aiming.Tactics.Pattern == DirectionPatetern.FaceDirection && !aiming.Tactics.Homing ?
                    aiming.Tactics.StartAngle + (aiming.Tactics.Shots - 1) * aiming.Tactics.AngleStep * .5f : 0;
                FacingAngle = Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg - 90 - offset;
            }
            if (now >= nextDecision)
            {
                nextDecision = now + tuning.Decision;
                Decide(position, tuning, now);
            }
        }
        void ReadLoadout(Vector2 position)
        {
            hasPrimary = hasAimWeapon = recovery = quietRecovery = stationaryRecovery = harvest = defenseSpent = meleeBuild = trail = false;
            float best = 0, bestAim = 0;
            int defenses = 0, readyDefenses = 0;
            float distance = HasAim ? Vector2.Distance(position, Target.transform.position) : 600;
            bool controlled = HasAim && Target.BuffersExist(RoleBuffer.Stun, RoleBuffer.Freeze);
            foreach (var item in equipped)
            {
                if (!item.Skill) continue;
                var t = item.Tactics;
                if (t.DeathOnly) continue;
                recovery |= t.Recovery && (!(item.Skill is PassiveSkill passive) || passive.BotRecoveryAvailable);
                quietRecovery |= t.QuietRecovery; stationaryRecovery |= t.StationaryRecovery;
                harvest |= t.Harvest; trail |= t.Trail;
                if (t.Defensive && (t.Protection || t.Concealment || t.Mobility || !t.Control))
                {
                    defenses++;
                    if (t.Persistent || item.Skill.BotDefenseEligible && item.Skill.BotCooldown <= 1) readyDefenses++;
                }
                if (!t.IndependentOffense) continue;
                float priority = t.Power / (1 + item.Skill.BotCooldown * .6f);
                priority *= distance <= t.Range + 50 ? 1 : .25f;
                if (difficulty.Tier > 0 && Plan.Has(BotSynergy.RangedControl))
                {
                    if (!controlled && t.SetupControl && !t.Contact) priority *= 1.7f;
                    if (controlled && t.Weight >= 2) priority *= 1.4f;
                }
                if (priority > best) { best = priority; primary = item; hasPrimary = true; }
                // Homing or auto-aim weapons must not steal the facing needed by another weapon.
                if (t.Pattern == DirectionPatetern.FaceDirection && !t.Homing && priority > bestAim)
                { bestAim = priority; aimWeapon = item; hasAimWeapon = true; }
            }
            defenseSpent = defenses > 0 && readyDefenses == 0 && !self.BuffersExist(RoleBuffer.Immortal, RoleBuffer.Block, RoleBuffer.Invisible, RoleBuffer.Ghost);
            meleeBuild = Plan.Melee;
            PreferredRange = ChooseRange();
        }
        float ChooseRange()
        {
            if (!Plan.Ranged) return 280;
            if (difficulty.Tier == 0) return hasPrimary ? Mathf.Clamp(primary.Tactics.Range * .68f, 200, 820) : 450;
            float best = float.NegativeInfinity, selected = 450;
            float minimum = HasAim ? Mathf.Max(200, (self.ColliderRadius + Target.ColliderRadius) * 1.6f) : 200;
            for (float distance = minimum; distance <= Mathf.Max(minimum, 850); distance += 50)
            {
                float score = 0, availablePower = 0;
                foreach (var item in equipped)
                {
                    if (!item.Skill || !item.Tactics.Poke) continue;
                    var t = item.Tactics;
                    float utility = BotLoadoutPlan.RangeUtility(t, distance, item.Skill.BotCooldown);
                    if (Plan.Has(BotSynergy.RangedControl) && t.SetupControl) utility *= 1.2f;
                    float hitHealing = Plan.Has(BotSynergy.RangedSustain) && self.HealthRatio < .8f ?
                        1 + .7f / Mathf.Max(1, t.Cycle) : 1;
                    score += utility * hitHealing;
                    availablePower += t.Power * BotLoadoutPlan.Readiness(item.Skill.BotCooldown) * hitHealing;
                }
                // Reward room to dodge, but not enough to abandon a second useful weapon.
                score += availablePower * (.35f * distance / 850 - .4f * Mathf.Clamp01((320 - distance) / 200));
                if (score > best) { best = score; selected = distance; }
            }
            return selected;
        }
        int Nearby(Vector2 position, float radius, Role except = null)
        {
            int count = 0;
            foreach (var entry in seen) if (entry.Role != except && (entry.Position - position).sqrMagnitude < radius * radius) count++;
            return count;
        }
        void SelectTarget(Vector2 position, NeonBotDifficulty tuning)
        {
            Role selected = null; float best = float.NegativeInfinity;
            foreach (var entry in seen)
            {
                float distance = Vector2.Distance(position, entry.Position);
                float score = 1 - distance / tuning.Sight;
                if (tuning.Tier > 0)
                {
                    score += (1 - entry.Role.HealthRatio) * .6f;
                    score -= Nearby(entry.Position, 400, entry.Role) * (tuning.Tier == 2 ? .32f : .15f);
                    if (entry.Role.BuffersExist(RoleBuffer.Immortal)) score -= 2;
                    if (entry.Role.BuffersExist(RoleBuffer.Stun)) score += .2f;
                    if (Plan.Has(BotSynergy.RangedControl) && entry.Role.BuffersExist(RoleBuffer.Stun, RoleBuffer.Freeze)) score += .15f;
                    if (entry.Role == Target) score += .25f; // target persistence prevents nearest-target jitter
                }
                if (score > best) { best = score; selected = entry.Role; }
            }
            if (Target != selected)
            {
                burstWaits.Clear();
                if (commitTarget) EndCommit(observedAt);
                nextDecision = 0;
            }
            Target = selected;
            self.ClosestOpponent = selected;
        }
        public Vector3 AimPoint(Skill skill)
        {
            Vector2 position = self.transform.position;
            if (!Target || !previous.TryGetValue(Target, out var target)) return position + (Vector2)self.Movetorward * 100;
            BotSkillTactics t = default;
            foreach (var item in equipped) if (item.Skill == skill) { t = item.Tactics; break; }
            var tuning = difficulty;
            float travel = t.Speed > 1 && !t.Homing && !t.Returning ?
                BotTacticalMath.InterceptTime(target.Position - position, target.Velocity,
                    t.Speed + Mathf.Max(0, t.Acceleration) * .25f, .9f) : 0;
            float lead = Mathf.Min(1.1f, travel + t.Delay) * tuning.Lead;
            Vector2 predicted = target.Position + target.Velocity * lead;
            return position + BotTacticalMath.Rotate(predicted - position, aimError);
        }
        public bool CanFire(Attack attack)
        {
            var tuning = difficulty;
            if (tuning.Tier == 0) return true;
            BotSkillTactics t = default;
            foreach (var item in equipped) if (item.Skill == attack) { t = item.Tactics; break; }
            if (!t.Offensive || t.Trail || t.Persistent) return true;
            if (!HasAim) return false;
            if (tuning.Tier == 2 && Target.BuffersExist(RoleBuffer.Immortal)) return false;
            Vector2 delta = AimPoint(attack) - self.transform.position;
            if (delta.magnitude > t.Range + Target.ColliderRadius) return false;
            if (!Aligned(t, delta)) return false;
            return !WaitForControl(attack, t);
        }
        bool Aligned(BotSkillTactics t, Vector2 delta)
        {
            if (t.Homing || t.Returning || t.Area && (!t.Contact || t.Pattern != DirectionPatetern.FaceDirection)) return true;
            Vector2 lane = t.FixedLane ? BotTacticalMath.Lane(t, delta) : (Vector2)self.Movetorward;
            if (!t.FixedLane && t.Pattern == DirectionPatetern.FaceDirection)
                lane = BotTacticalMath.Rotate(lane, t.StartAngle + (t.Shots - 1) * t.AngleStep * .5f);
            else if (!t.FixedLane) return true; // auto-target projectiles are aimed by the cast snapshot
            float tolerance = 8 + Mathf.Atan2(Target.ColliderRadius + 25, Mathf.Max(1, delta.magnitude)) * Mathf.Rad2Deg;
            return Vector2.Angle(lane, delta) <= tolerance + (t.FixedLane ? 0 : Mathf.Abs(t.AngleStep) * (t.Shots - 1) * .5f);
        }
        internal void NotifyCast(Skill skill)
        {
            castTimes[skill] = observedAt;
            burstWaits.Remove(skill);
        }
        bool WaitForControl(Skill skill, BotSkillTactics tactics)
        {
            if (!Plan.Has(BotSynergy.RangedControl) || !tactics.Poke || tactics.Weight < 2 || tactics.SetupControl ||
                Target.BuffersExist(RoleBuffer.Stun, RoleBuffer.Freeze) || Intent == ArenaBotIntent.Disengage || Intent == ArenaBotIntent.Recover)
                return false;
            // A missed control shot may delay a heavy shot briefly, never indefinitely.
            float limit = difficulty.Tier == 2 ? .55f : .25f;
            if (burstWaits.TryGetValue(skill, out float started) && observedAt - started >= limit) return false;
            foreach (var item in equipped)
            {
                var t = item.Tactics;
                if (item.Skill == skill || !item.Skill || !t.Poke || !t.SetupControl) continue;
                Vector2 delta = AimPoint(item.Skill) - self.transform.position;
                if (delta.magnitude > t.Range + Target.ColliderRadius) continue;
                bool inFlight = castTimes.TryGetValue(item.Skill, out float cast) && observedAt - cast <
                    Mathf.Min(.9f, t.Delay + delta.magnitude / Mathf.Max(100, t.Speed) + .1f);
                bool ready = item.Skill.BotCooldown <= .2f && Aligned(t, delta);
                if (!inFlight && !ready) continue;
                if (!burstWaits.ContainsKey(skill)) burstWaits[skill] = observedAt;
                return true;
            }
            return false;
        }
        void EndCommit(float now)
        {
            commitTarget = null; commitUntil = 0;
            resetUntil = now + (difficulty.Tier == 2 ? .65f : .45f);
        }
        void Decide(Vector2 position, NeonBotDifficulty tuning, float now)
        {
            var arena = NeonArena.Instance;
            float radius = arena ? NeonArenaRules.Radius(arena.Elapsed + tuning.LookAhead) : 4000;
            float safe = BotTacticalMath.SafeRadius(radius, tuning.Margin);
            int threats = Nearby(position, 450);
            bool hurt = now - lastHurtAt < tuning.Decision + tuning.Scan;
            bool vulnerable = self.BuffersExist(RoleBuffer.Ghost) ||
                (self.BuffersExist(RoleBuffer.Invisible) && (self.HealthRatio < .4f || hurt && self.HealthRatio < .55f));
            if (BotTacticalMath.ShouldRetreat(self.HealthRatio, tuning.Retreat, tuning.Tier > 0 ? threats : 0,
                tuning.Tier > 0 && defenseSpent) || vulnerable)
                retreatUntil = now + (tuning.Tier == 2 ? 1f : tuning.Tier == 1 ? .8f : .6f);
            bool safeFinish = HasAim && threats <= 1 && self.HealthRatio > .18f && Target.Health < self.Health * .45f &&
                !Target.BuffersExist(RoleBuffer.Immortal) && Vector2.Distance(position, Target.transform.position) < 350;
            bool retreat = now < retreatUntil && !safeFinish;
            // Seek a quiet recovery window only below half health; chip damage should not
            // interrupt the fight. Healing on hit still requires an actual attack.
            if (tuning.Tier > 0 && Plan.Has(BotSynergy.RecoveryKiting) && self.HealthRatio < .5f &&
                now - lastHurtAt < Mathf.Max(1, Plan.QuietDelay + .4f) && !safeFinish) retreat = true;
            if (commitTarget && (now >= commitUntil || retreat || !HasAim || commitTarget != Target ||
                threats >= 3 || threats == 2 && self.HealthRatio < .55f || position.magnitude > safe || Target.BuffersExist(RoleBuffer.Immortal) ||
                commitProtected && !self.BuffersExist(RoleBuffer.Immortal, RoleBuffer.Block))) EndCommit(now);
            if (now >= nextOrbit) { nextOrbit = now + Random.Range(2, 4); orbitSign = Random.value < .5f ? -1 : 1; }

            if (position.magnitude > safe)
            {
                Intent = ArenaBotIntent.Rotate;
                goal = position.normalized * Mathf.Max(0, safe - 200);
            }
            else if (HasAim)
            {
                var enemy = previous[Target];
                Vector2 delta = enemy.Position - position;
                float contact = Mathf.Max(65, self.ColliderRadius + Target.ColliderRadius);
                bool ranged = Plan.Ranged;
                bool protectedNow = self.BuffersExist(RoleBuffer.Immortal);
                bool flank = Vector2.Dot(Target.Movetorward, -delta.normalized) < .35f;
                bool finalDuel = arena && arena.Remaining == 2;
                bool ready = !hasPrimary || primary.Skill.BotCooldown < .35f;
                bool controlled = Target.BuffersExist(RoleBuffer.Stun, RoleBuffer.Freeze);
                bool guardedMelee = Plan.Has(BotSynergy.ProtectedMelee | BotSynergy.MeleeSustain);
                bool ambush = Plan.Has(BotSynergy.Ambush) && self.BuffersExist(RoleBuffer.Invisible) && self.HealthRatio > .7f;
                bool canWinTrade = !Target.BuffersExist(RoleBuffer.Immortal) && threats <= 2 && (threats <= 1 || self.HealthRatio >= .55f) &&
                    (protectedNow || safeFinish || self.HealthRatio > Target.HealthRatio + .12f || Target.HealthRatio < .25f && self.HealthRatio > .5f ||
                     Target.BuffersExist(RoleBuffer.Stun) && self.HealthRatio > .5f ||
                     guardedMelee && !defenseSpent && self.HealthRatio > .6f && (controlled || flank) ||
                     ambush && flank ||
                     ready && !defenseSpent && (flank && self.HealthRatio > .6f || finalDuel && self.Health >= Target.Health * .85f));
                bool wantsContact = !ranged || meleeBuild && delta.magnitude < contact * (guardedMelee || ambush ? 4.5f : 3);
                if (Plan.Has(BotSynergy.TrapKiting) && !meleeBuild && !safeFinish && !protectedNow) wantsContact = false;
                bool engage = !retreat && wantsContact && (tuning.Tier == 0 || canWinTrade);
                if (tuning.Tier > 0)
                {
                    if (engage && !commitTarget && now >= resetUntil)
                    {
                        commitTarget = Target;
                        commitUntil = now + (tuning.Tier == 2 ? 1.25f : .85f);
                        commitProtected = self.BuffersExist(RoleBuffer.Immortal, RoleBuffer.Block);
                    }
                    engage = !retreat && commitTarget == Target && now < commitUntil;
                }
                float distance = ranged ? Mathf.Max(contact * 1.6f, PreferredRange) : contact * 2.8f;
                if (!ranged && trail && !meleeBuild) distance = Mathf.Max(distance, Plan.Mobility ? 600 : 500);
                if (hasPrimary && primary.Skill.BotCooldown > .7f && tuning.Tier > 0) distance += 100;
                if (engage) distance = contact * .8f;
                bool resetting = tuning.Tier > 0 && now < resetUntil && !retreat;
                if (resetting) distance = Mathf.Max(distance, contact * (Plan.Mobility ? 2.6f : 2.2f));
                if (retreat) distance = Mathf.Max(distance, recovery || quietRecovery ? 650 : 500);
                // A dying final circle makes indefinite kiting impossible; leave space for the fog.
                distance = Mathf.Min(distance, Mathf.Max(contact, safe * 1.2f));
                Intent = retreat ? (recovery || quietRecovery ? ArenaBotIntent.Recover : ArenaBotIntent.Disengage) :
                    engage ? ArenaBotIntent.Engage : resetting ? ArenaBotIntent.Disengage : ArenaBotIntent.Poke;
                Vector2 radial = delta.sqrMagnitude > 1 ? delta.normalized : Vector2.up;
                if (!retreat && !engage && !resetting && HasFixedWeapon() && tuning.Tier > 0)
                {
                    goal = FiringPosition(position, enemy.Position, distance, safe);
                }
                else
                {
                    // Keep a stable orbit, instead of a new coin flip every frame.
                    Vector2 orbit = BotTacticalMath.Rotate(radial, (engage ? 55 : 18) * orbitSign);
                    goal = enemy.Position - orbit * distance;
                    if (retreat && trail) goal = position - radial * distance; // leave a damage trail behind us
                    if (!engage && Plan.Has(BotSynergy.TrapKiting) && tuning.Tier > 0 && (retreat || delta.magnitude < distance))
                    {
                        Vector2 pursuit = (enemy.Position + enemy.Velocity * .4f - position).normalized;
                        goal = position - BotTacticalMath.Rotate(pursuit, 22 * orbitSign) * distance;
                    }
                }
                var loot = FindSafeStar(position, safe, tuning.Stars, retreat || harvest);
                bool needLoot = retreat || harvest && (self.HealthRatio < .55f || delta.magnitude > distance + 150);
                if (loot && needLoot && !engage && Nearby(loot.transform.position, 330) == 0)
                    goal = loot.transform.position;
            }
            else
            {
                Intent = self.HealthRatio < .85f && (recovery || quietRecovery) ? ArenaBotIntent.Recover : ArenaBotIntent.Farm;
                var loot = FindSafeStar(position, safe, tuning.Stars, true);
                if (loot) goal = loot.transform.position;
                else if (stationaryRecovery && Intent == ArenaBotIntent.Recover) goal = position;
                else if ((goal - position).sqrMagnitude < 10000 || goal.magnitude > safe)
                    goal = Vector2.ClampMagnitude(position + Random.insideUnitCircle * 650, Mathf.Max(0, safe - 80));
            }
            goal = Vector2.ClampMagnitude(goal, safe);
            ObserveProjectiles(position, tuning);
            movement = ChooseMovement(position, goal, safe, tuning);
        }
        bool HasFixedWeapon()
        {
            foreach (var item in equipped) if (item.Skill && item.Tactics.Poke && item.Tactics.FixedLane) return true;
            return false;
        }
        Vector2 FiringPosition(Vector2 position, Vector2 enemy, float distance, float safe)
        {
            Vector2 selected = position; float best = float.NegativeInfinity;
            // Score the complete battery, not just the strongest fixed-angle weapon. Facing
            // weapons remain aimed separately while movement aligns the fixed rays.
            for (int i = 0; i < 16; i++)
            {
                Vector2 candidate = enemy - BotTacticalMath.Rotate(Vector2.right, i * 22.5f) * distance;
                float score = -Vector2.Distance(candidate, position) / 800 - Mathf.Max(0, candidate.magnitude - safe) / 50;
                foreach (var item in equipped)
                {
                    if (!item.Skill || !item.Tactics.Poke) continue;
                    var t = item.Tactics;
                    Vector2 delta = (Vector2)AimPoint(item.Skill) - candidate;
                    float utility = BotLoadoutPlan.RangeUtility(t, delta.magnitude, item.Skill.BotCooldown);
                    if (t.FixedLane)
                    {
                        float tolerance = 8 + Mathf.Atan2(Target.ColliderRadius + 25, Mathf.Max(1, delta.magnitude)) * Mathf.Rad2Deg;
                        utility *= Mathf.Clamp01(1 - Vector2.Angle(BotTacticalMath.Lane(t, delta), delta) / tolerance);
                    }
                    score += utility * 2;
                }
                score -= Nearby(candidate, 280, Target) * 1.5f;
                if (score > best) { best = score; selected = candidate; }
            }
            return selected;
        }
        GameObject FindSafeStar(Vector2 position, float safe, float range, bool cautious)
        {
            // Search the existing bounded pool; inactive stars and a contested nearest star must not mask safe alternatives.
            Loot best = null; float distance = range * range;
            foreach (var loot in LootSpawner.RegisteredLoot)
            {
                if (!loot || !loot.IsActive || !loot.gameObject.activeInHierarchy) continue;
                Vector2 p = loot.transform.position;
                float d = (p - position).sqrMagnitude;
                if (d >= distance || p.sqrMagnitude > safe * safe || cautious && Nearby(p, 300) > 0) continue;
                if (cautious && UnsafeLootPath(position, p)) continue;
                best = loot; distance = d;
            }
            return best ? best.gameObject : null;
        }
        bool UnsafeLootPath(Vector2 start, Vector2 end)
        {
            Vector2 route = end - start;
            foreach (var enemy in seen)
            {
                float t = route.sqrMagnitude > 1 ? Mathf.Clamp01(Vector2.Dot(enemy.Position - start, route) / route.sqrMagnitude) : 0;
                // Allow escaping an enemy already at our back, but never cut through one for loot.
                if (t > .1f && Vector2.Distance(start + route * t, enemy.Position) < 240) return true;
            }
            return false;
        }
        void ObserveProjectiles(Vector2 position, NeonBotDifficulty tuning)
        {
            shots.Clear();
            if (tuning.Tier == 0) return;
            // Bounded local threat list: keep the nearest 24 visible hostile projectiles.
            foreach (var shot in CombatRegistry.Projectiles)
            {
                if (!shot || !shot.BotVisibleThreat(self)) continue;
                Vector2 p = shot.transform.position;
                if ((p - position).sqrMagnitude > 750 * 750) continue;
                var candidate = new Shot { Position = p, Velocity = shot.BotVelocity, Radius = 35 };
                if (shots.Count < 24) shots.Add(candidate);
                else
                {
                    int farthest = 0;
                    for (int i = 1; i < shots.Count; i++)
                        if ((shots[i].Position - position).sqrMagnitude > (shots[farthest].Position - position).sqrMagnitude) farthest = i;
                    if ((p - position).sqrMagnitude < (shots[farthest].Position - position).sqrMagnitude) shots[farthest] = candidate;
                }
            }
        }
        Vector2 ChooseMovement(Vector2 position, Vector2 destination, float safe, NeonBotDifficulty tuning)
        {
            Vector2 toward = (destination - position).normalized, best = toward;
            if (toward.sqrMagnitude < .01f) toward = Vector2.up;
            float bestScore = float.NegativeInfinity;
            float horizon = tuning.Tier == 2 ? .65f : .45f;
            for (int i = 0; i < 18; i++)
            {
                Vector2 dir = i == 16 ? Vector2.zero : BotTacticalMath.Rotate(toward, i * 22.5f);
                // A short step can reach melee contact/spacing without a full-speed overshoot.
                if (i == 17) dir = toward * Mathf.Clamp01(Vector2.Distance(position, destination) / Mathf.Max(1, self.MoveSpeed * horizon));
                Vector2 vel = dir * self.MoveSpeed;
                Vector2 projected = position + vel * horizon;
                float score = -(projected - destination).magnitude / 200 + Vector2.Dot(dir, movement) * .12f;
                float outside = Mathf.Max(0, projected.magnitude - safe);
                score -= outside / 20;
                foreach (var enemy in seen)
                {
                    if (Intent == ArenaBotIntent.Engage && enemy.Role == Target) continue;
                    float separation = Vector2.Distance(projected, enemy.Position + enemy.Velocity * horizon * tuning.Lead);
                    score -= Mathf.Clamp01(1 - separation / 260) * (tuning.Tier == 2 ? 4 : 2);
                }
                foreach (var shot in shots)
                    score -= BotTacticalMath.ProjectileRisk(position, vel, shot.Position, shot.Velocity, horizon,
                        self.ColliderRadius + shot.Radius + 35) * (tuning.Tier == 2 ? 5 : 2);
                if (i == 16 && (destination - position).magnitude < 35) score += .5f;
                if (score > bestScore) { bestScore = score; best = dir; }
            }
            return best;
        }
    }
}
