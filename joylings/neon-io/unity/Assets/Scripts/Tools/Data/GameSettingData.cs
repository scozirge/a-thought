using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using LitJson;
using Starbro.NeonIO;
namespace Scoz.Func
{
    public class GameSettingData : Data
    {
        public new string ID;
        //一般
        public static Language DefaultLanguage = Language.English;

        //戰鬥常數
        public static float FreezeMove;
        public static float BurnDamage;
        public static float BurnTriggerInterval;
        public static float RecoveryTriggerInterval;
        public static float BleedDamage;
        public static float BleedTriggerInterval;
        public static float OutsideCurseDamage;
        public static float OutsideCurseTriggerInterval;
        public static float SickDamageReduce;
        public static int[] PlayerDropStarExp = new int[4];
        public static int PlayerLVAddDropStarExp;
        public static int LVUpAddMaxHP;
        public static float[] ClamorProbabilities = new float[7];
        public static float ClamorCD;
        public static float ClamorTextDuration;
        public static float GainExpHealHP;

        //玩家腳色資料
        public static int Health;
        public static int Damage;
        public static int MoveSpeed;
        public static float MeleeStunTime;
        public static float MeleeSelfSturnTime;
        public static float BumpSturnTime;
        public static int[] NeedExps = new int[4];
        public static float GrowthSizeRatio;
        public static float GrowthMaxSizeRatio;
        //中立腳色資料
        public static int NeutralHealth;
        public static int NeutralDamage;
        public static float NeutralGetFeatureProbability;

        public static float DefaultGodProbability;
        public static int GodHealth;
        public static int GodDamage;
        public static int GodMoveSpeed;
        public static int GodDropStarExp;
        public static int GodDebutTime;
        public static int GodExistTime;
        public static int GodSpawnReSpawnTime;


        public static byte MaxPlayersPerRoom;
        public static int MaxRolePerRoom;
        public static string InitAIRoleCount;
        public static string AIRoleJoinInterval;
        public static string AIReSpawnInterval;
        public static float AIRoleChangeProbability;
        public static float GuestAIProbability;

        //Challenge資料
        public static int Health_C;
        public static int Damage_C;
        public static int NeutralHealth_C;
        public static int NeutralDamage_C;
        public static int NeutralGetFeatureProbability_C;
        public static byte MaxPlayersPerRoom_C;
        public static int MaxRolePerRoom_C;
        public static string InitAIRoleCount_C;
        public static float ChangeFeatureTime_C;
        public static int WinRankScore_C;
        public static int LoseRankScore_C;
        public static int WinningStreakRankScore_C;
        public static int MaxRankScore_C;
        public static int WinStar_C;
        public static int LoseStar_C;
        public static int WinningStreakStar_C;
        public static int MaxStar_C;
        public static int MinSearchingTime_C;
        public static int MaxSearchingTime_C;


        //商店
        public static int ReviveKreds;
        public static int PremiumKreds;
        public static int HeadSpellClamorKreds;
        public static int BodySpellClamorKreds;
        public static int BackSpellClamorKreds;
        public static string HeadSpellClamorKGShopID;
        public static string BodySpellClamorKGShopID;
        public static string BackSpellClamorKGShopID;
        public static int GeneralClamorStar;
        public static string ReviveKGShopID;
        public static string PremiumKGShopID;


