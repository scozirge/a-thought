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
        protected bool ReadyToAcquire;
        WaitToDo<float> WaitToAcquire;
        [SerializeField]
        protected Transform Appearance;
        public bool IsActive = true;

        protected virtual void Start()
        {
            MyAutoMove = GetComponent<LootMove>();
            LootSpawner.Register(this);
            //RandomPos();
            if (WaitToBeAcquire != 0)
                WaitToAcquire = new WaitToDo<float>(WaitToBeAcquire, WaitToMoveToAcquire, true);
            else
                WaitToMoveToAcquire();
        }
        void RandomPos()
        {
            if (RandomPosRadius == 0)
                return;
            int randX = Random.Range(-RandomPosRadius, RandomPosRadius);
            int randY = Random.Range(-RandomPosRadius, RandomPosRadius);
            transform.position += new Vector3(randX, randY);
        }
        void Update()
        {
            if (WaitToAcquire != null)
                WaitToAcquire.RunTimer();
        }
        void WaitToMoveToAcquire()
        {
            ReadyToAcquire = true;
        }
        void OnDestroy()
        {
            LootSpawner.Unregister(this);
        }
        [PunRPC]
        public void SetActive(bool _bool)
        {
            bool wasActive = IsActive;
            IsActive = _bool;
            if (_bool && !wasActive)
            {
                ReadyToAcquire = WaitToBeAcquire <= 0;
                WaitToAcquire = ReadyToAcquire ? null : new WaitToDo<float>(WaitToBeAcquire, WaitToMoveToAcquire, true);
            }
            if (Appearance != null) Appearance.gameObject.SetActive(_bool);
            if (!_bool)
            {
                ReadyToAcquire = false;
                WaitToAcquire = null;
                if (MyAutoMove != null) MyAutoMove.ResetForReuse(false);
            }
        }
        [PunRPC]
        public virtual void SetLoot(bool _active, Vector2 _pos,Vector2 _force)
        {
            SetActive(_active);
            if (_active)
            {
                transform.position = _pos;
                ReadyToAcquire = WaitToBeAcquire <= 0;
                WaitToAcquire = ReadyToAcquire ? null : new WaitToDo<float>(WaitToBeAcquire, WaitToMoveToAcquire, true);
            }

        }
    }
}
