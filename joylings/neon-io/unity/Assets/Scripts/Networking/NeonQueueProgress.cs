using System;

namespace Neon.Networking
{
    // Cosmetic seat preparation (including AI seats), never a count of human connections.
    // Local PRNG leaves gameplay Random untouched. A match has the same cadence on every client.
    public sealed class NeonQueueProgress
    {
        readonly float[] arrivals = new float[NeonArenaRules.PlayerSeats];
        readonly float[] departures;
        readonly float[] returns;
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
            float finish = 15f - .65f;
            for (int i = 1; i < arrivals.Length; i++) arrivals[i] *= finish / total;
            // Some queues have a temporary vacancy, some have none. Never remove the local seat.
            int count = random.NextDouble() < .72 ? (random.NextDouble() < .3 ? 2 : 1) : 0;
            departures = new float[count]; returns = new float[count];
            for (int i = 0; i < count; i++)
            {
                departures[i] = i == 0 ? 4 + (float)random.NextDouble() * 2 : 9 + (float)random.NextDouble();
                returns[i] = departures[i] + 1.2f + (float)random.NextDouble() * .7f;
            }
        }
        public int CountAt(float elapsed)
        {
            elapsed *= 15f / NeonArenaRules.QueueSeconds;
            int count = 0;
            foreach (float time in arrivals) if (elapsed >= time) count++;
            for (int i = 0; i < departures.Length; i++)
                if (elapsed >= departures[i] && elapsed < returns[i])
                {
                    // Freeze joins during a departure so the vacancy can actually be seen.
                    int atDeparture = 0;
                    foreach (float time in arrivals) if (departures[i] >= time) atDeparture++;
                    return Math.Max(1, atDeparture - 1);
                }
            return count;
        }
    }
}
