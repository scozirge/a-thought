using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;

namespace Starbro.NeonIO
{
    public class NeutralRole : Role
    {
        #region Public Field
        [HideInInspector]
        public bool IsMovableRole = false;//是否為會動的怪，若為會動的怪物則Movetorward要根據目前的移動方向而定
        public int Kills;//AI殺敵數
        #endregion

        #region Private Field
        //箭頭朝向目標
        float ArrowTargetAngle = 0;
        [LabelOverride("偵測目標週期")]
        [SerializeField]
        float DetectTargetInterval = 0.5f;
        MyTimer DetectTargetTimer;
        [LabelOverride("獲得經驗特效")]
        [SerializeField]
        ParticleSystem GainExpEffect = null;
        [LabelOverride("獲得經驗音效")]
        [SerializeField]
        AudioClip GainExpSound = null;
        int Exp = 0;
        [SerializeField]
        int[] NeedExpList = null;
        int LVUpExp
        {
            get
            {
                int needExp = 0;
                if ((LV - 1) < 3)
                {
                    needExp = NeedExpList[LV - 1];
                }
                else
                    needExp = NeedExpList[3];
                return needExp;
            }
        }

        //Challenge戰場時專用
        FeatureData[] FeatureDatas_C;
        bool IsAIChallengeRole = false;
        int CurSelectFeatureID = 0;
        MyTimer ChangeFeatureTimer;


        #endregion

        #region MonoBehaviour Func
        public override void Init()
        {
            if (IsInit || !CanInitialize)
                return;
            //重生在外圍隨機地點
            if (HasSimulationAuthority)
                transform.position = Circle.GetRandomPosInCircle(Vector2.zero, BattleManager.BM.SpawnRoleRadius);
            MyForce = Force.Neutral;
            tag = MyForce.ToString();
            DetectTargetTimer = new MyTimer(DetectTargetInterval, ExecuteDetectTarget, true, true);
            base.Init();
            if (GetComponent<AIRoleMove>() != null)
                GetComponent<AIRoleMove>().enabled = true;

        }
        protected override void Update()
        {
            base.Update();
            if (!IsInit) return;
            if (HasSimulationAuthority && IsAlive && DetectTargetTimer != null)
                DetectTargetTimer.RunTimer();
            ArrowRotate();
            if (HasSimulationAuthority && IsAlive && ChangeFeatureTimer != null)
                ChangeFeatureTimer.RunTimer();
        }
        #endregion

