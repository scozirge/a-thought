using System;
using UnityEngine;

namespace Starbro.NeonIO
{
    [Flags]
    public enum BotSynergy
    {
        None = 0, RangedControl = 1, RangedSustain = 2, MeleeSustain = 4, ProtectedMelee = 8,
        TrapKiting = 16, RecoveryKiting = 32, Ambush = 64, HarvestRecovery = 128,
        Crossfire = 256, Skirmish = 512
    }

    // Cached on equipment changes. Multiple synergies can coexist; survival and current
    // cooldowns decide which one is useful now, rather than a single hard-coded build name.
    public struct BotLoadoutPlan
    {
        public BotSynergy Synergies { get; private set; }
        public float RangedPower, MeleePower, BurstPower, ControlRange, QuietDelay;
        public bool Mobility, Protection, Concealment, Trail, Recovery, QuietRecovery, QuietBenefit;
        public bool Harvest, LootRecovery, MeleeHealing, RangedHealing, CloseControl;
        int rangedSkills, fixedSkills;
        public bool Ranged => RangedPower > 0;
        public bool Melee => MeleePower > 0;
        public bool Has(BotSynergy flag) => (Synergies & flag) != 0;
        public static float Readiness(float cooldown)
        {
            float remaining = Mathf.Max(0, cooldown);
            return 1 / (1 + remaining * (1 + remaining));
        }

        public void Add(BotSkillTactics t)
        {
            if (t.DeathOnly) return;
            Mobility |= t.Mobility; Protection |= t.Protection; Concealment |= t.Concealment;
            Trail |= t.Trail; Recovery |= t.Recovery; QuietRecovery |= t.QuietRecovery; QuietBenefit |= t.QuietBenefit;
            Harvest |= t.Harvest; LootRecovery |= t.LootRecovery;
            MeleeHealing |= t.MeleeSustain; RangedHealing |= t.RangedSustain;
            QuietDelay = Mathf.Max(QuietDelay, t.QuietDelay);
            // All-hit healing can be supplied from range; it is not an investment in contact.
            if (t.MeleeTrigger || t.MeleePower || t.MeleeSustain && !t.RangedSustain) MeleePower += .8f;
            if (t.Contact && t.Offensive && !t.Reactive) MeleePower += t.Power;
            if (t.Slow || t.Stun || t.Weaken)
            {
                if (t.IndependentOffense && !t.Contact && t.SetupControl) ControlRange = Mathf.Max(ControlRange, t.Range);
                if (t.Contact || t.Reactive) CloseControl = true;
            }
            if (!t.Poke) return;
            rangedSkills++;
            if (t.FixedLane) fixedSkills++;
            RangedPower += t.Power;
            if (t.Weight >= 2 || t.Shots >= 3 && t.BurstDuration > 0) BurstPower += t.Power;
        }

        public void Complete()
        {
            Synergies = BotSynergy.None;
            if (Ranged && ControlRange > 0) Synergies |= BotSynergy.RangedControl;
            if (Ranged && RangedHealing) Synergies |= BotSynergy.RangedSustain;
            if (Melee && MeleeHealing) Synergies |= BotSynergy.MeleeSustain;
            if (Melee && (Protection || CloseControl)) Synergies |= BotSynergy.ProtectedMelee;
            if (Trail && (Mobility || CloseControl || Ranged)) Synergies |= BotSynergy.TrapKiting;
            if ((Recovery || QuietBenefit) && (Ranged || Trail || Mobility || Protection || Concealment)) Synergies |= BotSynergy.RecoveryKiting;
            if (Concealment && (Melee || BurstPower > 0)) Synergies |= BotSynergy.Ambush;
            if (Harvest && LootRecovery) Synergies |= BotSynergy.HarvestRecovery;
            if (fixedSkills > 0 && rangedSkills > 1) Synergies |= BotSynergy.Crossfire;
            if (Melee && Ranged) Synergies |= BotSynergy.Skirmish;
        }

        // Heuristic opportunity, not claimed DPS. The shared distance search adds up every
        // independently usable weapon: two compatible ranges can outweigh one longer range.
        public static float RangeUtility(BotSkillTactics t, float distance, float cooldown)
        {
            if (!t.Poke) return 0;
            float reach = Mathf.Clamp01((t.Range + 35 - distance) / Mathf.Max(60, t.Range * .18f));
            float flight = t.Speed > 1 && !t.Homing && !t.Returning ? distance / (t.Speed + Mathf.Max(0, t.Acceleration) * .25f) : 0;
            float accuracy = 1 / (1 + Mathf.Max(0, flight - .35f) * .35f);
            return t.Power * reach * accuracy * Readiness(cooldown);
        }
    }
}
