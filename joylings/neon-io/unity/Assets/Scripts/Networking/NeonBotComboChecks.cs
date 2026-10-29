#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using LitJson;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEditor;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Neon.Networking
{
    // Decision-only fixtures: no scene simulation, physics stepping, account writes or Photon connection.
    public static class NeonBotComboChecks
    {
        static readonly NeonBotDifficulty High = NeonBotDifficulty.For(1800);
        static void Require(bool ok, string message) { if (!ok) throw new Exception("Bot combinations: " + message); }
        static GameObject Prefab(string name) => AssetDatabase.LoadAssetAtPath<GameObject>(
            "Assets/Resources/Gameobjects/Battle/Skill/Skill-" + name + ".prefab");
        static BotLoadoutPlan Plan(params string[] names)
        {
            var plan = new BotLoadoutPlan();
            foreach (string name in names) foreach (var skill in Prefab(name).GetComponentsInChildren<Skill>(true)) plan.Add(skill.BotTactics);
            plan.Complete(); return plan;
        }
        public static void Run()
        {
            Require(Plan("Icicle", "FireBall", "FrozenShock").Has(BotSynergy.RangedControl), "ice + fire combination lost its control opener");
            var vampire = Plan("Vampire", "Beam", "WhippingTop");
            Require(vampire.Has(BotSynergy.RangedSustain) && !vampire.Melee, "ranged hits must heal without inventing a melee investment");
            var melee = Plan("Berserker", "PowerfulMelee", "FrozenZone");
            Require(melee.Has(BotSynergy.MeleeSustain) && !melee.Ranged && !melee.Recovery, "melee healing confused with ranged/passive recovery");
            Require(Plan("PowerfulStrike", "ReflectAmmoShell", "FrozenZone").Has(BotSynergy.ProtectedMelee), "reflect + melee combination");
            Require(Plan("DuckEgg", "Flee", "Rush").Has(BotSynergy.TrapKiting), "speed + delayed traps must favour kiting");
            Require(Plan("FocalMove", "FireBall", "Heal").Has(BotSynergy.RecoveryKiting), "quiet speed/healing combination");
            Require(Plan("Invisible", "PowerfulMelee", "Scratch").Has(BotSynergy.Ambush), "concealment + melee payoff combination");
            Require(Plan("AbsorbStar", "StarSplash", "Heal").Has(BotSynergy.HarvestRecovery), "star healing combination");
            Require(Plan("TripleArrow", "FireBall", "QuadrupleIcicle").Has(BotSynergy.Crossfire), "fixed and facing battery combination");
            Require(Plan("Berserker", "FireBall", "FrozenShock").Has(BotSynergy.Skirmish), "hybrid ranged/melee combination");
            Require(!Plan("WoeShare", "FeatherSplash", "WebShoot").Ranged, "retaliation-only build cannot open with ranged poke");
            Require(!Plan("AbsorbStar").Recovery && Plan("AbsorbStar").LootRecovery, "star heal must require a star");
            Require(!Plan("FocalMove").QuietRecovery && Plan("FocalMove").QuietBenefit, "quiet speed is not a heal");
            Require(!Plan("DieGhost").Protection && !Plan("DieGhost").Concealment, "death effect cannot rescue a live player");
            Require(!Plan("FireBall").Has(BotSynergy.RangedControl), "brief impact stagger must not be treated as a setup control weapon");
            CheckAllLoadouts();
            CheckDecisions();
            Debug.Log("NEON_BOT_COMBO_CHECKS_OK 31680 loadout classifications; control timing, spacing, commit/reset, defense availability, recovery and gear swaps (editor decisions only)");
        }
        static void CheckAllLoadouts()
        {
            var groups = new[] { new List<BotSkillTactics[]>(), new List<BotSkillTactics[]>(), new List<BotSkillTactics[]>() };
            var data = JsonMapper.ToObject(File.ReadAllText("Assets/Resources/Json/Feature.json"))["Feature"];
            foreach (JsonData f in data)
            {
                string part = f["FeaturePart"].ToString(), type = f["FeatureType"].ToString().Trim();
                var skills = Prefab(type).GetComponentsInChildren<Skill>(true);
                var traits = new BotSkillTactics[skills.Length];
                for (int i = 0; i < skills.Length; i++) traits[i] = skills[i].BotTactics.WithAccessory(int.Parse(f["ID"].ToString()));
                groups[part == "Head" ? 0 : part == "Body" ? 1 : 2].Add(traits);
            }
            int count = 0;
            foreach (var head in groups[0]) foreach (var body in groups[1]) foreach (var back in groups[2])
            {
                var plan = new BotLoadoutPlan();
                foreach (var t in head) plan.Add(t);
                foreach (var t in body) plan.Add(t);
                foreach (var t in back) plan.Add(t);
                plan.Complete();
                Require(!float.IsNaN(plan.RangedPower) && !float.IsInfinity(plan.RangedPower) && plan.RangedPower >= 0, "invalid combined ranged power");
                Require(!plan.Has(BotSynergy.Skirmish) || plan.Ranged && plan.Melee, "hybrid without two attack routes");
                Require(!plan.Has(BotSynergy.RangedSustain) || plan.Ranged && plan.RangedHealing, "ranged sustain without a reliable ranged weapon");
                Require(!plan.Has(BotSynergy.TrapKiting) || plan.Trail, "trap plan without a trap");
                count++;
            }
            Require(count == 31680, "catalog combination coverage changed: " + count);
        }
        static void Set(object target, string field, object value)
        {
            for (var type = target.GetType(); type != null; type = type.BaseType)
            {
                var info = type.GetField(field, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly);
                if (info == null) continue;
                info.SetValue(target, value); return;
            }
            throw new Exception("Missing fixture field: " + field);
        }
        static void Face(Role role, Vector3 direction) => typeof(Role).GetProperty("Movetorward").GetSetMethod(true).Invoke(role, new object[] { direction });
        static Dictionary<RoleBuffer, BufferData> Buffs(Role role) => (Dictionary<RoleBuffer, BufferData>)typeof(Role)
            .GetField("Buffers", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(role);
        sealed class Rig : IDisposable
        {
            public readonly NeutralRole Bot, Enemy;
            readonly GameObject hidden;
            readonly UnityEngine.Random.State random;
            public Rig(float distance = 400)
            {
                random = UnityEngine.Random.state; UnityEngine.Random.InitState(9172);
                hidden = new GameObject("Inactive combo fixture equipment"); hidden.SetActive(false);
                Bot = Role("Combo bot", Vector2.zero); Enemy = Role("Visible rival", Vector2.right * distance);
                Face(Bot, Vector3.right);
            }
            static NeutralRole Role(string name, Vector2 position)
            {
                var go = new GameObject(name); go.transform.position = position;
                var role = go.AddComponent<NeutralRole>();
                role.MaxHealth = role.Health = 1500; role.ColliderRadius = 50; role.BaseMoveSpeed = 400;
                Set(role, "IsInit", true);
                typeof(Role).GetProperty("IsAlive").GetSetMethod(true).Invoke(role, new object[] { true });
                Face(role, Vector3.up); CombatRegistry.Add(role); return role;
            }
            public Skill Equip(FeaturePart part, string name)
            {
                var clone = Object.Instantiate(Prefab(name), hidden.transform);
                var skills = clone.GetComponentsInChildren<Skill>(true);
                foreach (var skill in skills)
                {
                    // Awake is intentionally not run; configure only the observed state used by the brain.
                    if (skill is PassiveSkill) Set(skill, "Myself", Bot);
                    if (skill is PassiveShoot)
                    {
                        var start = typeof(PassiveShoot).GetField("StartAngle", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(skill);
                        Set(skill, "OriginalStartAngle", start);
                    }
                }
                Bot.SkillDic[part] = skills[0]; return skills[0];
            }
            public ArenaBotBrain Brain(float time = 1) { var brain = new ArenaBotBrain(Bot); brain.Sense(time, High); return brain; }
            public void Dispose()
            {
                Object.DestroyImmediate(hidden); Object.DestroyImmediate(Bot.gameObject); Object.DestroyImmediate(Enemy.gameObject);
                UnityEngine.Random.state = random;
            }
        }
        static void Cooldown(Skill skill, float seconds)
        {
            if (skill is PassiveSkill)
            {
                Set(skill, "IsCooldown", seconds > 0);
                if (seconds > 0) Set(skill, "CDTimer", new MyTimer(seconds, () => { }, false, false));
            }
            else { Set(skill, "OnCD", seconds > 0); Set(skill, "Timer", seconds); }
        }
        static void CheckDecisions()
        {
            using (var r = new Rig())
            {
                var fire = (Attack)r.Equip(FeaturePart.Body, "FireBall");
                float soloRange = r.Brain().PreferredRange;
                var ice = r.Equip(FeaturePart.Back, "FrozenShock");
                var brain = r.Brain();
                Require(brain.PreferredRange < soloRange && brain.PreferredRange <= 500, "short control weapon did not change shared firing distance");
                Require(!brain.CanFire(fire), "heavy shot ignored a ready control opener: " + brain.Plan.Synergies + "; " + brain.Intent +
                    "; fire weight=" + fire.BotTactics.Weight + "; ice poke=" + ice.BotTactics.Poke + "; slow=" + ice.BotTactics.Slow + "; cooldown=" + ice.BotCooldown);
                brain.Sense(1.7f, High);
                Require(brain.CanFire(fire), "missed control permanently starved heavy damage");
                brain.NotifyCast(fire);
                Buffs(r.Enemy)[RoleBuffer.Freeze] = new BufferData(RoleBuffer.Freeze, 5, 0, 0);
                Require(brain.CanFire(fire), "observed slow should release heavy shot immediately");
                Buffs(r.Enemy).Clear();
                Cooldown(ice, 3); brain.Sense(2, High);
                Require(brain.CanFire(fire), "cooling control weapon blocked ready damage");
                Require(brain.PreferredRange > 500, "spent short-range control did not release long-range spacing: " + brain.PreferredRange);
                Cooldown(ice, 0); var low = new ArenaBotBrain(r.Bot); low.Sense(3, NeonBotDifficulty.For(500));
                Require(low.CanFire(fire), "low tier inherited full combo sequencing");
            }
            using (var r = new Rig(250))
            {
                r.Equip(FeaturePart.Head, "Berserker"); r.Equip(FeaturePart.Body, "PowerfulMelee"); r.Equip(FeaturePart.Back, "FrozenZone");
                var brain = r.Brain();
                Require(brain.InCommit && brain.Intent == ArenaBotIntent.Engage, "healthy isolated melee-sustain build refused its attack window");
                brain.Sense(2.4f, High);
                Require(!brain.InCommit && brain.Intent == ArenaBotIntent.Disengage, "melee combo never reset after its short trade");
                brain.Sense(3.2f, High);
                Require(brain.InCommit, "melee reset never allowed another attack window");
                r.Equip(FeaturePart.Head, "Icicle"); r.Equip(FeaturePart.Body, "FireBall"); r.Equip(FeaturePart.Back, "FrozenShock");
                brain.Sense(4.01f, High);
                Require(!brain.InCommit && brain.Intent == ArenaBotIntent.Poke, "mid-commit equipment swap retained obsolete melee orders");
            }
            using (var r = new Rig(250))
            {
                r.Equip(FeaturePart.Head, "PowerfulStrike"); r.Equip(FeaturePart.Body, "Immortal");
                Buffs(r.Bot)[RoleBuffer.Immortal] = new BufferData(RoleBuffer.Immortal, 3, 0, 0);
                var brain = r.Brain(); Require(brain.InCommit, "protected melee did not use its live protection");
                Buffs(r.Bot).Clear(); brain.Sense(1.3f, High);
                Require(!brain.InCommit && brain.Intent == ArenaBotIntent.Disengage, "lost protection did not end an ongoing dive");
            }
            using (var r = new Rig(700))
            {
                var block = r.Equip(FeaturePart.Head, "Constitution");
                r.Equip(FeaturePart.Body, "ReflectAmmoShell"); r.Equip(FeaturePart.Back, "WindShock");
                r.Bot.Health = 900; Cooldown(block, 6);
                Require(r.Brain().Intent == ArenaBotIntent.Poke, "one spent defense hid a persistent working shield");
                r.Equip(FeaturePart.Body, "FireBall");
                Require(r.Brain().Intent == ArenaBotIntent.Poke, "spent defense forced a healthy ranged bot to flee");
                r.Bot.Health = 550;
                Require(r.Brain().Intent == ArenaBotIntent.Disengage, "all spent defenses did not change low-health risk tolerance");
                r.Equip(FeaturePart.Body, "ReflectAmmoShell");
                Require(r.Brain().Intent == ArenaBotIntent.Poke, "available shield was ignored when another defense was cooling down");
            }
            using (var r = new Rig(600))
            {
                r.Equip(FeaturePart.Head, "Vampire"); r.Equip(FeaturePart.Body, "Beam"); r.Equip(FeaturePart.Back, "WhippingTop");
                r.Bot.Health = 600;
                Require(r.Brain().Intent == ArenaBotIntent.Poke, "hit-healing build gave up attacking with usable health");
                r.Bot.Health = 375;
                Require(r.Brain().Intent == ArenaBotIntent.Disengage, "hit-based healing was treated as out-of-combat recovery");
                r.Equip(FeaturePart.Back, "Heal");
                Require(r.Brain().Intent == ArenaBotIntent.Recover, "quiet healing did not change retreat strategy");
                r.Bot.Health = 1500; var brain = r.Brain(10); r.Bot.Health = 1100;
                brain.Sense(10.3f, High);
                Require(brain.Intent == ArenaBotIntent.Poke, "chip damage unnecessarily interrupted the quiet-heal build's offense");
                r.Bot.Health = 700; brain.Sense(10.6f, High);
                Require(brain.Intent == ArenaBotIntent.Recover, "injured quiet-heal build did not seek a recovery window");
            }
            using (var r = new Rig(500))
            {
                r.Equip(FeaturePart.Head, "TripleArrow"); r.Equip(FeaturePart.Body, "FireBall"); r.Equip(FeaturePart.Back, "QuadrupleIcicle");
                var brain = r.Brain();
                Require(Mathf.Abs(Mathf.DeltaAngle(brain.FacingAngle, -90)) < 5, "fixed-angle battery stole facing from the fireball");
                Require(Mathf.Abs(brain.Movement.y) > .1f, "battery failed to seek a usable fixed firing lane");
            }
            using (var r = new Rig(300))
            {
                r.Equip(FeaturePart.Head, "DuckEgg"); r.Equip(FeaturePart.Body, "Flee"); r.Equip(FeaturePart.Back, "Rush");
                var brain = r.Brain();
                Require(!brain.InCommit && brain.Intent == ArenaBotIntent.Poke && brain.Movement.x < 0,
                    "pure traps/mobility build fell back to charging with basic melee");
                r.Equip(FeaturePart.Head, "Vampire"); r.Equip(FeaturePart.Body, "Beam"); r.Equip(FeaturePart.Back, "WhippingTop");
                brain = r.Brain();
                Require(!brain.InCommit && brain.Intent == ArenaBotIntent.Poke,
                    "ranged vampire build forced contact solely because basic melee can also heal");
            }
        }
    }
}
#endif
