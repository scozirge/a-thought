using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
using Neon.Networking;
namespace Scoz.Func
{
    [RequireComponent(typeof(Collider2D))]
    public abstract class Loot :MonoBehaviourPunCallbacks
    {
        [SerializeField]
        protected float WaitToBeAcquire = 0;
        [Tooltip("掉落隨機位置半徑")]
        [SerializeField]
        protected int RandomPosRadius = 0;
        LootMove MyAutoMove;
        public double PickupReadyAt { get; private set; }
        protected bool ReadyToAcquire => IsActive && PhotonNetwork.Time >= PickupReadyAt;
        bool pickupConfigured;
        [SerializeField]
        protected Transform Appearance;
        public bool IsActive = true;

        protected virtual void Start()
        {
            MyAutoMove = GetComponent<LootMove>();
            LootSpawner.Register(this);
            //RandomPos();
            if (pickupConfigured) return;
            PickupReadyAt = PhotonNetwork.Time + WaitToBeAcquire;
        }
        void RandomPos()
        {
            if (RandomPosRadius == 0)
                return;
            int randX = Random.Range(-RandomPosRadius, RandomPosRadius);
            int randY = Random.Range(-RandomPosRadius, RandomPosRadius);
            transform.position += new Vector3(randX, randY);
        }
        protected void DelayPickup(float seconds)
        {
            pickupConfigured = true;
            PickupReadyAt = PhotonNetwork.Time + Mathf.Max(WaitToBeAcquire, seconds);
        }
        public void RestorePickupDeadline(double deadline)
        {
            pickupConfigured = true;
            PickupReadyAt = deadline;
        }
        void OnDestroy()
        {
            LootSpawner.Unregister(this);
        }
        [PunRPC]
        public void SetActive(bool _bool)
        {
            if (MyAutoMove == null) MyAutoMove = GetComponent<LootMove>();
            bool wasActive = IsActive;
            IsActive = _bool;
            if (_bool && !wasActive)
            {
                PickupReadyAt = PhotonNetwork.Time + WaitToBeAcquire;
            }
            if (Appearance != null) Appearance.gameObject.SetActive(_bool);
            if (!_bool)
            {
                PickupReadyAt = 0;
                if (MyAutoMove != null) MyAutoMove.ResetForReuse(false);
            }
        }
        [PunRPC]
        public virtual void SetLoot(bool _active, Vector2 _pos,Vector2 _force)
        {
            pickupConfigured = true;
            SetActive(_active);
            if (_active)
            {
                transform.position = _pos;
                PickupReadyAt = PhotonNetwork.Time + WaitToBeAcquire;
            }

        }
    }
}
