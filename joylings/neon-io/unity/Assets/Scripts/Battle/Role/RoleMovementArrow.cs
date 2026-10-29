using UnityEngine;

namespace Starbro.NeonIO
{
    // The arrow is a movement cue. The parent also holds the melee collider and
    // skill effects, so only move the sprite: never overwrite combat aim.
    [DefaultExecutionOrder(1000)]
    public sealed class RoleMovementArrow : MonoBehaviour
    {
        Role role;
        Transform arrow, aim;
        Vector3 restOffset, previousPosition;
        Quaternion restRotation;
        float heading;
        bool sampled;

        public static void Attach(Role owner, Transform facing)
        {
            var sprite = facing ? facing.Find("arrow") : null;
            if (!sprite || !sprite.GetComponent<SpriteRenderer>()) return;
            var cue = owner.GetComponent<RoleMovementArrow>() ?? owner.gameObject.AddComponent<RoleMovementArrow>();
            cue.role = owner; cue.aim = facing; cue.arrow = sprite;
            cue.restOffset = sprite.localPosition; cue.restRotation = sprite.localRotation;
            cue.heading = facing.eulerAngles.z;
        }

        void OnEnable() { sampled = false; }
        void LateUpdate()
        {
            if (!role || !arrow || !aim || !role.IsInitialized) return;
            Vector3 position = role.transform.position;
            Vector2 velocity = role.MyRigi ? role.MyRigi.linearVelocity : Vector2.zero;
            Vector2 displacement = position - previousPosition;
            // Match a proxy's visible, interpolated motion, not its slower aim snapshot.
            // Ignore spawn/teleport jumps; their direction is not locomotion.
            if (!role.HasSimulationAuthority && sampled && displacement.sqrMagnitude < 1000000 &&
                Time.unscaledDeltaTime > 0)
                velocity = displacement / Time.unscaledDeltaTime;
            previousPosition = position; sampled = true;
            if (!role.IsAlive) return;
            heading = MovementHeading(velocity, heading);
            ApplyPose(arrow, aim, restOffset, restRotation, heading);
        }

        public static float MovementHeading(Vector2 velocity, float previous)
            => velocity.sqrMagnitude > .25f ? Mathf.Atan2(velocity.y, velocity.x) * Mathf.Rad2Deg - 90 : previous;

        public static void ApplyPose(Transform sprite, Transform facing, Vector3 offset, Quaternion rotation, float angle)
        {
            Quaternion relative = Quaternion.Inverse(facing.rotation) * Quaternion.Euler(0, 0, angle);
            sprite.localPosition = relative * offset;
            sprite.localRotation = relative * rotation;
        }
    }
}
