using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;

namespace Starbro.NeonIO
{
    public enum MoveState
    {
        Roam,
        Escape,
        Chase,
    }

    public class AIRoleMove : MonoBehaviour
    {

        [LabelOverride("多久改變一次方向")]
        [SerializeField]
        Vector2 RoamChangeDirCircle = new Vector2(1f, 3);
        [LabelOverride("血多面向玩家機率")]
        [SerializeField]
        float FaceClosestRoleProbability = 0.5f;
        [LabelOverride("對方血少面向玩家機率")]
        [SerializeField]
        float FaceClosestDyingRoleProbability = 0.8f;
        [LabelOverride("血少逃離玩家機率")]
        [SerializeField]
        float EscapeFromClosestRoleProbability = 0.5f;
        [LabelOverride("距離內面向星星機率")]
        [SerializeField]
        float FaceClosestStarProbability = 1f;
        [LabelOverride("星星搜索半徑")]
        [SerializeField]
        int DetectStarRadius = 500;
        [LabelOverride("幾%以下算血少")]
        [SerializeField]
        float HPBelow = 0.5f;
        [LabelOverride("保持邊界距離")]
        [SerializeField]
        int AwayFromBorderDist = 100;
        [SerializeField]
        NeutralRole NRole = null;
        [SerializeField]
        Rigidbody2D MyRigid = null;



        MyTimer RoamTimer;
        Vector3 CurrentToward;
        // Start is called before the first frame update
        void Start()
        {
            RoamTimer = new MyTimer(RoamChangeDirCircle.x, Roam, true, true);
        }

        // Update is called once per frame
        void Update()
        {
            if (NRole == null || !NRole.IsInitialized || !NRole.IsAlive) return;
            if (PhotonNetwork.IsConnected && !NRole.photonView.IsMine) return;
            if (NRole.IsArenaPlayerSeat)
            {
                CurrentToward = NRole.ArenaBrain.Movement;
            }
            else if (RoamTimer != null) RoamTimer.RunTimer();
            if (PhotonNetwork.IsConnected)
            {
                if (NRole.photonView.IsMine)
                {
                    Move();
                }
            }
            else
                Move();

        }
        void Move()
        {
            if (NeonArenaFlow.CombatBlocked) { MyRigid.linearVelocity = Vector2.zero; return; }
            if (NeonArenaFlow.Active && NeonArena.Instance && transform.position.sqrMagnitude > Mathf.Pow(Mathf.Max(0, NeonArena.Instance.Radius - (NRole.IsArenaPlayerSeat ? Mathf.Min(NRole.ArenaDifficulty.Margin, NeonArena.Instance.Radius * .15f) : 200)), 2))
                AwayFromBorderTowardCenter();
            if (!NRole.BuffersExist(RoleBuffer.Stun))
                MyRigid.linearVelocity = CurrentToward * NRole.MoveSpeed;
            /*
            if (!Circle.CheckIfPosAwayFromCircumference(transform.position, Vector2.zero, BattleManager.BM.BattleFieldRadius, AwayFromBorderDist))
            {
                AwayFromBorderTowardCenter();
            }
            */
        }

        void AwayFromBorderTowardCenter()
        {
            CurrentToward = (Vector3.zero - transform.position).normalized;
            /*
            if (PhotonNetwork.IsConnected)
            {
                if (NRole.photonView.IsMine)
                {
                    NRole.photonView.RPC("SetArrowTargetAngle", RpcTarget.All, MyMath.GetAngleFromVelocity(CurrentToward));
                }
            }
            else
            {
                NRole.SetArrowTargetAngle(MyMath.GetAngleFromVelocity(CurrentToward));
            }
            */
        }
        void Roam()
        {
            float faceAngle = Random.Range(0, 360);
            if (NRole.IsArenaResourceBot)
            {
                // Resource monsters wander and use their normal attacks; no loot seeking or loadout tactics.
                CurrentToward = MyMath.GetEulerFromAngle(faceAngle);
                RoamTimer.ResetCircleTime(Random.Range(RoamChangeDirCircle.x, RoamChangeDirCircle.y));
                return;
            }
            GameObject lootGo = GameobjectFinder.FindInRangeClosestGameobjectWithTag(NRole.gameObject, DetectStarRadius, "Loot");
            if (lootGo != null && ProbabilityGetter.GetResult(FaceClosestStarProbability))
            {
                faceAngle = GetFaceTargetAngle(lootGo.transform);
            }
            else
            {

                if (NRole.HealthRatio > HPBelow)
                {
                    Role targetRole = GameobjectFinder.FindClosestRole(NRole.gameObject);
                    if (targetRole != null && targetRole.HealthRatio > HPBelow)
                    {
                        if (ProbabilityGetter.GetResult(FaceClosestRoleProbability))
                        {
                            faceAngle = GetFaceTargetAngle(targetRole.transform);
                        }
                    }
                    else
                    {
                        if (ProbabilityGetter.GetResult(FaceClosestDyingRoleProbability))
                        {
                            if (targetRole != null)
                                faceAngle = GetFaceTargetAngle(targetRole.transform);
                        }
                    }
                }
                else
                {
                    Role targetRole = GameobjectFinder.FindClosestRole(NRole.gameObject);
                    if (targetRole != null && targetRole.HealthRatio > HPBelow)
                    {
                        if (ProbabilityGetter.GetResult(EscapeFromClosestRoleProbability))
                        {
                            if (targetRole != null)
                                faceAngle = GetEscapeFromTargetAngle(targetRole.transform);
                        }
                    }
                    else
                    {
                        if (ProbabilityGetter.GetResult(FaceClosestDyingRoleProbability))
                        {
                            if (targetRole != null)
                                faceAngle = GetFaceTargetAngle(targetRole.transform);
                        }
                    }
                }
            }

            CurrentToward = MyMath.GetEulerFromAngle(faceAngle);
            RoamTimer.ResetCircleTime(Random.Range(RoamChangeDirCircle.x, RoamChangeDirCircle.y));
        }

        float GetFaceTargetAngle(Transform _target)
        {
            float faceAngle = 0;
            if (_target != null)
                faceAngle = 270 - MyMath.GetAngerFormTowPoint2D(transform.position, _target.position);
            return faceAngle;
        }

        float GetEscapeFromTargetAngle(Transform _target)
        {
            float faceAngle = 0;
            if (_target != null)
                faceAngle = 270 - MyMath.GetAngerFormTowPoint2D(transform.position, _target.position) + 180;
            return faceAngle;
        }
    }
}
