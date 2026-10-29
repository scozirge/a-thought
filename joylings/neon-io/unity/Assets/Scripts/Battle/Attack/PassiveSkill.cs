using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;

namespace Starbro.NeonIO
{
    public partial class PassiveSkill : Skill
    {
        #region Public Field
        [LabelOverride("觸發類型")]
        [Tooltip("" +
    "BeAttack：被攻擊時候觸發，1=CD，2=被攻擊幾次觸發，3=多久重置被攻擊次數\n\n" +
    "Die：死亡時觸發，1=CD\n\n" +
    "Stay：不動且沒受到攻擊1秒時觸發，1=CD，2=幾秒觸發1次，3=解除Stay時是否移除賦予的狀態(1為解除)\n\n" +
    "BreakStay：解除Stay時觸發，1=CD\n\n" +
    "HPBelow：HP低於一定程度觸發，1=CD，2=HP低於幾%觸發\n\n" +
    "BeAttackHPBelow：被攻擊時HP低於一定程度觸發，1=CD，2=HP低於幾%觸發\n\n" +
    "AllAttack：擊中敵人時觸發，1=CD\n\n" +
    "SkillAttack：技能擊中敵人時觸發，1=CD\n\n" +
    "MeleeAttack：肉搏敵人時觸發，1=CD，2=肉搏幾次觸發，3=多久重置肉搏次數\n\n" +
    "BeMeleeAttack：被肉搏時觸發，1=CD，2=被肉搏幾次觸發，3=多久重置被肉搏次數\n\n" +
    "BeSkillAttack：被技能擊中時觸發，1=CD，2=被技能擊中幾次觸發，3=多久重置被技能擊中次數\n\n" +
    "NoDamageTaken：2秒沒受到傷害時觸發，1=CD，2=幾秒觸發1次，3=解除Stay時是否移除賦予的狀態(1為解除)\n\n" +
    "GainExp：獲得經驗時觸發，1=CD\n\n" +
    "StartOnce：一開始觸發，只觸發一次，1=技能移除時，是否連帶移除給予的狀態(填1為移除)\n\n" +
    "BreakNoDamageTaken：解除NoDamageTaken時觸發，1=CD\n\n" +
    "Cycle：每幾秒觸發，1=CD")]
        [SerializeField]
        public PSkillTriggerCondition TriggerType = PSkillTriggerCondition.BeAttack;
        [Tooltip("觸發條件參數列表(參考觸發類型的指上說明)")]
        [SerializeField]
        protected List<float> ValueList = new List<float>();
        [Tooltip("Stun：暈眩，1=秒數\n" +
            "Burn：每秒扣血，1=秒數\n" +
            "Sick：攻擊力下降，1=秒數\n" +
            "Freeze：移速與攻速降低，1=秒數\n" +
            "DamageUp：傷害增加，1=秒數，2=增加百分比\n" +
            "Immortal：不扣血不中負面狀態，1=秒數，2=次數(次數填0代表無限觸發，填1就是只會抵擋1次)\n" +
            "Block：減免傷害，1=秒數，2=減免百分比，3=次數(次數填0代表無限觸發，填1就是只會抵擋1次)\n" +
            "SpeedUp：加速移動，1=秒數，2=加速百分比\n" +
            "Heal：回血，只會回1次之後立刻刪除狀態，2=回血百分比\n" +
            "Recover：持續回血(每0.25秒1次，獲得狀態會先算1次)，1=秒數，2=回血百分比\n" +
            "Ghost：不碰撞不中負面狀態，1=秒數\n" +
            "Bleed：每秒扣血+留下足跡，1=秒數\n" +
            "Absorb：自動吸收靠近的星之力，1=秒數，2=距離\n" +
            "Invisible：隱形(別人看不到你，但還是會遭受攻擊)，1=秒數\n" +
            "Teleport：傳送到隨機位置，1=傳送方式(0為半徑內隨機，1為後方)，2=距離\n" +
            "TargetIndicate：顯示所有玩家的方向，1=秒數\n" +
            "SkillDamageUp：傷害增加，1=秒數，2=增加百分比\n" +
            "MeleeDamageUp：傷害增加，1=秒數，2=增加百分比\n" +
            "Stable：擊退距離減免，1=秒數，2=減免百分比\n" +
            "")
        ]
        [SerializeField]
        public List<BufferData> SelfBuffers = null;

