using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;
namespace Starbro.NeonIO
{
    public partial class Skill : MonoBehaviourPunCallbacks
    {
        [LabelOverride("註解")]
        [TextArea]
        public string Description;
        [Tooltip("RoleBehavior用腳本技能，設定為True時技能只會透過腳本來施放")]
        [SerializeField]
        public bool BehaviorSkill;
        [Tooltip("怪物攻擊時是否不要移動，使用BehaviorSkill時當作電腦AI技能時才有作用")]
        [SerializeField]
        public bool AttackStopMove;
        [Tooltip("攻擊時會停止移動的秒數")]
        [SerializeField]
        public float StopMoveTime;


        [Tooltip("施法音效(不管一次施法有幾發子彈都還是只會觸發一次聲音)")]
        [LabelOverride("施法音效")]
        [SerializeField]
        public AudioClip SpellSound;
        [Tooltip("子彈是否跟隨腳色本身跑")]
        [SerializeField]
        protected bool SpawnedInSelf;
        [Tooltip("技能移除時是否連帶移除子彈")]
        [SerializeField]
        protected bool ConnectToAmmo = false;
        protected List<Ammo> SubordinateAmmos;//連結子彈，
        [Tooltip("技能特效物件(技能存在時都會顯示)")]
        [SerializeField]
        ParticleSystem[] LocalParticles = null;
        [LabelOverride("偵測目標類型)")]
        [SerializeField]
        protected TargetType DetectedTargetType;

        protected Role Myself;
        protected Dictionary<string, object> AmmoData = new Dictionary<string, object>();
        protected Transform AmmoParent;
        protected int SpellTimes;//Spell幾次，如果AttackOnce有勾，此值大於1後就不會跑Spell
        protected Role TargetRole;
        protected Ammo TargetAmmo;
        [HideInInspector]
        public FeaturePart MyFeaturePart;
        [HideInInspector]
        public FeatureType MyFeatureType;
        protected float RemainLag = 0;//網路delay時間超過等待施法後仍剩餘的delay秒數
        protected int CurSpawnAmmoNum = 0;
        [HideInInspector]
        public int MyFeatureDataID = 0;
        [HideInInspector]
        public int FeaturePartSerialNumber = 0;//此FeaturePart的第幾個技能

        //因為連線有些玩家較LAG所以，設定實際施法會等待一段時間才執行這樣延遲在這段時間內的玩家會看不出施法LAG
        //需要這樣做是因為即使用LagCompansation校正子彈位置，可是LAG玩家的視角會看到子彈不是從對方身上射出來，而是校正後的位置射出來
        //若是有連線版本，WaitToSpellTime最低會自動設為0.1秒
        protected float WaitToSpellTime = 0.1f;
        protected MyTimer WaitToSpellTimer;
        protected bool IsWaitingForSpell = false;//當IsWaitingForSpell=true時，TimeFunc不會跑所以不會跑CD，也就是說整體技能施放CD等於多了WaitToSpellTime的時間(所以WaitToSpellTime設太長不好)
        protected bool OnCD = false;
        string ClamorContent = "";//喊話內容

        public virtual void Init(FeaturePart _part, FeatureType _featureType, int _featureDataID, int _featurePartSerialNumber)
        {
            MyFeaturePart = _part;
            MyFeatureType = _featureType;
            MyFeatureDataID = _featureDataID;
            ClamorContent = FeatureData.GetFeatureClamor(MyFeatureDataID);
            //Debug.LogFormat("{0}-{1}", _featureDataID, ClamorContent);
            FeaturePartSerialNumber = _featurePartSerialNumber;
            if (PhotonNetwork.IsConnected && WaitToSpellTime < 0.1f)
                WaitToSpellTime = 0.1f;
        }
        public virtual void Init( int _featurePartSerialNumber)
        {
            FeaturePartSerialNumber = _featurePartSerialNumber;
            if (PhotonNetwork.IsConnected && WaitToSpellTime < 0.1f)
                WaitToSpellTime = 0.1f;
        }

