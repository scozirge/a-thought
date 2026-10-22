using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
namespace Scoz.Func
{
    public class FollowPlayerRole : MonoBehaviour
    {
        [SerializeField]
        PlayerRole Target = null;
        [SerializeField]
        float LerpFactor = 1;
        [SerializeField]
        bool Lookforward = false;
        [SerializeField]
        int LookforwardDist = 0;
        Vector3 Offset;
        Vector3 OriginalPos;

        public bool FixX = false;
        public bool FixY = false;
        public bool FixZ = true;
        protected Vector3 Destination = Vector3.zero;
        void Start()
        {
            if (!Target)
            {
                return;
            }
            //Calculate and store the offset value by getting the distance between the player's position and camera's position.
            OriginalPos = transform.position;
            Offset = transform.position - Target.transform.position;
        }
        void FixedUpdate()
        {
            if (!Target)
                return;
            Vector3 destination = GetDestination();
            if (FixX)
                destination.x = OriginalPos.x;
            if (FixY)
                destination.y = OriginalPos.y;
            if (FixZ)
                destination.z = OriginalPos.z;
            transform.position = Vector3.Lerp(transform.position, destination, LerpFactor);

        }
        protected virtual Vector2 GetDestination()
        {
            Vector2 destination = Target.transform.position + Offset;
            if (Lookforward)
                destination += LookforwardDist * (Vector2)Target.Movetorward.normalized;
            return destination;
        }
        public void SetFollowObj(PlayerRole _target)
        {
            Target = _target;
        }
    }
}