        #endregion


        #region Private Field
        //NormalTrigger
        delegate void TriggerFunc();
        Dictionary<PSkillTriggerCondition, TriggerFunc> TriggerFuncDic = new Dictionary<PSkillTriggerCondition, TriggerFunc>();
        protected float Cooldown = 0;//CD時間，CD為0代表沒有CD，可以連續觸發此技能
        protected bool IsCooldown = false;//是否正在CD

        protected MyTimer CDTimer;
        protected MyTimer PrepareTimer;
        protected MyTimer ValueTimer;
        protected MyTimer NotAutoRunValueTimer;
        //NormalTriggerWithTimes
        protected int NeedTriggerTimes = 0;
        protected float ResetTriggerTime = 0;
        protected int CurTriggerTimes = 0;
        //StateWaitTrigger
        protected float StateWaitTime = 0;
        protected bool BreakRemoveOffered = false;//像Stay或NoDamageTaken這種狀態解除時，是否要移除給予的效果
        //HPBelow && BeAttackHPBelow
        protected float HPBelowRatio = 0;
        #endregion

        #region MonoBehaviour Func
        protected override void Update()
        {
            base.Update();
            if (ValueTimer != null)
                ValueTimer.RunTimer();
            if (CDTimer != null)
                CDTimer.RunTimer();
            if (PrepareTimer != null)
                PrepareTimer.RunTimer();
        }
        #endregion

