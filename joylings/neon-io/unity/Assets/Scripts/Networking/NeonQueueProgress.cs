using System;

namespace Neon.Networking
{
    // Cosmetic seat preparation (including AI seats), never a count of human connections.
    // Local PRNG leaves gameplay Random untouched. A match has the same cadence on every client.
    public sealed class NeonQueueProgress
    {
        readonly float[] arrivals = new float[NeonArenaRules.PlayerSeats];
        public NeonQueueProgress(string matchId)
        {
            int seed = 17;
            unchecked { foreach (char c in matchId) seed = seed * 31 + c; }
            var random = new Random(seed);
            float total = 0;
            for (int i = 1; i < arrivals.Length; i++)
            {
                // Interleave quick clusters with longer pauses, instead of uniform increments.
                total += (float)(random.NextDouble() < .45 ? .10 + random.NextDouble() * .18 : 1.0 + random.NextDouble() * 2.8);
                arrivals[i] = total;
            }
            float finish = NeonArenaRules.QueueSeconds - .65f;
            for (int i = 1; i < arrivals.Length; i++) arrivals[i] *= finish / total;
        }
        public int CountAt(float elapsed)
        {
            int count = 0;
            foreach (float time in arrivals) if (elapsed >= time) count++;
            return count;
        }
    }
}
