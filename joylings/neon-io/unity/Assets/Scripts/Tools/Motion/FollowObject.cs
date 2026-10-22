using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
namespace Scoz.Func
{
    public class FollowObject : MonoBehaviour
    {
        [SerializeField]
        GameObject Target = null;
        [SerializeField]
        float LerpFactor = 1;
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
            Vector3 destination = Target.transform.position + Offset;
            if (FixX)
                destination.x = OriginalPos.x;
            if (FixY)
                destination.y = OriginalPos.y;
            if (FixZ)
                destination.z = OriginalPos.z;
            transform.position = Vector3.Lerp(transform.position, destination, LerpFactor);

        }
        public void SetFollowObj(GameObject _target)
        {
            Target = _target;
        }
    }
}