        #region Public Func
        [PunRPC]
        public void SetPlayerData(string _name, int _id)
        {
            if (_name != "")
                NameLabel.gameObject.SetActive(true);
            if (ID != _id && BattleManager.BM.NeutralRoleDic.TryGetValue(ID, out NeutralRole previous) && previous == this)
                BattleManager.BM.NeutralRoleDic.Remove(ID);
            ID = _id;

            if (TowardDirTrans != null)
                TowardDirTrans.gameObject.SetActive(true);
            if (_name != "")
                Name = _name;
            else
                Name = StringData.GetString("Guest");
            gameObject.name = _name;
            NameLabel.text = _name;
            if (NeonArenaFlow.Active) { Name = _name; NameLabel.gameObject.SetActive(!string.IsNullOrEmpty(_name)); }
            if (!BattleManager.BM.NeutralRoleDic.ContainsKey(ID))
                BattleManager.BM.NeutralRoleDic.Add(ID, this);
            if (!NeonArenaFlow.Active || !string.IsNullOrEmpty(_name)) BattleManager.BM.MyLeaderBoard.AddPlayer(this);
            if (!NeonArenaFlow.Active && PhotonNetwork.IsConnected && photonView.IsMine)//若玩家是房主 且 此AI名不為Guest 且 該玩家名稱的喊話資料尚未取得 則從DB中取得該玩家的喊話
                if (Name != StringData.GetString("Guest") && Name != "")
                {
                    if (!BattleManager.AIRoleClamorDic.ContainsKey(Name))
                    {
                        ServerRequest.GetClamor(Name);
                    }
                }
        }
        [PunRPC]
        public virtual void Restart()
        {
            if (NeonArenaFlow.Active) return;
            if (!HasSimulationAuthority) return;
            BeginNewLife();
            Exp = 0;
            LV = 1;
            MaxHealth = PhotonLauncher.SelectGameType != GameType.Challenge ? GameSettingData.NeutralHealth : GameSettingData.NeutralHealth_C;
            RemoveAllBuffer();
            RemoveSkill();
            RemoveFeature();
            IsAlive = true;
            gameObject.tag = MyForce.ToString();//復活後要把tag設定回來才會被其他玩家或野怪當成目標
            SetProportionOfHP(1);
            AppearanceObj.SetActive(true);
            SelfCollider.enabled = true;
            //重生在外圍隨機地點
            if (HasSimulationAuthority)
                transform.position = Circle.GetRandomPosInCircle(Vector2.zero, BattleManager.BM.SpawnRoleRadius);
            SizeGrowth();//死亡復活回到原大小
        }
        [PunRPC]
        public virtual void RestartAndChangeName(int _id, string _name)
        {
            if (!HasSimulationAuthority) return;
            BeginNewLife();
            Exp = 0;
            LV = 1;
            MaxHealth = PhotonLauncher.SelectGameType != GameType.Challenge ? GameSettingData.NeutralHealth : GameSettingData.NeutralHealth_C;
            RemoveAllBuffer();
            RemoveSkill();
            RemoveFeature();
            IsAlive = true;
            gameObject.tag = MyForce.ToString();//復活後要把tag設定回來才會被其他玩家或野怪當成目標
            SetProportionOfHP(1);
            AppearanceObj.SetActive(true);
            SelfCollider.enabled = true;
            SetPlayerData(_name, _id);
            //重生在外圍隨機地點
            if (HasSimulationAuthority)
                transform.position = Circle.GetRandomPosInCircle(Vector2.zero, BattleManager.BM.SpawnRoleRadius);
            SizeGrowth();//死亡復活回到原大小
        }
        [PunRPC]
        public override void OnKilling(string _killer, string _loser)
        {
            base.OnKilling(_killer, _loser);
            Kills++;
            if (BattleManager.BM.MyLeaderBoard)
                BattleManager.BM.MyLeaderBoard.SetPlayerScore(ID, Kills);
        }
        [PunRPC]
        public override void BeAttack(int _dmg, Vector2 _force)
        {
            base.BeAttack(_dmg, _force);
        }
        [PunRPC]
        public override void CastSkill(FeaturePart _part, int _featurePartSerialNumber, PhotonMessageInfo _info)
        {
            if (!IsAlive)
                return;
            base.CastSkill(_part, _featurePartSerialNumber, _info);
        }
        [PunRPC]
        public override void SkillSpawnAttackPrefab(FeaturePart _part, int _featurePartSerialNumber, PhotonMessageInfo _info)
        {
            if (!IsAlive)
                return;
            base.SkillSpawnAttackPrefab(_part, _featurePartSerialNumber, _info);
        }
        public override void ReceiveDmg(int _dmg)
        {
            //Debug.Log("N receive dmg=" + _dmg);
            base.ReceiveDmg(_dmg);
        }
        public void GetRandomFeature(FeaturePart _part)
        {
            if (!PhotonNetwork.IsConnected)
            {
                FeatureData randomFeature = FeatureData.GetAIRoleRandomFeatureData(_part);
                GetFeature(_part, randomFeature.ID);
            }
            else if (photonView.IsMine)
            {
                FeatureData randomFeature = FeatureData.GetAIRoleRandomFeatureData(_part);
                photonView.RPC("GetFeature", RpcTarget.AllBuffered, _part, randomFeature.ID);
            }
        }
        public override void Die()//腳色死亡時隱藏
        {
            if (!HasSimulationAuthority || !IsAlive || NeonArenaFlow.CombatBlocked) return;
            base.Die();
            gameObject.tag = "Untagged";//死掉後要把tag設成Untagged才不會被鎖定為攻擊目標
            MyRigi.linearVelocity = Vector3.zero;
            AppearanceObj.SetActive(false);
            SelfCollider.enabled = false;
            Kills = 0;
            if (PhotonNetwork.IsConnected)
            {
                if (photonView.IsMine)
                    BattleManager.BM.OnNeutralRoleDie(ID, NameLabel.text);
            }
            else
                BattleManager.BM.OnNeutralRoleDie(ID, NameLabel.text);

            BattleManager.BM.MyLeaderBoard.RefreshPlayerScore();
            //事先移動重生點在外圍隨機地點(若等復活在移動，其他玩家會看到腳色快速飛到復活點)
            if (HasSimulationAuthority)
                transform.position = Circle.GetRandomPosInCircle(Vector2.zero, BattleManager.BM.SpawnRoleRadius);
        }
        /*
        [PunRPC]
        public void SetArrowTargetAngle(float _angle)
        {
            ArrowTargetAngle = _angle;
        }
        */
        [PunRPC]
        public void GainExp(int _addEXP)
        {
            if (_addEXP <= 0 || !IsAlive)
                return;
            // A merged star keeps the rewards of each original pickup, with one sound/effect.
            if (GainExpEffect) EffectEmitter.EmitParticle(GainExpEffect, Vector3.zero, Vector3.zero, transform, MyForce);
            if (GainExpSound) AudioPlayer.PlaySound(GainExpSound);
            HealProportionOfHP(0);
            if (!HasSimulationAuthority) return;
            for (int i = 0; i < _addEXP; i++)
            {
                Health += Mathf.RoundToInt(MaxHealth * GameSettingData.GainExpHealHP);
                ExecuteSkillTrigger(PSkillTriggerCondition.GainExp);
                Exp++;
                while (LVUpExp > 0 && Exp >= LVUpExp) LevelUp();
            }
        }
        public void LevelUp()
        {
            Exp = Mathf.Max(0, Exp - LVUpExp);
            LV++;
            ExtendMaxHP(GameSettingData.LVUpAddMaxHP);
            List<FeaturePart> lackOfParts = new List<FeaturePart>() { FeaturePart.Head, FeaturePart.Body, FeaturePart.Back };
            if (SkillDic.ContainsKey(FeaturePart.Head))
                lackOfParts.Remove(FeaturePart.Head);
            if (SkillDic.ContainsKey(FeaturePart.Body))
                lackOfParts.Remove(FeaturePart.Body);
            if (SkillDic.ContainsKey(FeaturePart.Back))
                lackOfParts.Remove(FeaturePart.Back);
            if (lackOfParts.Count > 0)
            {
                int randIndex = Random.Range(0, lackOfParts.Count);
                GetRandomFeature(lackOfParts[randIndex]);
            }
            else
            {
                int random = Random.Range(0, System.Enum.GetNames(typeof(FeaturePart)).Length);
                GetRandomFeature((FeaturePart)random);
            }
            if (PhotonNetwork.IsConnected)
                BattleUI.ShowLVUpLog(Name, LV);
            SizeGrowth();
        }
        void SizeGrowth()
        {
            float growthSize = (LV - 1) * GameSettingData.GrowthSizeRatio;
            if (growthSize > GameSettingData.GrowthMaxSizeRatio)
                growthSize = GameSettingData.GrowthMaxSizeRatio;
            AppearanceObj.transform.localScale = new Vector3(1 + growthSize, 1 + growthSize, 1 + growthSize);
        }
        [PunRPC]
        public override void GetFeature(FeaturePart _part, int _featureDataID)
        {
            if (_featureDataID == 0)
                return;
            FeatureData data = FeatureData.GetFeatureData(_featureDataID);
            if (data == null)
                return;
            base.GetFeature(_part, _featureDataID);
        }



