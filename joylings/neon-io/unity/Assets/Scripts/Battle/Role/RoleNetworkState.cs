using System;
using UnityEngine;

namespace Starbro.NeonIO
{
    // Persistent state for Fusion snapshots. One-shot hit, sound and cast effects stay RPCs.
    [Serializable]
    public sealed class RoleNetworkState
    {
        public int health, maxHealth, level, id, experience, stars, kills, lifeRevision;
        public bool alive;
        public Vector3 moveDirection;
        public float arrowAngle;
        public string name, title;
        public int head, body, back;
        public RoleBufferState[] buffs;
    }

    [Serializable]
    public sealed class RoleBufferState
    {
        public int type;
        public float time, value, value2;
    }
}
