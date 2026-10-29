using System;
using System.Collections.Generic;

namespace Starbro.NeonIO
{
    // Source keys are stable skill slots, not local Unity instance IDs.
    public sealed class SpeedBuffStack
    {
        public struct Entry { public int Source; public float Remaining, Value; }
        readonly List<Entry> entries = new List<Entry>();
        public IReadOnlyList<Entry> Entries => entries;
        public int Count => entries.Count;
        public void Clear() => entries.Clear();
        public void Set(int source, float remaining, float value)
        {
            Remove(source);
            if (remaining > 0) entries.Add(new Entry { Source = source, Remaining = remaining, Value = value });
        }
        public void Remove(int source)
        {
            for (int i = entries.Count - 1; i >= 0; i--)
                if (entries[i].Source == source) entries.RemoveAt(i);
        }
        public void Tick(float delta)
        {
            for (int i = entries.Count - 1; i >= 0; i--)
            {
                var entry = entries[i]; entry.Remaining -= delta;
                if (entry.Remaining <= 0) entries.RemoveAt(i);
                else entries[i] = entry;
            }
        }
        public float Total { get { float sum = 0; foreach (var entry in entries) sum += entry.Value; return sum; } }
        public float Remaining { get { float time = 0; foreach (var entry in entries) time = Math.Max(time, entry.Remaining); return time; } }
        public static float StunDuration(float remaining, float incoming) => Math.Max(remaining, incoming);
    }
}
