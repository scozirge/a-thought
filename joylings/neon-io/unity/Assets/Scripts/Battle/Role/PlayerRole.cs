using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Scoz.Func;
using Neon.Networking;

namespace Starbro.NeonIO
{
    public class PlayerRole : Role, IPunObservable
    {
        #region Public Field
        [LabelOverride("腳色控制方式")]
        public ControlWay Control = ControlWay.Cursor;
        [LabelOverride("需要按住滑鼠左鍵")]
        public bool MouseDownMove = false;
        [LabelOverride("指標最小限制距離")]
        [Tooltip("1080 高度下，以角色實際畫面位置為中心的停止半徑")]
        public float CursorLimitDist = 25;
        [Tooltip("1080 高度下，超過此距離恢復全速；停止半徑與此距離之間逐漸減速")]
        public float CursorFullSpeedDist = 150;
        public bool IsRevived;//是否已經付費重生過，付費重生過沒辦法再次使用付費重生
        public int Star = 0;//星幣
        #endregion

        #region Private Field
        [LabelOverride("腳色圖像父層物件")]
        public Transform BodyTrans = null;
        protected float RemoteArrowAngle;//從Server傳來的最後角度
        [LabelOverride("腳色跟拍攝影機")]
        public FollowPlayerRole MyFollowCamera = null;
        public Canvas BattleObjsUICanvas = null;
        AnimationPlayer CameraPlayer = null;
        Camera movementCamera;
        int Exp = 0;
        public int Experience => Exp;
        public int ExperienceToNextLevel => NeedExpList != null && NeedExpList.Length >= 4 && LV > 0 ? LVUpExp : 1;
        public float ExperienceRatio => Mathf.Clamp01((float)Exp / Mathf.Max(1, ExperienceToNextLevel));
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
        [LabelOverride("獲得經驗特效")]
        [SerializeField]
        ParticleSystem GainExpEffect = null;
        [LabelOverride("獲得經驗音效")]
        [SerializeField]
        AudioClip GainExpSound = null;
        [SerializeField]
        GameObject TargetIndicatorPrefab = null;//標示敵人方向的箭頭物件
        List<Transform> IndicatorTrans = new List<Transform>();//敵方Trans清單
        bool ShowTargetIndicator = false;//true時會顯示所有玩家的方向
        bool Premium = false;
        int[] FeatureIDsBeforeDeeath = new int[3];
        float ArrowTargetAngle;
        Camera indicatorCamera;

        //Challenge戰場時專用
        int CurSelectFeatureID = 0;
        MyTimer ChangeFeatureTimer;
        #endregion


        #region MonoBehaviour Func




        protected override void Awake()
        {
            base.Awake();
            // The legacy prefab can be rendered before Init while Fusion assigns ownership.
            // Hide that unclassified appearance; apply the viewer palette in Spawned first.
            if (PhotonNetwork.IsConnected)
            {
                if (AppearanceObj) AppearanceObj.SetActive(false);
            }
            else ApplyViewerFaction(true);
        }
        public void ApplyViewerFaction(bool localPlayer)
        {
            MyForce = localPlayer ? Force.Player : Force.Opponent;
            tag = MyForce.ToString();
            Neon.Astral.FactionVisuals.Apply(transform, MyForce);
            if (!IsInit && AppearanceObj) AppearanceObj.SetActive(true);
        }
        // Start is called before the first frame update
        public override void Init()
        {
            if (IsInit || !CanInitialize)
                return;
            ApplyViewerFaction(!PhotonNetwork.IsConnected || photonView.IsMine);
            if (PhotonNetwork.IsConnected)
            {
                if (photonView.IsMine)
                {
                    gameObject.AddComponent<ClearSight>();
                    MyForce = Force.Player;
                }
                else
                {
                    MyForce = Force.Opponent;
                }
            }
            else
            {
                MyForce = Force.Player;
                gameObject.AddComponent<ClearSight>();
            }
            tag = MyForce.ToString();

            base.Init();
            if (PhotonNetwork.IsConnected)
            {
                Name = photonView.Owner.NickName;
                gameObject.name = Name;
                NameLabel.text = Name;
            }
            else
            {
                Name = "GameDeveloper";
                gameObject.name = Name;
                NameLabel.text = Name;
            }

            if (PhotonNetwork.IsConnected && PhotonNetwork.IsMasterClient)//若玩家是房主且此AI名不為Guest則從DB中取得該玩家的喊話取到後回傳並發送給房間內所有人
                if (Name != StringData.GetString("Guest") && Name != "")
                    ServerRequest.GetClamor(Name);
            //重生在外圍隨機地點
            if (HasSimulationAuthority)
                transform.position = Circle.GetRandomPosInCircle(Vector2.zero, BattleManager.BM.SpawnRoleRadius);
            SetPlayerCamera();
            //GetFeature(FeaturePart.Body, 105);
        }

