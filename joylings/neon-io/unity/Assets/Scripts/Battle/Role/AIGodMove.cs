using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;

namespace Starbro.NeonIO
{

    public class AIGodMove : MonoBehaviour
    {

        [LabelOverride("多久改變一次方向")]
        [SerializeField]
        Vector2 RoamChangeDirCircle = new Vector2(0.5f, 3);
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
        GodRole GRole = null;
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
            if (GRole == null || !GRole.IsInitialized || !GRole.IsAlive) return;
            if (PhotonNetwork.IsConnected && !GRole.photonView.IsMine) return;
            if (RoamTimer != null)
                RoamTimer.RunTimer();
            Move();
        }
        void Move()
        { 
            if (!GRole.BuffersExist(RoleBuffer.Stun))
                MyRigid.linearVelocity = CurrentToward * GRole.MoveSpeed;
            if (!Circle.CheckIfPosAwayFromCircumference(transform.position, Vector2.zero, BattleManager.BM.BattleFieldRadius, AwayFromBorderDist))
            {
                AwayFromBorderTowardCenter();
            }
        }
        void AwayFromBorderTowardCenter()
        {
            CurrentToward = (Vector3.zero - transform.position).normalized;
        }

        void Roam()
        {
            float faceAngle = Random.Range(0, 360);
            GameObject lootGo = GameobjectFinder.FindInRangeClosestGameobjectWithTag(GRole.gameObject, DetectStarRadius, "Loot");
            if (lootGo != null && ProbabilityGetter.GetResult(FaceClosestStarProbability))
            {
                faceAngle = GetFaceTargetAngle(lootGo.transform);
            }
            else
            {

                if (GRole.HealthRatio > HPBelow)
                {
                    Role targetRole = GameobjectFinder.FindClosestRole(GRole.gameObject);
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
                    Role targetRole = GameobjectFinder.FindClosestRole(GRole.gameObject);
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
