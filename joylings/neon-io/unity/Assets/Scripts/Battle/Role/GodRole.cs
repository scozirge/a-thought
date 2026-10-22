using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;

namespace Starbro.NeonIO
{
    public class GodRole : Role
    {
        #region Public Field
        [HideInInspector]
        public bool IsMovableRole = false;//是否為會動的怪，若為會動的怪物則Movetorward要根據目前的移動方向而定
        #endregion

        #region Private Field
        int DropStarExp = 0;
        [LabelOverride("偵測目標週期")]
        [SerializeField]
        float DetectTargetInterval = 0.5f;
        MyTimer DetectTargetTimer;


        List<Skill> SkillList = new List<Skill>();
        #endregion

        #region MonoBehaviour Func
        public override void Init()
        {
            if (IsInit || !CanInitialize)
                return;
            MyForce = Force.Neutral;
            tag = MyForce.ToString();
            DetectTargetTimer = new MyTimer(DetectTargetInterval, ExecuteDetectTarget, true, true);
            base.Init();
            Neon.Astral.GodAppearance.Apply(transform);
            // Offline spawning has no player-data RPC; initialize the same localized identity.
            if (string.IsNullOrWhiteSpace(Name))
                SetPlayerData("", StringData.GetString("Creator"));
            BossSkillInit();
            BattleManager.BM.MyGodRole = this;
            if (BattleManager.MyGodState == GodState.Leaving)
                BattleManager.BM.MyGodDebutPM = EffectEmitter.EmitParticleFromDic("GodTeleport_loop", transform.position, Vector3.zero, null, MyForce);
        }
        void BossSkillInit()
        {
            SkillList = new List<Skill>(GetComponentsInChildren<Skill>());
            for (int i = 0; i < SkillList.Count; i++)
            {
                SkillList[i].Init(i);
            }
        }
        protected override void Update()
        {
            base.Update();
            if (!IsInit) return;
            if (HasSimulationAuthority && IsAlive && DetectTargetTimer != null)
                DetectTargetTimer.RunTimer();
        }
        #endregion

        #region Public Func
        [PunRPC]
        public void SetPlayerData(string _name, string _title)
        {
            Name = string.IsNullOrWhiteSpace(_name) ? StringData.GetString("DefaultGodName") : _name;
            string title = _title ?? "";
            if (NameLabel != null)
            {
                NameLabel.text = Name;
                NameLabel.gameObject.SetActive(!string.IsNullOrEmpty(Name));
            }
            if (TitleLabel != null)
            {
                TitleLabel.text = title;
                TitleLabel.gameObject.SetActive(!string.IsNullOrEmpty(title));
            }
            gameObject.name = Name;
            if (PhotonNetwork.IsConnected && PhotonNetwork.IsMasterClient)//若玩家是房主且此AI名不為Guest則從DB中取得該玩家的喊話取到後回傳並發送給房間內所有人
                if (Name != StringData.GetString("Guest") && Name != StringData.GetString("DefaultGodName"))
                    ServerRequest.GetClamor(Name);
        }
        [PunRPC]
        public override void BeAttack(int _dmg, Vector2 _force)
        {
            base.BeAttack(_dmg, _force);
        }
        [PunRPC]
        public override void ReceiveDmg(int _dmg)
        {
            //Debug.Log("N receive dmg=" + _dmg);
            base.ReceiveDmg(_dmg);
        }
        [PunRPC]
        public override void CastSkill(FeaturePart _part, int _featurePartSerialNumber, PhotonMessageInfo _info)
        {
            if (!IsAlive)
                return;
            if (_featurePartSerialNumber >= 0 && _featurePartSerialNumber < SkillList.Count)
            {
                if (SkillList[_featurePartSerialNumber] != null)
                    SkillList[_featurePartSerialNumber].Spell(_info);
            }
        }
        [PunRPC]
        public void TimeOutLeave()//造星神一段時間後會自動離開，將造星神設定為準備離開狀態
        {
            if (GetComponent<AIGodMove>() != null)
                GetComponent<AIGodMove>().enabled = false;
            KnockDrag = 1000;
        }
        /// <summary>
        /// 一般有連線時，技能施放都是呼叫RPC CastSkill來同步，但像Bomb這種有準備特效的技能，是呼叫RPC SkillSpawnAttackPrefab來同步
        /// </summary>
        [PunRPC]
        public override void SkillSpawnAttackPrefab(FeaturePart _part, int _featurePartSerialNumber, PhotonMessageInfo _info)
        {
            if (_featurePartSerialNumber >= 0 && _featurePartSerialNumber < SkillList.Count)
            {
                if (SkillList[_featurePartSerialNumber] != null)
                {
                    float lag = (float)(PhotonNetwork.Time - _info.SentServerTime);
                    SkillList[_featurePartSerialNumber].SpawnAttackPrefab(lag);
                }
            }
        }
        [PunRPC]
        public override void OnKilling(string _killer, string _loser)
        {
            // base.OnKilling(_killer, _loser);
            BattleUI.ShowKillLog(string.Format("{0}-{1}", TitleLabel.text, _killer), _loser);
        }
        [PunRPC]
        public override bool AddBuffer(BufferData _buffer)
        {
            return false;
        }
        public override void Die()//腳色死亡時隱藏
        {
            if (!HasSimulationAuthority || !IsAlive) return;
            base.Die();
            StartCoroutine(FinishDeath());
        }
        #endregion

        protected override int GetDeathLootCount() { return DropStarExp; }
        IEnumerator FinishDeath()
        {
            // Deliver the confirmed death before despawning the RPC's network object.
            yield return new WaitForSeconds(0.25f);
            if (BattleManager.BM != null) BattleManager.BM.GodLeave();
            SelfDestroy();
        }
        #region Private Func
        protected override void GetProperties()
        {
            base.GetProperties();
            if (UseJsonData)
            {
                MaxHealth = GameSettingData.GodHealth;
                BaseDamage = GameSettingData.GodDamage;
                BaseMoveSpeed = GameSettingData.GodMoveSpeed;
                DropStarExp = GameSettingData.GodDropStarExp;
            }
            Health = MaxHealth;
        }
        [PunRPC]
        public override void SelfDestroy()
        {
            base.SelfDestroy();
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
        #endregion
    }
}