        // Update is called once per frame
        protected override void Update()
        {
            base.Update();
            if (!IsInit) return;
            if (HasSimulationAuthority && IsAlive) FindClosestOpponent();
            ArrowRotate();
            if (HasSimulationAuthority && IsAlive && ChangeFeatureTimer != null)
                ChangeFeatureTimer.RunTimer();
        }
        protected override void FixedUpdate()
        {
            base.FixedUpdate();
            if (!IsInit) return;
            if (PhotonNetwork.IsConnected)
            {
                if (photonView.IsMine)
                {
                    MoveControl();
                }
            }
            else
            {
                MoveControl();
            }
        }
        #endregion

        #region Public Func
        public void GetPremium()
        {
            Premium = true;
        }
        [PunRPC]
        public override bool AddBuffer(BufferData _buffer)
        {
            if (base.AddBuffer(_buffer))
            {
                switch (_buffer.Type)
                {
                    case RoleBuffer.Stun:
                        if (PhotonNetwork.IsConnected)
                        {
                            if (photonView.IsMine)
                                CameraShake(_buffer.Time);
                        }
                        else
                            CameraShake(_buffer.Time);
                        break;
                }
                return true;
            }
            else
                return false;
        }
        void CameraShake(float _stunTime)
        {
            if (CameraPlayer == null) return;
            if (_stunTime >= 1.5f)
                CameraPlayer.PlayTrigger("mightyShake");
            else if (_stunTime >= 1f)
                CameraPlayer.PlayTrigger("mediumShake");
            else
                if (CameraPlayer != null) CameraPlayer.PlayTrigger("slightShake");
        }
        [PunRPC]
        public override void ReceiveDmg(int _dmg)
        {
            //Debug.Log(name + " ReceiveDmg:" + _dmg);
            base.ReceiveDmg(_dmg);
        }
        public override void BeKnock(Vector2 _force)
        {
            if (_force == Vector2.zero)
                return;
            base.BeKnock(_force);
            if (PhotonNetwork.IsConnected)
            {
                if (photonView.IsMine)
                    if (CameraPlayer != null) CameraPlayer.PlayTrigger("slightShake");
            }
            else
                if (CameraPlayer != null) CameraPlayer.PlayTrigger("slightShake");
        }
        [PunRPC]
        public override void OnKilling(string _killer, string _loser)
        {
            base.OnKilling(_killer, _loser);
            if (BattleManager.BM.MyLeaderBoard)
                BattleManager.BM.MyLeaderBoard.RefreshPlayerScore();
        }
        [PunRPC]
        public override void CastSkill(FeaturePart _part, int _featurePartSerialNumber, PhotonMessageInfo _info)
        {
            base.CastSkill(_part, _featurePartSerialNumber, _info);
        }
        [PunRPC]
        public override void SkillSpawnAttackPrefab(FeaturePart _part, int _featurePartSerialNumber, PhotonMessageInfo _info)
        {
            base.SkillSpawnAttackPrefab(_part, _featurePartSerialNumber, _info);
        }
        [PunRPC]
        public override void BeAttack(int _dmg, Vector2 _force)
        {
            base.BeAttack(_dmg, _force);
        }
        public override void Die()//腳色死亡時隱藏
        {
            if (!HasSimulationAuthority || !IsAlive || NeonArenaFlow.CombatBlocked) return;
            FeatureIDsBeforeDeeath[0] = FeatureDic.ContainsKey(FeaturePart.Head) ? FeatureDic[FeaturePart.Head].ID : 0;
            FeatureIDsBeforeDeeath[1] = FeatureDic.ContainsKey(FeaturePart.Body) ? FeatureDic[FeaturePart.Body].ID : 0;
            FeatureIDsBeforeDeeath[2] = FeatureDic.ContainsKey(FeaturePart.Back) ? FeatureDic[FeaturePart.Back].ID : 0;
            base.Die();
            gameObject.tag = "Untagged";//死掉後要把tag設成Untagged才不會被鎖定為攻擊目標
            MyRigi.linearVelocity = Vector3.zero;
            AppearanceObj.SetActive(false);
            SelfCollider.enabled = false;
            //事先移動重生點在外圍隨機地點(若等復活在移動，其他玩家會看到腳色快速飛到復活點)
            if (HasSimulationAuthority)
                transform.position = Circle.GetRandomPosInCircle(Vector2.zero, BattleManager.BM.SpawnRoleRadius);
            if (HasSimulationAuthority && MyFollowCamera != null) MyFollowCamera.enabled = false;
        }
        public override void RemoveFeature()
        {
            base.RemoveFeature();
            if (!HasSimulationAuthority) return;
            BattleUI.UpdateFeatureIcon(FeaturePart.Head, null, null);
            BattleUI.UpdateFeatureIcon(FeaturePart.Body, null, null);
            BattleUI.UpdateFeatureIcon(FeaturePart.Back, null, null);
        }
        [PunRPC]
        public virtual void Restart()
        {
            if (NeonArenaFlow.Active) return;
            if (!HasSimulationAuthority) return;
            BeginNewLife();
            IsRevived = false;
            Exp = 0;
            Star = 0;
            LV = 1;
            MaxHealth = PhotonLauncher.SelectGameType != GameType.Challenge ? GameSettingData.Health : GameSettingData.Health_C;
            RemoveAllBuffer();
            RemoveSkill();
            RemoveFeature();
            IsAlive = true;
            gameObject.tag = MyForce.ToString();//復活後要把tag設定回來才會被其他玩家或野怪當成目標
            SetProportionOfHP(1);
            AppearanceObj.SetActive(true);
            SelfCollider.enabled = true;
            if (Premium)
            {
                LevelUp();
                AddBuffer(new BufferData(RoleBuffer.Immortal, 10, 0, 0));
            }
            if (HasSimulationAuthority && MyFollowCamera != null) MyFollowCamera.enabled = true;
            SizeGrowth();//死亡復活回到原大小
        }
        [PunRPC]
        public virtual void Revive()
        {
            if (NeonArenaFlow.Active) return;
            if (!HasSimulationAuthority) return;
            BeginNewLife();
            IsRevived = true;
            IsAlive = true;
            gameObject.tag = MyForce.ToString();//復活後要把tag設定回來才會被其他玩家或野怪當成目標
            SetProportionOfHP(1);
            AppearanceObj.SetActive(true);
            SelfCollider.enabled = true;
            GetFeature(FeaturePart.Head, FeatureIDsBeforeDeeath[0]);
            GetFeature(FeaturePart.Body, FeatureIDsBeforeDeeath[1]);
            GetFeature(FeaturePart.Back, FeatureIDsBeforeDeeath[2]);
            AddBuffer(new BufferData(RoleBuffer.Immortal, 5, 0, 0));
            if (Premium)
                LevelUp();
            if (HasSimulationAuthority && MyFollowCamera != null) MyFollowCamera.enabled = true;
        }
        #endregion

