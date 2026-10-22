using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
using Neon.Networking;
namespace Scoz.Func
{
    [RequireComponent(typeof(Rigidbody2D))]
    public class LootMove : MonoBehaviourPunCallbacks
    {
        [Tooltip("移動到指定座標後會不會遊蕩")]
        [SerializeField]
        protected bool Wander;
        [LabelOverride("移動速度")]
        [SerializeField]
        public int MoveSpeed;
        [LabelOverride("遊蕩時間間隔")]
        [SerializeField]
        protected float WanderInterval;
        [LabelOverride("轉向係數")]
        [SerializeField]
        protected float RotateFactor;
        [LabelOverride("自身周圍遊蕩範圍")]
        [SerializeField]
        protected float WanderRange;
        [LabelOverride("超過起始點多遠時停止")]
        [Tooltip("0代表沒有距離限制")]
        [SerializeField]
        protected float MaxRange;
        [LabelOverride("幾秒後停止移動")]
        [SerializeField]
        protected float StopMoveTime = 0;


        [LabelOverride("吸收速度")]
        [SerializeField]
        protected int AbsorbSpeed;
        [SerializeField]
        protected Rigidbody2D MyRigi;

        public bool MoveToPlayer;
        protected bool CanMove;
        protected static float WanderRadius = 50;
        protected Vector3 OriginalPos;
        protected Vector3 TargetPos;
        protected float WanderIntervalTimer;
        protected Vector3 WanderVelocity;

        bool StartWander = false;
        MyTimer StopMoveTimer;

        protected Transform TargetTrans;


        protected virtual void Start()
        {

            if (MyRigi == null) MyRigi = GetComponent<Rigidbody2D>();
            OriginalPos = transform.position;
            TargetPos = OriginalPos;
            WanderIntervalTimer = 0;
            WanderIntervalTimer = WanderInterval;
            StartWander = Wander;
            CanMove = GetComponent<Loot>() == null || GetComponent<Loot>().IsActive;
            if (StopMoveTime > 0)
                StopMoveTimer = new MyTimer(StopMoveTime, StopMove, true, false);
        }
        void StopMove()
        {
            MyRigi.linearVelocity = Vector2.zero;
            StartWander = false;
        }

        public void SetVelocity(Vector2 _force)
        {
            if (MyRigi == null) MyRigi = GetComponent<Rigidbody2D>();
            if (MyRigi != null && (!PhotonNetwork.IsConnected || photonView.IsMine)) MyRigi.linearVelocity = _force;
        }
        void WanderTimerFunc()
        {
            if (!Wander)
                return;
            if (WanderIntervalTimer > 0)
                WanderIntervalTimer -= Time.deltaTime;
            else
            {
                WanderIntervalTimer = WanderInterval;
                CalculateRandDestination();
            }
        }
        protected void CalculateRandDestination()
        {
            TargetPos = new Vector2(Random.Range(-WanderRange, WanderRange), Random.Range(-WanderRange, WanderRange)) + (Vector2)transform.position;
            StartWander = true;
        }
        protected virtual void WanderMovement()
        {
            if (StartWander)
            {
                WanderVelocity = (TargetPos - transform.position).normalized * MoveSpeed;
                MyRigi.linearVelocity = Vector2.Lerp(MyRigi.linearVelocity, WanderVelocity, RotateFactor);
                if (Vector3.Distance(OriginalPos, transform.position) > MaxRange)
                {
                    TargetPos = OriginalPos;
                    MyRigi.linearVelocity = (TargetPos - transform.position).normalized * MoveSpeed;
                    StartWander = false;
                }
            }
        }

        void FixedUpdate()
        {
            if (PhotonNetwork.IsConnected && !photonView.IsMine) return;
            if (CanMove)
            {
                if (!MoveToPlayer)
                {
                    WanderMovement();
                }
                else
                {
                    MoveToTargetFunc();
                }
            }
        }
        public void SetMoveToTarget(Transform _trans)
        {
            if (MoveToPlayer)//只會接收一次設定移動目標，第二個玩家想要吸收就沒辦法
                return;
            TargetTrans = _trans;
            MoveToPlayer = true;
        }
        [PunRPC]
        public void SetMoveToTarget_RPC(int _senderView)
        {
            PhotonView senderView = PhotonView.Find(_senderView);
            if (PhotonNetwork.IsConnected && !photonView.IsMine) return;
            if (senderView == null)
                return;
            if (MoveToPlayer)//只會接收一次設定移動目標，第二個玩家想要吸收就沒辦法
                return;
            TargetTrans = senderView.transform;
            MoveToPlayer = true;
        }
        void MoveToTargetFunc()
        {
            if (TargetTrans != null)
            {
                Role role = TargetTrans.GetComponent<Role>();
                if (role != null && !role.IsAlive) TargetTrans = null;
            }
            if (MoveToPlayer && TargetTrans != null)
            {
                MyRigi.linearVelocity = Vector2.Lerp(MyRigi.linearVelocity, (TargetTrans.position - transform.position).normalized * AbsorbSpeed, RotateFactor);
                //MyRigi.velocity += (Vector2)(TargetTrans.position - transform.position).normalized * AbsorbSpeed * RotateFactor;
            }
            else
            {
                MoveToPlayer = false;
            }
        }
        public void ResetForReuse(bool active)
        {
            CanMove = active;
            MoveToPlayer = false;
            TargetTrans = null;
            OriginalPos = transform.position;
            TargetPos = OriginalPos;
            StartWander = active && Wander;
            WanderIntervalTimer = WanderInterval;
            if (MyRigi == null) MyRigi = GetComponent<Rigidbody2D>();
            if (!active && MyRigi != null) MyRigi.linearVelocity = Vector2.zero;
            StopMoveTimer = active && StopMoveTime > 0 ? new MyTimer(StopMoveTime, StopMove, true, false) : null;
        }
        public void SetCanMove(bool _bool)
        {
            CanMove = _bool;
        }
        protected virtual void Update()
        {
            if (PhotonNetwork.IsConnected && !photonView.IsMine) return;
            if (StopMoveTimer != null)
                StopMoveTimer.RunTimer();
            if (CanMove)
                WanderTimerFunc();
        }
    }
}