        public virtual float GetCDRatio()
        {
            return 1;
        }
        public virtual void LaunchAISpell()
        {
            Spell(new PhotonMessageInfo());
        }
        protected virtual void Awake()
        {
            Myself = transform.parent.GetComponent<Role>();
            AmmoParent = GameObject.FindGameObjectWithTag("AmmoParent").transform;
            if (SpawnedInSelf)
                AmmoParent = transform;
            SpawnParticles();
        }
        public virtual void SpawnAttackPrefab(float _remainLagTime)
        {
            if (PhotonNetwork.IsConnected)//有連線且是每次射擊的第一發子彈才抓取LAG資訊(因為只有第一發子彈才有時間戳資訊)
            {
                if (CurSpawnAmmoNum == 0)
                    RemainLag = _remainLagTime;
                if (RemainLag > 10000)
                {
                    Debug.LogWarning("Lag Time 異常，很可能PhotonMessageInfo不是由server端接收的而是本機自己送的：" + RemainLag);
                    RemainLag = 0f;
                }
            }
            //Set AmmoData
            AmmoData.Clear();
            AmmoData.Add("AttackerForce", Myself.MyForce);
            AmmoData.Add("Attacker", Myself);
            AmmoData.Add("RemainLag", Mathf.Abs(RemainLag));
        }
        public virtual void Spell(PhotonMessageInfo _info)
        {
            float lag = 0;
            if (_info.photonView != null)
                lag = (float)(PhotonNetwork.Time - _info.SentServerTime);
            /*
            if (lag != 0)
                Debug.Log("lag=" + lag);
                */
            OnCD = true;
            if ((WaitToSpellTime - lag) > 0)//Lag延遲時間若已經大於等待施法時間，就直接施法
            {
                WaitToSpellTimer = new MyTimer(WaitToSpellTime - lag, EndWaitToSpell, true, false, 0f);
                IsWaitingForSpell = true;
            }
            else
                EndWaitToSpell(lag - WaitToSpellTime);
        }
        protected virtual void EndWaitToSpell(object _remainLagTime)
        {
            if (SpellSound)
                AudioPlayer.PlaySound(SpellSound);
            IsWaitingForSpell = false;
        }
        public void InactivePlayerSkill()
        {
            enabled = false;
        }
        protected virtual void Update()
        {
            AutoDetectTarge();//要再TimeFunc之前，不然會一殺死怪物就觸發技能
            if (WaitToSpellTimer != null)
                WaitToSpellTimer.RunTimer();
            if (PhotonNetwork.IsConnected)//如果有連線且不是玩家自己就不會跑攻擊程式
                if (!Myself.photonView.IsMine)
                    return;
            TimerFunc();
        }
        protected virtual void AutoDetectTarge()
        {
            TargetRole = Myself.ClosestOpponent;
            if (DetectedTargetType != TargetType.Role)
                TargetAmmo = Myself.FindClosestShootAmmo();
        }
        protected virtual void TimerFunc()
        {
        }
        public virtual void Freeze(bool _freeze)
        {
        }

        public virtual void SelfDestroy()
        {
            DestroySubAmmos();
            Destroy(gameObject);
        }
        void DestroySubAmmos()
        {
            if (SubordinateAmmos != null)
            {
                for (int i = 0; i < SubordinateAmmos.Count; i++)
                {
                    if (SubordinateAmmos[i] != null)
                        SubordinateAmmos[i].SelfDestroy();
                }
                SubordinateAmmos.Clear();
            }
        }
        protected virtual void SpawnParticles()
        {
            if (LocalParticles == null)
                return;
            //產生特效
            for (int i = 0; i < LocalParticles.Length; i++)
            {
                if (LocalParticles[i] == null)
                    continue;
                GameObject go = EffectEmitter.EmitParticle(LocalParticles[i], Vector3.zero, Vector3.zero, transform, Myself.MyForce).gameObject;
            }
        }
        protected Vector3 GetTargetPos()
        {
            Vector3 targetPos = transform.position;
            switch (DetectedTargetType)
            {
                case TargetType.Role:
                    if (TargetRole != null)
                        targetPos = TargetRole.transform.position;
                    break;
                case TargetType.Ammo:
                    if (TargetAmmo != null)
                        targetPos = TargetAmmo.transform.position;

                    break;
                case TargetType.Both:
                    if (TargetRole != null && TargetAmmo != null)
                        targetPos = (Vector2.Distance(TargetRole.transform.position, transform.position) <= Vector2.Distance(TargetAmmo.transform.position, transform.position)) ? TargetRole.transform.position : TargetAmmo.transform.position;
                    else if (TargetAmmo == null && TargetRole != null)
                        targetPos = TargetRole.transform.position;
                    else if (TargetAmmo != null && TargetRole == null)
                        targetPos = TargetAmmo.transform.position;
                    break;
            }
            return targetPos;
        }
        protected bool CheckIfHasTarget()
        {
            switch (DetectedTargetType)
            {
                case TargetType.Role:
                    if (TargetRole == null)
                        return false;
                    break;
                case TargetType.Ammo:
                    if (TargetAmmo == null)
                        return false;

                    break;
                case TargetType.Both:
                    if (TargetRole == null && TargetAmmo == null)
                        return false;
                    break;
            }
            return true;
        }
    }
}