        #region Private Func
        protected override void GetProperties()
        {
            base.GetProperties();
            Star = 0;
            if (UseJsonData)
            {
                if (PhotonLauncher.SelectGameType != GameType.Challenge)
                {
                    MaxHealth = NeonArenaFlow.Active ? NeonArenaRules.InitialPlayerHealth : GameSettingData.Health;
                    BaseDamage = GameSettingData.Damage;
                }
                else
                {
                    MaxHealth = GameSettingData.Health_C;
                    BaseDamage = GameSettingData.Damage_C;
                    //初始化玩家選擇技能(獲得前3項技能)
                    if (PhotonNetwork.IsConnected && photonView.IsMine)
                    {
                        CurSelectFeatureID = 0;
                        for (int i = 0; i < 3; i++)
                        {
                            photonView.RPC("GetFeature", RpcTarget.All, MyPlayer.ChallengeSelectFeatures[CurSelectFeatureID].MyFeaturePart, MyPlayer.ChallengeSelectFeatures[CurSelectFeatureID].ID);
                            CurSelectFeatureID++;
                        }
                        ChangeFeatureTimer = new MyTimer(GameSettingData.ChangeFeatureTime_C, ChangeFeature_C, true, true);
                    }
                }
                NeedExpList = GameSettingData.NeedExps;
            }
            Health = MaxHealth;
            //若不是玩家自己就取得目前其他玩家腳色的資料
            if (PhotonNetwork.IsConnected)
            {
                if (!photonView.IsMine)
                {
                    SetLVByExp(PhotonTools.GetIntProperty(photonView.Owner, PunCustomProp.GainExp));
                    GetFeature(FeaturePart.Head, PhotonTools.GetIntProperty(photonView.Owner, PunCustomProp.Head));
                    GetFeature(FeaturePart.Body, PhotonTools.GetIntProperty(photonView.Owner, PunCustomProp.Body));
                    GetFeature(FeaturePart.Back, PhotonTools.GetIntProperty(photonView.Owner, PunCustomProp.Back));
                }
            }
        }
        /// <summary>
        /// Challenge戰場中每一段時間會改變玩家擁有技能
        /// </summary>
        void ChangeFeature_C()
        {
            photonView.RPC("GetFeature", RpcTarget.All, MyPlayer.ChallengeSelectFeatures[CurSelectFeatureID].MyFeaturePart, MyPlayer.ChallengeSelectFeatures[CurSelectFeatureID].ID);
            CurSelectFeatureID++;
            if (CurSelectFeatureID >= MyPlayer.ChallengeSelectFeatures.Length)
                CurSelectFeatureID = 0;
        }
        //產生攝影機並照著玩家
        void SetPlayerCamera()
        {
            if (!HasSimulationAuthority) return;
            MyFollowCamera = Instantiate(MyFollowCamera);
            Vector3 cameraPosition = transform.position;
            // Keep the camera depth configured by its prefab while centering on the player.
            cameraPosition.z = MyFollowCamera.transform.position.z;
            MyFollowCamera.transform.position = cameraPosition;
            MyFollowCamera.SetFollowObj(this);
            MyFollowCamera.enabled = true;
            movementCamera = MyFollowCamera.GetComponentInChildren<Camera>();
            BattleCosmos.Ensure(movementCamera);
            CameraPlayer = MyFollowCamera.GetComponent<AnimationPlayer>();
            GameObject canvasObject = GameObject.FindGameObjectWithTag("BattleObjsUICanvas");
            BattleObjsUICanvas = canvasObject != null ? canvasObject.GetComponent<Canvas>() : null;
            if (BattleObjsUICanvas != null && MyFollowCamera != null)
                BattleObjsUICanvas.worldCamera = MyFollowCamera.GetComponentInChildren<Camera>();
        }
        //腳色移動操作
        void MoveControl()
        {
            if (!IsAlive)//死掉就不能移動
                return;
            if (BuffersExist(RoleBuffer.Stun))//如果自己在暈眩狀態就不能進行移動
                return;
            // Browser touch layout also covers mobile WebGL; desktop keeps its cursor control.
            if (!NeonWebBridge.InputAvailable || Neon.Astral.AstralPresentation.InputBlocked)
            { StopControlledMovement(); return; }
            if (!NeonWebBridge.TouchLayout)
            {
                NotMobileControl();
            }
            else
            {
                MobileControl();
            }
        }
        void MobileControl()
        {
            if (DragTimer.StartRunTimer) return;
            Vector2 delta = Neon.Astral.NeonTouchStick.Direction;
            if (delta == Vector2.zero) { StopControlledMovement(); return; }
            DragRecovery();
            Move(delta.normalized);
            ArrowAngle = Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg - 90;
            FaceMoveDirection();
        }
        void StopControlledMovement()
        {
            // A released stick stops voluntary movement, without cancelling knockback.
            if (MyRigi && (DragTimer == null || !DragTimer.StartRunTimer)) MyRigi.linearVelocity = Vector2.zero;
        }
        public void Move(Vector3 _movetorward)
        {
            Move(_movetorward, 1);
        }
        void Move(Vector3 _movetorward, float speedScale)
        {
            if (!HasSimulationAuthority || !IsInit) return;
            if (_movetorward == Vector3.zero)
                return;
            if (!IsAlive)//死掉就不能移動
                return;
            if (BuffersExist(RoleBuffer.Stun))//如果自己在暈眩狀態就不能進行移動
                return;
            if (IsStay)
            {
                if (PhotonNetwork.IsConnected)
                {
                    if (photonView.IsMine)
                        BreakStay();
                }
                else
                    BreakStay();
            }


            Movetorward = _movetorward.normalized;
            Vector2 force = Movetorward * MoveSpeed * Mathf.Clamp01(speedScale);
            MyRigi.linearVelocity = force;
        }
        void NotMobileControl()
        {
            //滑鼠或鍵盤控制
            if (Control == ControlWay.Cursor)//滑鼠移動
            {
                if (MouseDownMove && !Input.GetMouseButton(0)) { StopControlledMovement(); return; }
                if (DragTimer.StartRunTimer) return; // Preserve knockback.
                if (!movementCamera && MyFollowCamera) movementCamera = MyFollowCamera.GetComponentInChildren<Camera>();
                Vector2 origin = CursorMovement.ScreenOrigin(movementCamera, transform.position);
                Vector2 delta = (Vector2)Input.mousePosition - origin;
                float scale = CursorMovement.SpeedScale(delta.magnitude, movementCamera ? movementCamera.pixelHeight : Screen.height,
                    CursorLimitDist, CursorFullSpeedDist);
                if (scale <= 0) { StopControlledMovement(); return; }
                Vector3 direction = delta;
                if (movementCamera)
                {
                    float depth = movementCamera.WorldToScreenPoint(transform.position).z;
                    direction = movementCamera.ScreenToWorldPoint(new Vector3(Input.mousePosition.x, Input.mousePosition.y, depth)) - transform.position;
                    direction.z = 0;
                }
                DragRecovery();
                Move(direction, scale);
                ArrowAngle = Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg - 90;
                FaceMoveDirection();
            }
            else if (Control == ControlWay.Keyboard)//鍵盤移動
            {
                if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.W)
    || Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.Space))
                {
                    if (!DragTimer.StartRunTimer)
                    {
                        DragRecovery();
                        //抓取鍵盤按的方向
                        float xMove = 0;
                        float yMove = 0;
                        xMove = Input.GetAxis("Horizontal");
                        yMove = Input.GetAxis("Vertical");
                        //移動
                        Move(new Vector3(xMove, yMove, 0));

                        //箭頭朝向面向方向
                        float angle = 0;
                        if (Input.GetAxis("Horizontal") > 0 && Input.GetAxis("Vertical") > 0)
                            angle = -45;
                        else if (Input.GetAxis("Horizontal") > 0 && Input.GetAxis("Vertical") == 0)
                            angle = -90;
                        else if (Input.GetAxis("Horizontal") > 0 && Input.GetAxis("Vertical") < 0)
                            angle = -135;
                        else if (Input.GetAxis("Horizontal") == 0 && Input.GetAxis("Vertical") < 0)
                            angle = -180;
                        else if (Input.GetAxis("Horizontal") < 0 && Input.GetAxis("Vertical") < 0)
                            angle = -225;
                        else if (Input.GetAxis("Horizontal") < 0 && Input.GetAxis("Vertical") == 0)
                            angle = -270;
                        else if (Input.GetAxis("Horizontal") < 0 && Input.GetAxis("Vertical") > 0)
                            angle = -315;
                        else if (Input.GetAxis("Horizontal") == 0 && Input.GetAxis("Vertical") > 0)
                            angle = -360;
                        else
                            angle = -360;
                        ArrowAngle = angle;

                        //更新腳色面向
                        UpdateDirection_KeyboardControl();
                        //腳色朝向面向方向
                        FaceMoveDirection();
                    }
                }
            }
        }
        void UpdateDirection_KeyboardControl()
        {
            Vector3 direction = new Vector3(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"), 0);
            if (direction.sqrMagnitude > 0) Movetorward = direction.normalized;
        }
        void FaceMoveDirection()
        {
            if (Movetorward.x > 0)
            {
                BodyTrans.localScale = new Vector3(Mathf.Abs(BodyTrans.localScale.x), BodyTrans.localScale.y, BodyTrans.localScale.z);
            }
            else
            {
                BodyTrans.localScale = new Vector3(Mathf.Abs(BodyTrans.localScale.x) * -1, BodyTrans.localScale.y, BodyTrans.localScale.z);
            }
        }
        //尋找最近的敵人作為攻擊目標
        protected override Role FindClosestOpponent()
        {
            base.FindClosestOpponent();
            GameObject go = null;
            if (MyForce == Force.Player)
                go = GameobjectFinder.FindClosestGameobjectWithTags(gameObject, Force.Neutral.ToString(), Force.Opponent.ToString());
            else if (MyForce == Force.Opponent)
                go = GameobjectFinder.FindClosestGameobjectWithTags(gameObject, Force.Neutral.ToString(), Force.Player.ToString());
            if (go)
                ClosestOpponent = go.GetComponent<Role>();
            else
                ClosestOpponent = null;
            if (ShowTargetIndicator)
                FindAllOpponentAndShowIndicators();
            return ClosestOpponent;
        }

        void HideAllTargetIndicators()
        {
            for (int i = 0; i < IndicatorTrans.Count; i++)
            {
                IndicatorTrans[i].gameObject.SetActive(false);
            }
        }
        void FindAllOpponentAndShowIndicators()
        {
            if (!HasSimulationAuthority || !MyFollowCamera || !TargetIndicatorPrefab) return;
            if (!indicatorCamera) indicatorCamera = MyFollowCamera.GetComponentInChildren<Camera>();
            if (!indicatorCamera) { HideAllTargetIndicators(); return; }
            var targets = CombatRegistry.Roles;
            int used = 0;
            for (int i = 0; i < targets.Count; i++)
            {
                Role target = targets[i];
                if (!CombatRegistry.IsTarget(target) || target == this || target.MyForce == MyForce) continue;
                if (used == IndicatorTrans.Count) IndicatorTrans.Add(Instantiate(TargetIndicatorPrefab.transform));
                var indicator = IndicatorTrans[used++];
                indicator.position = GetDirectionIndicatorPos(indicatorCamera.transform.position, target.transform.position, indicator.gameObject);
                indicator.localRotation = Quaternion.Euler(0, 0, 270 - MyMath.GetAngerFormTowPoint2D(indicatorCamera.transform.position, target.transform.position));
            }
            // A dead/disconnected target must not leave its previous arrow visible.
            for (int i = used; i < IndicatorTrans.Count; i++) IndicatorTrans[i].gameObject.SetActive(false);
        }
        Vector3 GetDirectionIndicatorPos(Vector3 _selfPos, Vector3 _targetPos, GameObject _arrowObj)
        {
            var halfView = new Vector2(indicatorCamera.orthographicSize * indicatorCamera.aspect, indicatorCamera.orthographicSize);
            bool visible = CombatRegistry.TryIndicatorPosition(_targetPos - _selfPos, halfView, 25, out Vector2 offset);
            _arrowObj.SetActive(visible);
            return (Vector2)_selfPos + offset;
        }
        [PunRPC]
        public override void SelfDestroy()
        {
            if (PhotonNetwork.IsConnected)
            {
                if (photonView.IsMine)
                    BattleManager.BM.EndGame();
            }
            else
            {
                BattleManager.BM.EndGame();
            }
            base.SelfDestroy();
        }
        protected override void BufferEffectChange(RoleBuffer _buffer, bool _add, float _remainTime)
        {
            base.BufferEffectChange(_buffer, _add, _remainTime);
            switch (_buffer)
            {
                case RoleBuffer.TargetIndicate:
                    ShowTargetIndicator = _add;
                    if (!_add)
                        HideAllTargetIndicators();
                    break;
            }
        }

        void ArrowRotate()
        {
            if (PhotonNetwork.IsConnected && !photonView.IsMine)
            {
                if (TowardDirTrans == null)
                    return;
                // Fusion snapshot supplies the owner's aim, including while stationary.
                ArrowTargetAngle = ArrowAngle;
                //ArrowAngle = ArrowTargetAngle - 90;
            }
            TowardDirTrans.rotation = Quaternion.Euler(new Vector3(0, 0, ArrowAngle));
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
            state.stars = Star;
            return state;
        }
        public override void ApplyNetworkState(RoleNetworkState state)
        {
            if (state == null || !IsInit || HasSimulationAuthority || state.lifeRevision < NetworkLifeRevision) return;
            Exp = Mathf.Max(0, state.experience);
            Star = Mathf.Max(0, state.stars);
            base.ApplyNetworkState(state);
        }
        void OnDestroy()
        {
            foreach (Transform indicator in IndicatorTrans)
                if (indicator != null) Destroy(indicator.gameObject);
            IndicatorTrans.Clear();
            // The serialized camera is a prefab on proxies, never destroy that asset.
            if (CameraPlayer != null && MyFollowCamera != null) Destroy(MyFollowCamera.gameObject);
        }

        #region IPunObservable implementation

        public override void OnPhotonSerializeView(PhotonStream stream, PhotonMessageInfo info)
        {
            base.OnPhotonSerializeView(stream, info);
            if (stream.IsWriting)
            {
                //stream.SendNext(ArrowAngle);
                //stream.SendNext(MyRigi.velocity);
                //stream.SendNext(MyRigi.position);
            }
            else
            {
                //RemoteArrowAngle = (float)stream.ReceiveNext();
                //float MoveLagSec = Mathf.Abs((float)(PhotonNetwork.Time - info.SentServerTime));
                //Debug.Log(MoveLagSec);
                //RemoteVel = (Vector2)stream.ReceiveNext();
                //RemotePos = (Vector2)stream.ReceiveNext();
                //RemotePos += (MyRigi.velocity * MoveLagSec);
                //MyRigi.velocity = RemoteVel;
            }
        }
        void SetLVByExp(int _exp)
        {
            int maxLV = 0;
            while (LVUpExp > 0 && _exp >= LVUpExp)
            {
                _exp -= LVUpExp;
                LV++;
                maxLV++;
                if (maxLV > 100)
                {
                    Debug.LogError("玩家經驗錯誤");
                    break;
                }
            }
            Exp = _exp;
        }
        [PunRPC]
        public void GainExp(int _addEXP)
        {
            if (_addEXP <= 0 || !IsAlive)
                return;
            if (PhotonNetwork.IsConnected && photonView.IsMine)//將目前取得的資料記錄到Server上(已供後來加入的玩家進行同步)
            {
                PhotonTools.AddIntProp(PhotonNetwork.LocalPlayer, PunCustomProp.GainExp, _addEXP);
            }
            // A merged star keeps the rewards of each original pickup, with one sound/effect.
            PickupFeedback.Play(this, GainExpEffect, GainExpSound);
            HealProportionOfHP(0);
            if (!HasSimulationAuthority) return;
            for (int i = 0; i < _addEXP; i++)
            {
                Health += Mathf.RoundToInt(MaxHealth * GameSettingData.GainExpHealHP);
                ExecuteSkillTrigger(PSkillTriggerCondition.GainExp);
                Exp++;
                while (LVUpExp > 0 && Exp >= LVUpExp) LevelUp();
            }
            Star += _addEXP;
        }
        public void LevelUp()
        {
            Exp = Mathf.Max(0, Exp - LVUpExp);
            LV++;
            ExtendMaxHP(GameSettingData.LVUpAddMaxHP);
            if (PhotonLauncher.SelectGameType != GameType.Challenge)
            {
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
            }
            if (PhotonNetwork.IsConnected)
                BattleUI.ShowLVUpLog(photonView.Owner.NickName, LV);
            SizeGrowth();
        }
        void SizeGrowth()
        {
            float growthSize = (LV - 1) * GameSettingData.GrowthSizeRatio;
            if (growthSize > GameSettingData.GrowthMaxSizeRatio)
                growthSize = GameSettingData.GrowthMaxSizeRatio;
            AppearanceObj.transform.localScale = new Vector3(1 + growthSize, 1 + growthSize, 1 + growthSize);
        }

        public void GetRandomFeature(FeaturePart _part)
        {
            if (!PhotonNetwork.IsConnected)
            {
                FeatureData randomFeature = FeatureData.GetRandomOwnedFeatureData(_part);
                GetFeature(_part, randomFeature.ID);
            }
            else if (photonView.IsMine)
            {
                FeatureData randomFeature = FeatureData.GetRandomOwnedFeatureData(_part);
                //FeatureData randomFeature = FeatureData.GetRandomFeatureData(_part);
                photonView.RPC("GetFeature", RpcTarget.All, _part, randomFeature.ID);
            }
        }
        [PunRPC]
        public override void GetFeature(FeaturePart _part, int _featureDataID)
        {
            if (_featureDataID == 0)
                return;
            FeatureData data = FeatureData.GetFeatureData(_featureDataID);
            if (data == null)
                return;
            if (PhotonNetwork.IsConnected)
            {
                if (photonView.IsMine)
                    BattleUI.ShowGetSkill(data.Name);
            }
            else
                BattleUI.ShowGetSkill(data.Name);

            base.GetFeature(_part, _featureDataID);
            if (PhotonNetwork.IsConnected && photonView.IsMine)//將目前取得的資料記錄到Server上(已供後來加入的玩家進行同步)
            {
                switch (_part)
                {
                    case FeaturePart.Head:
                        PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Head, _featureDataID);
                        break;
                    case FeaturePart.Body:
                        PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Body, _featureDataID);
                        break;
                    case FeaturePart.Back:
                        PhotonTools.SetObjProp(PhotonNetwork.LocalPlayer, PunCustomProp.Back, _featureDataID);
                        break;
                }
            }
            if (PhotonNetwork.IsConnected)
            {
                if (photonView.IsMine)
                {
                    if (SkillDic.ContainsKey(_part) && SkillDic[_part] != null)
                        BattleUI.UpdateFeatureIcon(_part, SkillDic[_part], data.IconSprite);
                }
            }
            else
            {
                if (SkillDic.ContainsKey(_part) && SkillDic[_part] != null)
                    BattleUI.UpdateFeatureIcon(_part, SkillDic[_part], data.IconSprite);
            }
        }
        #endregion
    }
}
