using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Starbro.NeonIO;
using Neon.Networking;
namespace Scoz.Func
{
    public class LootAbsorber : MonoBehaviour
    {
        [LabelOverride("腳色物件")]
        [SerializeField]
        Role MySelf = null;

        Rigidbody2D MyRigid;
        CircleCollider2D MyCircleCol;
        void Start()
        {
            if (!MyCircleCol)
                AddCol();
            if (!MyRigid)
                AddRigid();
        }
        void AddCol()
        {
            MyCircleCol = gameObject.AddComponent<CircleCollider2D>();
            MyCircleCol.isTrigger = true;
            MyCircleCol.enabled = false;
        }
        void AddRigid()
        {
            MyRigid = gameObject.AddComponent<Rigidbody2D>();
            MyRigid.bodyType = RigidbodyType2D.Kinematic;
        }
        public void SetAbsorbRange(int _range)
        {
            if (!MyCircleCol)
                AddCol();
            if (!MyRigid)
                AddRigid();
            MyCircleCol.radius = _range;
            MyCircleCol.enabled = MySelf && MySelf.CanCollectStars;
        }
        public void SetDontAbsorb()
        {
            if (!MyCircleCol)
                AddCol();
            if (!MyRigid)
                AddRigid();
            MyCircleCol.enabled = false;
        }

        void OnTriggerStay2D(Collider2D collider)
        {
            if (MySelf == null || !MySelf.IsAlive || !MySelf.CanCollectStars || !collider.CompareTag("Loot")) return;
            LootMove movement = collider.GetComponent<LootMove>();
            Loot loot = collider.GetComponent<Loot>();
            if (movement == null || loot == null || !loot.IsActive) return;
            if (PhotonNetwork.IsConnected && !movement.photonView.IsMine) return;
            movement.SetMoveToTarget(MySelf.transform);
        }
    }
}