        #region Public Func
        public override void Init(FeaturePart _part, FeatureType _featureType, int _featureDataID, int _featurePartSerialNumber)
        {
            base.Init(_part, _featureType, _featureDataID, _featurePartSerialNumber);
            if (TriggerType == PSkillTriggerCondition.StartOnce)
                StartOnceTrigger();
        }
        public override float GetCDRatio()
        {
            if (CDTimer == null)
                return 1;
            if ((CDTimer.CurTimer / CDTimer.CircleTime) < 1)
                return 1 - (CDTimer.CurTimer / CDTimer.CircleTime);
            else
                return 1;
        }
        public override void Spell(PhotonMessageInfo _info)
        {
            base.Spell(_info);
            CurTriggerTimes = 0;
            AddBufferToMySelf();
        }
        public void Trigger(PSkillTriggerCondition _condition)
        {
            if (TriggerFuncDic.ContainsKey(_condition) && TriggerFuncDic[_condition] != null)
                TriggerFuncDic[_condition]();
        }
        protected virtual void NormalTrigger()
        {
            if (IsCooldown)
                return;
            if (PhotonNetwork.IsConnected)//只有在網路有連線且是自己時才使用RPC
            {
                if (Myself.photonView.IsMine)
                    RequestSpell();
                else if (TriggerType == PSkillTriggerCondition.Die)//如果是死亡觸發即使不是自己也要直接觸發，不然死掉後才接收到來自server的觸發資訊已經來不及了
                    Spell(new PhotonMessageInfo());
            }
            else
                RequestSpell();

            if (CDTimer != null)
            {
                CDTimer.StartRunTimer = true;
                IsCooldown = true;
            }
        }
        protected virtual void NormalTriggerWithTimes()
        {
            if (IsCooldown)
                return;
            CurTriggerTimes++;
            if (CurTriggerTimes >= NeedTriggerTimes)
            {
                if (PhotonNetwork.IsConnected)//只有在網路有連線且是自己時才使用RPC
                {
                    if (Myself.photonView.IsMine)
                        RequestSpell();
                }
                else
                    RequestSpell();
                if (CDTimer != null)
                {
                    CDTimer.StartRunTimer = true;
                    IsCooldown = true;
                }
            }
            if (ValueTimer != null)
                ValueTimer.RestartCountDown();
        }
        protected virtual void StateWaitTrigger()
        {
            if (NotAutoRunValueTimer != null)
            {
                NotAutoRunValueTimer.RunTimer();
            }
            else
            {
                StateWaitTriggerExecute();
            }

        }
        protected virtual void StateWaitTriggerExecute()
        {
            if (IsCooldown)
                return;
            if (PhotonNetwork.IsConnected)//只有在網路有連線且是自己時才使用RPC
            {
                if (Myself.photonView.IsMine)
                    RequestSpell();
            }
            else
                RequestSpell();
            if (CDTimer != null)
            {
                CDTimer.StartRunTimer = true;
                IsCooldown = true;
            }
        }
        protected virtual void BreakStateWaitTrigger()
        {
            if (!BreakRemoveOffered)
            {
                if (IsCooldown)
                    return;
                if (PhotonNetwork.IsConnected)//只有在網路有連線且是自己時才使用RPC
                {
                    if (Myself.photonView.IsMine)
                        RequestSpell();
                }
                else
                    RequestSpell();
                if (CDTimer != null)
                {
                    CDTimer.StartRunTimer = true;
                    IsCooldown = true;
                }
            }
            else
                OnBreakStateRemoveOffered();
            if (NotAutoRunValueTimer != null)
            {
                NotAutoRunValueTimer.RestartCountDown();
            }
        }
        protected virtual void StartOnceTrigger()
        {
            if (PhotonNetwork.IsConnected)//只有在網路有連線且是自己時才使用RPC
            {
                if (Myself.photonView.IsMine)
                {
                    RequestSpell();
                }
            }
            else
                RequestSpell();
        }
        protected virtual void HPBelowTrigger()
        {
            if (IsCooldown)
                return;
            if (Myself.HealthRatio > HPBelowRatio)
                return;
            if (PhotonNetwork.IsConnected)//只有在網路有連線且是自己時才使用RPC
            {
                if (Myself.photonView.IsMine)
                    RequestSpell();
            }
            else
                RequestSpell();
            if (CDTimer != null)
            {
                CDTimer.StartRunTimer = true;
                IsCooldown = true;
            }
        }
        protected virtual void BeAttackHPBelowTrigger()
        {
            if (IsCooldown)
                return;
            if (Myself.HealthRatio > HPBelowRatio)
                return;
            if (PhotonNetwork.IsConnected)//只有在網路有連線且是自己時才使用RPC
            {
                if (Myself.photonView.IsMine)
                    RequestSpell();
            }
            else
                RequestSpell();
            if (CDTimer != null)
            {
                CDTimer.StartRunTimer = true;
                IsCooldown = true;
            }
        }
        float GetTriggerValueFromValueList(int _index)
        {
            if (ValueList == null)
                return 0;
            if (_index < ValueList.Count)
            {
                return ValueList[_index];
            }
            return 0;
        }
        /// <summary>
        /// 確認此技能被移除時，是否要連同移除給予的Buffer
        /// </summary>
        /// <returns></returns>
        public bool CheckIfRemoveAssignedBuffer()
        {
            if (TriggerType == PSkillTriggerCondition.StartOnce)
            {
                if (GetTriggerValueFromValueList(0) == 1)
                {
                    return true;
                }
            }
            return false;
        }
        #endregion

