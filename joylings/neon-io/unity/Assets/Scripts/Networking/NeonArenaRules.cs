using UnityEngine;

namespace Neon.Networking
{
    public static class NeonArenaRules
    {
        public const int PlayerSeats = 16, ResourceBots = 16, Total = 32;
        public const float QueueSeconds = 15, StarSeconds = 10, InitialRadius = 4000;
        public const int StarsPerWave = 24, GroundStarLimit = 384;
        static float AreaRatio(float radius)
        {
            float ratio = Mathf.Clamp01(radius / InitialRadius);
            return ratio * ratio;
        }
        public static int AmbientStarsPerWindow(float radius) => Mathf.FloorToInt(StarsPerWave * AreaRatio(radius));
        public static int AmbientStarLimit(float radius) => Mathf.FloorToInt(GroundStarLimit * AreaRatio(radius));
        public static float AmbientStarInterval(float radius)
        {
            int count = AmbientStarsPerWindow(radius);
            return count > 0 ? StarSeconds / count : StarSeconds;
        }
        public static bool CanSpawnAmbientStar(float radius, int nearby, int total) =>
            AmbientStarsPerWindow(radius) > 0 && nearby < AmbientStarLimit(radius) && total < GroundStarLimit;
        // Thirty seconds to gather, then a smooth collapse; storm damage escalates every 30 seconds.
        public static float Radius(float elapsed) => InitialRadius * Mathf.Clamp01(1 - Mathf.Max(0, elapsed - 30) / 210);
        public static int StormDamage(float elapsed, int maxHealth) => Mathf.Max(1, Mathf.CeilToInt(maxHealth * (.035f + Mathf.Floor(elapsed / 30) * .015f)));
        public static int PlacementReward(int rank) => rank >= 1 && rank <= PlayerSeats ? (PlayerSeats + 1 - rank) * 2 + (rank == 1 ? 10 : 0) : 0;
        public static int KillReward(int kills) => Mathf.Clamp(kills, 0, Total - 1) * 3;
        public static int DamageReward(int damage) => Mathf.Clamp(damage / 500, 0, 30);
        public static int Reward(int rank, int kills, int damage) => PlacementReward(rank) + KillReward(kills) + DamageReward(damage);
        public static int DropCount(int slot) => slot >= 0 && slot < Total ? (slot < PlayerSeats ? 3 : 1) : 0;
    }
}