        public void SetAIChallengeRole(FeatureData[] featureDatas)
        {
            IsAIChallengeRole = true;
            FeatureDatas_C = featureDatas;
            CurSelectFeatureID = 0;
            for (int i = 0; i < 3; i++)
            {
                photonView.RPC("GetFeature", RpcTarget.All, FeatureDatas_C[CurSelectFeatureID].MyFeaturePart, FeatureDatas_C[CurSelectFeatureID].ID);
                CurSelectFeatureID++;
            }
            ChangeFeatureTimer = new MyTimer(GameSettingData.ChangeFeatureTime_C, ChangeFeature_C, true, true);
            MaxHealth = GameSettingData.Health_C;
            Health = MaxHealth;
            BaseDamage = GameSettingData.Damage_C;
        }
        /// <summary>
        /// Challenge戰場中每一段時間會改變玩家擁有技能
        /// </summary>
        void ChangeFeature_C()
        {
            if (!HasSimulationAuthority || !IsAlive || FeatureDatas_C == null || FeatureDatas_C.Length == 0) return;
            photonView.RPC("GetFeature", RpcTarget.All, FeatureDatas_C[CurSelectFeatureID].MyFeaturePart, FeatureDatas_C[CurSelectFeatureID].ID);
            CurSelectFeatureID = (CurSelectFeatureID + 1) % FeatureDatas_C.Length;
        }
        #endregion