        #region Private Func
        protected override void Awake()
        {
            SetConditionProperty();
            base.Awake();
            if (Cooldown > 0)
                CDTimer = new MyTimer(Cooldown, EndCD, false, false);
            IrrationalSettingWarn();
        }
        protected virtual void IrrationalSettingWarn()
        {
            if (TriggerType == PSkillTriggerCondition.Die && SpawnedInSelf)
                Debug.LogWarning("TriggerType為Die 且 SpawnedInSelf設定為true會因為腳色死亡時連同子彈一併被移除(因為子彈在腳色身上)");
        }
        protected virtual void SetConditionProperty()
        {
            if (ValueList != null && ValueList.Count > 0)
                Cooldown = ValueList[0];
            switch (TriggerType)
            {
                case PSkillTriggerCondition.BeAttack:
                    TriggerFuncDic.Add(TriggerType, NormalTriggerWithTimes);
                    NeedTriggerTimes = (int)ValueList[1];
                    ResetTriggerTime = ValueList[2];
                    if (ResetTriggerTime > 0)
                        ValueTimer = new MyTimer(ResetTriggerTime, ResetTriggerTimer, true, false);
                    break;
                case PSkillTriggerCondition.BeMeleeAttack:
                    TriggerFuncDic.Add(TriggerType, NormalTriggerWithTimes);
                    NeedTriggerTimes = (int)ValueList[1];
                    ResetTriggerTime = ValueList[2];
                    if (ResetTriggerTime > 0)
                        ValueTimer = new MyTimer(ResetTriggerTime, ResetTriggerTimer, true, false);
                    break;
                case PSkillTriggerCondition.BeSkillAttack:
                    TriggerFuncDic.Add(TriggerType, NormalTriggerWithTimes);
                    NeedTriggerTimes = (int)ValueList[1];
                    ResetTriggerTime = ValueList[2];
                    if (ResetTriggerTime > 0)
                        ValueTimer = new MyTimer(ResetTriggerTime, ResetTriggerTimer, true, false);
                    break;
                case PSkillTriggerCondition.GainExp:
                    TriggerFuncDic.Add(TriggerType, NormalTrigger);
                    break;
                case PSkillTriggerCondition.Die:
                    TriggerFuncDic.Add(TriggerType, NormalTrigger);
                    break;
                case PSkillTriggerCondition.StartOnce:
                    TriggerFuncDic.Add(TriggerType, StartOnceTrigger);
                    break;
                case PSkillTriggerCondition.Cycle:
                    TriggerFuncDic.Add(TriggerType, NormalTrigger);
                    break;
                case PSkillTriggerCondition.HPBelow:
                    TriggerFuncDic.Add(TriggerType, HPBelowTrigger);
                    HPBelowRatio = ValueList[1];
                    break;
                case PSkillTriggerCondition.BeAttackHPBelow:
                    TriggerFuncDic.Add(TriggerType, BeAttackHPBelowTrigger);
                    HPBelowRatio = ValueList[1];
                    break;
                case PSkillTriggerCondition.Stay:
                    StateWaitTime = (int)ValueList[1];
                    if ((int)ValueList[2] == 1)
                        BreakRemoveOffered = true;
                    if (StateWaitTime > 0)
                        NotAutoRunValueTimer = new MyTimer(StateWaitTime, StateWaitTriggerExecute, true, true);
                    else
                        Debug.LogWarning("閒置觸發技能沒有設定要閒置的時間:" + name);
                    TriggerFuncDic.Add(TriggerType, StateWaitTrigger);
                    if (BreakRemoveOffered)//BreakRemoveOfferedBuffers為true時也要追加解除觸發State時要觸發的解除方法
                        TriggerFuncDic.Add(PSkillTriggerCondition.BreakStay, BreakStateWaitTrigger);
                    break;
                case PSkillTriggerCondition.BreakStay:
                    TriggerFuncDic.Add(TriggerType, BreakStateWaitTrigger);
                    break;
                case PSkillTriggerCondition.NoDamageTaken:
                    StateWaitTime = (int)ValueList[1];
                    if ((int)ValueList[2] == 1)
                        BreakRemoveOffered = true;
                    if (StateWaitTime > 0)
                        NotAutoRunValueTimer = new MyTimer(StateWaitTime, StateWaitTriggerExecute, true, true);
                    else
                        Debug.LogWarning("閒置觸發技能沒有設定要閒置的時間:" + name);
                    TriggerFuncDic.Add(TriggerType, StateWaitTrigger);
                    if (BreakRemoveOffered)//BreakRemoveOfferedBuffers為true時也要追加解除觸發State時要觸發的解除方法
                        TriggerFuncDic.Add(PSkillTriggerCondition.BreakNoDamageTaken, BreakStateWaitTrigger);
                    break;
                case PSkillTriggerCondition.BreakNoDamageTaken:
                    TriggerFuncDic.Add(TriggerType, BreakStateWaitTrigger);
                    break;
                case PSkillTriggerCondition.AllAttack:
                    TriggerFuncDic.Add(TriggerType, NormalTriggerWithTimes);
                    NeedTriggerTimes = (int)ValueList[1];
                    ResetTriggerTime = ValueList[2];
                    if (ResetTriggerTime > 0)
                        ValueTimer = new MyTimer(ResetTriggerTime, ResetTriggerTimer, true, false);
                    break;
                case PSkillTriggerCondition.SkillAttack:
                    TriggerFuncDic.Add(TriggerType, NormalTriggerWithTimes);
                    NeedTriggerTimes = (int)ValueList[1];
                    ResetTriggerTime = ValueList[2];
                    if (ResetTriggerTime > 0)
                        ValueTimer = new MyTimer(ResetTriggerTime, ResetTriggerTimer, true, false);
                    break;
                case PSkillTriggerCondition.MeleeAttack:
                    TriggerFuncDic.Add(TriggerType, NormalTriggerWithTimes);
                    NeedTriggerTimes = (int)ValueList[1];
                    ResetTriggerTime = ValueList[2];
                    if (ResetTriggerTime > 0)
                        ValueTimer = new MyTimer(ResetTriggerTime, ResetTriggerTimer, true, false);
                    break;
            }
        }
        int SpeedSource => 1 + (int)MyFeaturePart * 256 + FeaturePartSerialNumber;
        protected void AddBufferToMySelf()
        {
            for (int i = 0; i < SelfBuffers.Count; i++)
            {
                var buff = SelfBuffers[i];
                if (buff.Type == RoleBuffer.SpeedUp) buff.Value2 = SpeedSource;
                Myself.AddBuffer(buff);
            }
        }
        protected void OnBreakStateRemoveOffered()
        {
            if (SelfBuffers != null)
            {
                if (PhotonNetwork.IsConnected && Myself.photonView.IsMine)//只有在網路有連線且是自己時才使用RPC
                    for (int i = 0; i < SelfBuffers.Count; i++)
                    {
                        if (SelfBuffers[i].Type == RoleBuffer.SpeedUp) Myself.RemoveSpeedSource(SpeedSource);
                        else Myself.photonView.RPC("RemoveBufferByTypes_RPC", RpcTarget.All, SelfBuffers[i].Type);
                    }
                else
                    for (int i = 0; i < SelfBuffers.Count; i++)
                        if (SelfBuffers[i].Type == RoleBuffer.SpeedUp) Myself.RemoveSpeedSource(SpeedSource);
                        else Myself.RemoveBufferByTypes(SelfBuffers[i].Type);
            }
        }
        //結束CD時執行，若CD為0時代表沒CD，所以不會執行此程式
        protected void EndCD()
        {
            IsCooldown = false;
        }
        protected void ResetTriggerTimer()
        {
            CurTriggerTimes = 0;
            if (ValueTimer != null)
                ValueTimer.StartRunTimer = true;
        }
        public override void SelfDestroy()
        {
            if (BreakRemoveOffered)
                OnBreakStateRemoveOffered();
            base.SelfDestroy();
        }
        #endregion
    }
}