        protected override void GetDataFromJson(JsonData _item)
        {
            base.GetDataFromJson(_item);
            try
            {
                JsonData item = _item;
                foreach (string key in item.Keys)
                {
                    switch (key)
                    {
                        case "ID":
                            ID = item[key].ToString();
                            break;
                        case "Value":
                            switch (ID)
                            {
                                //一般
                                case "DefaultLanguage":
                                    DefaultLanguage = (Language)int.Parse(item[key].ToString());
                                    break;
                                //戰鬥常數
                                case "FreezeMove":
                                    FreezeMove = float.Parse(item[key].ToString());
                                    break;
                                case "BurnDamage":
                                    BurnDamage = float.Parse(item[key].ToString());
                                    break;
                                case "BurnTriggerInterval":
                                    BurnTriggerInterval = float.Parse(item[key].ToString());
                                    break;
                                case "RecoveryTriggerInterval":
                                    RecoveryTriggerInterval = float.Parse(item[key].ToString());
                                    break;
                                case "BleedDamage":
                                    BleedDamage = float.Parse(item[key].ToString());
                                    break;
                                case "BleedTriggerInterval":
                                    BleedTriggerInterval = float.Parse(item[key].ToString());
                                    break;
                                case "OutsideCurseDamage":
                                    OutsideCurseDamage = float.Parse(item[key].ToString());
                                    break;
                                case "OutsideCurseTriggerInterval":
                                    OutsideCurseTriggerInterval = float.Parse(item[key].ToString());
                                    break;
                                case "SickDamageReduce":
                                    SickDamageReduce = float.Parse(item[key].ToString());
                                    break;
                                case "PlayerLV1DropStarExp":
                                    PlayerDropStarExp[0] = int.Parse(item[key].ToString());
                                    break;
                                case "PlayerLV2DropStarExp":
                                    PlayerDropStarExp[1] = int.Parse(item[key].ToString());
                                    break;
                                case "PlayerLV3DropStarExp":
                                    PlayerDropStarExp[2] = int.Parse(item[key].ToString());
                                    break;
                                case "PlayerLV4DropStarExp":
                                    PlayerDropStarExp[3] = int.Parse(item[key].ToString());
                                    break;
                                case "PlayerLVAddDropStarExp":
                                    PlayerLVAddDropStarExp = int.Parse(item[key].ToString());
                                    break;
                                case "LVUpAddMaxHP":
                                    LVUpAddMaxHP = int.Parse(item[key].ToString());
                                    break;
                                case "KillClamorProbability":
                                    ClamorProbabilities[0] = float.Parse(item[key].ToString());
                                    break;
                                case "DieClamorProbability":
                                    ClamorProbabilities[1] = float.Parse(item[key].ToString());
                                    break;
                                case "LevelUpClamorProbability":
                                    ClamorProbabilities[2] = float.Parse(item[key].ToString());
                                    break;
                                case "HitClamorProbability":
                                    ClamorProbabilities[3] = float.Parse(item[key].ToString());
                                    break;
                                case "BeHitClamorProbability":
                                    ClamorProbabilities[4] = float.Parse(item[key].ToString());
                                    break;
                                case "DebutClamorProbability":
                                    ClamorProbabilities[5] = float.Parse(item[key].ToString());
                                    break;
                                case "SpellClamorProbability":
                                    ClamorProbabilities[6] = float.Parse(item[key].ToString());
                                    break;
                                case "ClamorCD":
                                    ClamorCD = float.Parse(item[key].ToString());
                                    break;
                                case "ClamorTextDuration":
                                    ClamorTextDuration = float.Parse(item[key].ToString());
                                    break;
                                case "GainExpHealHP":
                                    GainExpHealHP = float.Parse(item[key].ToString());
                                    break;
                                //玩家腳色資料
                                case "Health":
                                    Health = int.Parse(item[key].ToString());
                                    break;
                                case "Damage":
                                    Damage = int.Parse(item[key].ToString());
                                    break;
                                case "MoveSpeed":
                                    MoveSpeed = int.Parse(item[key].ToString());
                                    break;
                                case "MeleeStunTime":
                                    MeleeStunTime = float.Parse(item[key].ToString());
                                    break;
                                case "MeleeSelfSturnTime":
                                    MeleeSelfSturnTime = float.Parse(item[key].ToString());
                                    break;
                                case "BumpSturnTime":
                                    BumpSturnTime = float.Parse(item[key].ToString());
                                    break;
                                case "LV2NeedExp":
                                    NeedExps[0] = int.Parse(item[key].ToString());
                                    break;
                                case "LV3NeedExp":
                                    NeedExps[1] = int.Parse(item[key].ToString());
                                    break;
                                case "LV4NeedExp":
                                    NeedExps[2] = int.Parse(item[key].ToString());
                                    break;
                                case "LV5UpNeedExp":
                                    NeedExps[3] = int.Parse(item[key].ToString());
                                    break;
                                case "GrowthSizeRatio":
                                    GrowthSizeRatio = float.Parse(item[key].ToString());
                                    break;
                                case "GrowthMaxSizeRatio":
                                    GrowthMaxSizeRatio = float.Parse(item[key].ToString());
                                    break;
                                //中立腳色資料
                                case "DefaultGodProbability":
                                    DefaultGodProbability = float.Parse(item[key].ToString());
                                    break;
                                case "NeutralHealth":
                                    NeutralHealth = int.Parse(item[key].ToString());
                                    break;
                                case "NeutralDamage":
                                    NeutralDamage = int.Parse(item[key].ToString());
                                    break;
                                case "NeutralGetFeatureProbability":
                                    NeutralGetFeatureProbability = float.Parse(item[key].ToString());
                                    break;
                                case "GodHealth":
                                    GodHealth = int.Parse(item[key].ToString());
                                    break;
                                case "GodDamage":
                                    GodDamage = int.Parse(item[key].ToString());
                                    break;
                                case "GodMoveSpeed":
                                    GodMoveSpeed = int.Parse(item[key].ToString());
                                    break;
                                case "GodDropStarExp":
                                    GodDropStarExp = int.Parse(item[key].ToString());
                                    break;
                                case "GodDebutTime":
                                    GodDebutTime = int.Parse(item[key].ToString());
                                    break;
                                case "GodExistTime":
                                    GodExistTime = int.Parse(item[key].ToString());
                                    break;
                                case "GodSpawnReSpawnTime":
                                    GodSpawnReSpawnTime = int.Parse(item[key].ToString());
                                    break;
                                case "MaxPlayersPerRoom":
                                    MaxPlayersPerRoom = byte.Parse(item[key].ToString());
                                    break;
                                case "MaxRolePerRoom":
                                    MaxRolePerRoom = int.Parse(item[key].ToString());
                                    break;
                                case "InitAIRoleCount":
                                    InitAIRoleCount = item[key].ToString();
                                    break;
                                case "AIRoleJoinInterval":
                                    AIRoleJoinInterval = item[key].ToString();
                                    break;
                                case "AIReSpawnInterval":
                                    AIReSpawnInterval = item[key].ToString();
                                    break;
                                case "AIRoleChangeProbability":
                                    AIRoleChangeProbability = float.Parse(item[key].ToString());
                                    break;
                                case "GuestAIProbability":
                                    GuestAIProbability = float.Parse(item[key].ToString());
                                    break;
                                //Challenge資料
                                case "Health_C":
                                    Health_C = int.Parse(item[key].ToString());
                                    break;
                                case "Damage_C":
                                    Damage_C = int.Parse(item[key].ToString());
                                    break;
                                case "NeutralHealth_C":
                                    NeutralHealth_C = int.Parse(item[key].ToString());
                                    break;
                                case "NeutralDamage_C":
                                    NeutralDamage_C = int.Parse(item[key].ToString());
                                    break;
                                case "NeutralGetFeatureProbability_C":
                                    NeutralGetFeatureProbability_C = int.Parse(item[key].ToString());
                                    break;
                                case "MaxPlayersPerRoom_C":
                                    MaxPlayersPerRoom_C = byte.Parse(item[key].ToString());
                                    break;
                                case "MaxRolePerRoom_C":
                                    MaxRolePerRoom_C = int.Parse(item[key].ToString());
                                    break;
                                case "InitAIRoleCount_C":
                                    InitAIRoleCount_C = item[key].ToString();
                                    break;
                                case "ChangeFeatureTime_C":
                                    ChangeFeatureTime_C = float.Parse(item[key].ToString());
                                    break;

                                case "WinRankScore_C":
                                    WinRankScore_C = int.Parse(item[key].ToString());
                                    break;
                                case "LoseRankScore_C":
                                    LoseRankScore_C = int.Parse(item[key].ToString());
                                    break;
                                case "WinningStreakRankScore_C":
                                    WinningStreakRankScore_C = int.Parse(item[key].ToString());
                                    break;
                                case "MaxRankScore_C":
                                    MaxRankScore_C = int.Parse(item[key].ToString());
                                    break;
                                case "WinStar_C":
                                    WinStar_C = int.Parse(item[key].ToString());
                                    break;
                                case "LoseStar_C":
                                    LoseStar_C = int.Parse(item[key].ToString());
                                    break;
                                case "WinningStreakStar_C":
                                    WinningStreakStar_C = int.Parse(item[key].ToString());
                                    break;
                                case "MaxStar_C":
                                    MaxStar_C = int.Parse(item[key].ToString());
                                    break;
                                case "MaxSearchingTime_C":
                                    string[] timeStrs = item[key].ToString().Split(':');
                                    MinSearchingTime_C = int.Parse(timeStrs[0]);
                                    MaxSearchingTime_C = int.Parse(timeStrs[1]);
                                    break;
                                //商店
                                case "ReviveKreds":
                                    ReviveKreds = int.Parse(item[key].ToString());
                                    break;
                                case "PremiumKreds":
                                    PremiumKreds = int.Parse(item[key].ToString());
                                    break;
                                case "HeadSpellClamorKreds":
                                    HeadSpellClamorKreds = int.Parse(item[key].ToString());
                                    break;
                                case "BodySpellClamorKreds":
                                    BodySpellClamorKreds = int.Parse(item[key].ToString());
                                    break;
                                case "BackSpellClamorKreds":
                                    BackSpellClamorKreds = int.Parse(item[key].ToString());
                                    break;
                                case "HeadSpellClamorKGShopID":
                                    HeadSpellClamorKGShopID = item[key].ToString();
                                    break;
                                case "BodySpellClamorKGShopID":
                                    BodySpellClamorKGShopID = item[key].ToString();
                                    break;
                                case "BackSpellClamorKGShopID":
                                    BackSpellClamorKGShopID = item[key].ToString();
                                    break;
                                case "GeneralClamorStar":
                                    GeneralClamorStar = int.Parse(item[key].ToString());
                                    break;
                                case "ReviveKGShopID":
                                    ReviveKGShopID = item[key].ToString();
                                    break;
                                case "PremiumKGShopID":
                                    PremiumKGShopID = item[key].ToString();
                                    break;
                                default:
                                    Debug.LogWarning(string.Format("{0}表有不明屬性:{1}", DataName, ID));
                                    break;
                            }
                            break;
                        default:
                            Debug.LogWarning(string.Format("{0}表有不明屬性:{1}", DataName, key));
                            break;
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogException(ex);
            }
        }
        public static int GetDropExpStarCount(int _lv)
        {
            int count = 0;
            if (_lv > 0 && _lv < 5)
            {
                count = PlayerDropStarExp[_lv - 1];
            }
            else
                count = PlayerDropStarExp[3] + PlayerLVAddDropStarExp * (_lv - 4);
            return count;
        }
        public static int GetRandomAIRoleCount()
        {
            string[] list;
            if (PhotonLauncher.SelectGameType == GameType.InfinityWar)
                list=InitAIRoleCount.Split(':');
            else
                list = InitAIRoleCount_C.Split(':');
            return UnityEngine.Random.Range(int.Parse(list[0]), int.Parse(list[1]) + 1);
        }
        public static int GetRandomAIRoleJoinInterval()
        {
            string[] list = AIRoleJoinInterval.Split(':');
            return UnityEngine.Random.Range(int.Parse(list[0]), int.Parse(list[1]) + 1);
        }
        public static int GetRandomAIRoleReSpawnInterval()
        {
            string[] list = AIReSpawnInterval.Split(':');
            return UnityEngine.Random.Range(int.Parse(list[0]), int.Parse(list[1]) + 1);
        }
    }
}