        protected override int GetDeathLootCount()
        {
            if (NeonArenaFlow.Active) return NeonArena.DropCount(this);
            return PhotonLauncher.SelectGameType != GameType.Challenge ? GameSettingData.GetDropExpStarCount(LV) : 0;
        }
        public override RoleNetworkState CaptureNetworkState()
        {
            RoleNetworkState state = base.CaptureNetworkState();
            state.experience = Exp;
            state.kills = Kills;
            return state;
        }
        public override void ApplyNetworkState(RoleNetworkState state)
        {
            if (state == null || !IsInit || HasSimulationAuthority || state.lifeRevision < NetworkLifeRevision) return;
            Exp = Mathf.Max(0, state.experience);
            Kills = Mathf.Max(0, state.kills);
            int previousId = ID;
            base.ApplyNetworkState(state);
            if (BattleManager.BM != null && previousId != ID && BattleManager.BM.NeutralRoleDic.TryGetValue(previousId, out NeutralRole previous) && previous == this)
                BattleManager.BM.NeutralRoleDic.Remove(previousId);
            if (BattleManager.BM != null && !BattleManager.BM.NeutralRoleDic.ContainsKey(ID))
                SetPlayerData(Name, ID);
        }
        void OnDestroy()
        {
            if (BattleManager.BM != null && BattleManager.BM.NeutralRoleDic.TryGetValue(ID, out NeutralRole role) && role == this)
                BattleManager.BM.NeutralRoleDic.Remove(ID);
        }

        #region Private Func
        protected override void GetProperties()
        {
            base.GetProperties();
            if (UseJsonData)
            {
                if (PhotonLauncher.SelectGameType != GameType.Challenge)
                {
                    MaxHealth = GameSettingData.NeutralHealth;
                    BaseDamage = GameSettingData.NeutralDamage;

                }
                else
                {
                    MaxHealth = GameSettingData.NeutralHealth_C;
                    BaseDamage = GameSettingData.NeutralDamage_C;
                }
                NeedExpList = GameSettingData.NeedExps;
            }
            Health = MaxHealth;
        }
        protected override Role FindClosestOpponent()
        {
            base.FindClosestOpponent();
            GameObject go = GameobjectFinder.FindClosestGameobjectWithTags(gameObject, Force.Neutral.ToString(), Force.Opponent.ToString(), Force.Player.ToString());
            if (go)
                ClosestOpponent = go.GetComponent<Role>();
            else
                ClosestOpponent = null;
            return ClosestOpponent;

        }
        void ExecuteDetectTarget()
        {
            FindClosestOpponent();
            if (ClosestOpponent == null)
                return;
            if (!IsMovableRole)
            {
                Vector3 curPos = transform.position;
                Vector3 dir = (ClosestOpponent.transform.position - curPos);
                float origAngle = (Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg) * Mathf.Deg2Rad;
                Movetorward = new Vector3(Mathf.Cos(origAngle), Mathf.Sin(origAngle), 0).normalized;
            }
        }
        void ArrowRotate()
        {
            if (TowardDirTrans == null)
                return;
            if (!HasSimulationAuthority) return;
            ArrowTargetAngle = MyMath.GetAngleFromVelocity(MyRigi.linearVelocity) - 90;

            ArrowAngle = Mathf.Lerp(ArrowAngle, ArrowTargetAngle, 0.1f);
            //ArrowAngle = ArrowTargetAngle - 90;
            TowardDirTrans.rotation = Quaternion.Euler(new Vector3(0, 0, ArrowAngle));
            Movetorward = MyMath.GetEulerFromAngle(ArrowAngle + 90);
        }
        #endregion
    }
}
