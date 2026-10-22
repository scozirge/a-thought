using System.Collections.Generic;
using UnityEngine;

namespace Starbro.NeonIO
{
    // Deadlines are relative to the last accepted hit, not a free-running timer.
    // No per-target Update callbacks are needed after an enemy leaves the arena.
    public sealed class HitCooldowns
    {
        struct Entry { public Object target; public double next; }
        readonly Dictionary<int, Entry> entries = new Dictionary<int, Entry>();
        readonly List<int> expired = new List<int>();
        int checks;
        public void Clear() { entries.Clear(); expired.Clear(); checks = 0; }
        public bool TryHit(Object target, double now, float interval)
        {
            if (!target) return false;
            if (++checks % 64 == 0)
            {
                expired.Clear();
                foreach (var pair in entries) if (!pair.Value.target) expired.Add(pair.Key);
                for (int i = 0; i < expired.Count; i++) entries.Remove(expired[i]);
            }
            int id = target.GetInstanceID();
            if (entries.TryGetValue(id, out var previous) && ReferenceEquals(previous.target, target) && now < previous.next) return false;
            entries[id] = new Entry { target = target, next = interval > 0 ? now + interval : double.PositiveInfinity };
            return true;
        }
    }
}
