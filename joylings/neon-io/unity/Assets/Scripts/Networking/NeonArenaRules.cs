using UnityEngine;

namespace Neon.Networking
{
    public static class NeonArenaRules
    {
        public const int PlayerSeats = 16, ResourceBots = 16, Total = 32;
        public const int InitialPlayerHealth = 1500;
        public const int ResourceBotHealth = 1000;
        public const float QueueSeconds = 1, StarSeconds = 10, InitialRadius = 4000;
        public const float StormDelay = 15, StormDuration = 75;
        public const int GroundStarLimit = 384;
        static float AreaRatio(float radius)
        {
            float ratio = Mathf.Clamp01(radius / InitialRadius);
            return ratio * ratio;
        }
        public static int AmbientStarsPerWindow(float radius)
        {
            float ratio = Mathf.Clamp01(radius / InitialRadius);
            return ratio > .5f ? 4 : ratio > .25f ? 2 : ratio > .2f ? 1 : 0;
        }
        public static int AmbientStarLimit(float radius) => Mathf.FloorToInt(GroundStarLimit * AreaRatio(radius));
        public static float AmbientStarInterval(float radius)
        {
            int count = AmbientStarsPerWindow(radius);
            return count > 0 ? StarSeconds / count : StarSeconds;
        }
        public static bool CanSpawnAmbientStar(float radius, int nearby, int total) =>
            AmbientStarsPerWindow(radius) > 0 && nearby < AmbientStarLimit(radius) && total < GroundStarLimit;
        // A short opening, then visible continuous pressure without changing the star density rules.
        public static float Radius(float elapsed) => InitialRadius * Mathf.Clamp01(1 - Mathf.Max(0, elapsed - StormDelay) / StormDuration);
        public static int StormDamage(float elapsed, int maxHealth) => Mathf.Max(1, Mathf.CeilToInt(maxHealth * (.035f + Mathf.Floor(elapsed / 30) * .015f)));
        public static int PlacementReward(int rank) => rank >= 1 && rank <= PlayerSeats ? (PlayerSeats + 1 - rank) * 2 + (rank == 1 ? 10 : 0) : 0;
        public static int KillReward(int kills) => Mathf.Clamp(kills, 0, Total - 1) * 3;
        public static int DamageReward(int damage) => Mathf.Clamp(damage / 500, 0, 30);
        public static int Reward(int rank, int kills, int damage) => PlacementReward(rank) + KillReward(kills) + DamageReward(damage);
        public static int DropCount(int slot) => slot >= 0 && slot < Total ? (slot < PlayerSeats ? 2 : 1) : 0;
    }
}
