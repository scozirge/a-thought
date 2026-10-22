using System.Collections.Generic;
using UnityEngine;

namespace Starbro.NeonIO
{
    // Registration follows enabled objects, including pooled projectiles. Queries
    // use indexed reads to avoid scene scans, sorting and per-frame array allocation.
    public static class CombatRegistry
    {
        static readonly List<Role> roles = new List<Role>();
        static readonly List<ShootAmmo> projectiles = new List<ShootAmmo>();
        public static IReadOnlyList<Role> Roles => roles;
        public static IReadOnlyList<ShootAmmo> Projectiles => projectiles;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void Reset() { roles.Clear(); projectiles.Clear(); }
        internal static void Add(Role role) { if (!roles.Contains(role)) roles.Add(role); }
        internal static void Remove(Role role) { roles.Remove(role); }
        internal static void Add(ShootAmmo ammo) { if (!projectiles.Contains(ammo)) projectiles.Add(ammo); }
        internal static void Remove(ShootAmmo ammo) { projectiles.Remove(ammo); }
        public static bool IsTarget(Role role) => role && role.isActiveAndEnabled && role.IsInitialized && role.IsAlive;

        public static bool TryIndicatorPosition(Vector2 delta, Vector2 halfView, float inset, out Vector2 position)
        {
            position = Vector2.zero;
            if (halfView.x <= 0 || halfView.y <= 0 ||
                (Mathf.Abs(delta.x) < halfView.x && Mathf.Abs(delta.y) < halfView.y)) return false;
            var edge = new Vector2(Mathf.Max(1, halfView.x - inset), Mathf.Max(1, halfView.y - inset));
            float ratio = Mathf.Max(Mathf.Abs(delta.x) / edge.x, Mathf.Abs(delta.y) / edge.y);
            if (ratio <= 0) return false;
            position = delta / ratio;
            return true;
        }
    }
}
