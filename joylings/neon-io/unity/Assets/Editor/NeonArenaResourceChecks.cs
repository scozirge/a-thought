using System;
using System.Collections.Generic;
using System.Reflection;
using Neon.Networking;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Neon.Editor
{
    // Editor fixtures only: no Play Mode, network runner, profile writes or matchmaking.
    public static class NeonArenaResourceChecks
    {
        const BindingFlags Private = BindingFlags.Instance | BindingFlags.NonPublic;
        public static void Run()
        {
            NeonBuild.Validate();
            CheckResourcePickup();
            CheckSpawnPalette();
            CheckFreezeAssets();
            Debug.Log("NEON_ARENA_RESOURCE_CHECKS_OK resource identity boundaries; 1000 HP; no XP or pickup; no healing on identity refresh; eligible player magnets; initial viewer palette; freeze durations");
        }

        static void CheckResourcePickup()
        {
            var previousMode = PhotonLauncher.SelectGameType;
            var previousManager = BattleManager.BM;
            var previousStrings = GameDictionary.String_UIDic;
            var managerObject = new GameObject("Resource bot manager fixture");
            var botObject = Object.Instantiate(Resources.Load<GameObject>("NeutralRole"));
            var lootObject = Object.Instantiate(Resources.Load<GameObject>("ExpLoot"));
            try
            {
                BattleManager.BM = managerObject.AddComponent<BattleManager>();
                GameDictionary.String_UIDic = new Dictionary<string, StringData>();
                PhotonLauncher.SelectGameType = GameType.Arena;
                var bot = botObject.GetComponent<NeutralRole>();
                foreach (int id in new[] { 9999, 10000, 10015, 10016, 10031, 10032 })
                {
                    bot.ID = id;
                    Require(bot.CanCollectStars == (id < 10016 || id >= 10032), "Resource identity leaked into player seats or unrelated NPCs.");
                }
                bot.ID = 0; bot.MaxHealth = 1500; bot.Health = 1500;
                typeof(Role).GetField("IsInit", Private).SetValue(bot, true);
                typeof(Role).GetProperty("IsAlive").GetSetMethod(true).Invoke(bot, new object[] { true });
                bot.SetPlayerData("", 10016);
                Require(bot.MaxHealth == 1000 && bot.Health == 1000 && bot.LV == 1, "Resource spawn kept player stats.");
                bot.Health = 600;
                bot.SetPlayerData("", 10016);
                bot.GainExp(10000); bot.LevelUp();
                Require(bot.MaxHealth == 1000 && bot.Health == 600 && bot.LV == 1 &&
                    (int)typeof(NeutralRole).GetField("Exp", Private).GetValue(bot) == 0,
                    "Resource bot healed, gained XP or upgraded after identity refresh / direct XP delivery.");

                var loot = lootObject.GetComponent<ExpLoot>();
                var movement = lootObject.GetComponent<LootMove>();
                loot.SetLoot(true, Vector2.zero, Vector2.zero);
                loot.RestorePickupDeadline(0);
                typeof(ExpLoot).GetMethod("OnTriggerStay2D", Private).Invoke(loot, new object[] { bot.GetComponent<Collider2D>() });
                Require(loot.IsActive && loot.Value == 1, "Touching a resource bot consumed a star.");
                movement.SetMoveToTarget(bot.transform);
                loot.LaunchToward(bot);
                Require(!movement.MoveToPlayer && movement.DeathTargetId == 0, "Star homed toward an ineligible resource bot.");
                var absorber = bot.GetComponentInChildren<LootAbsorber>(true);
                Require(absorber != null, "Fixture has no original loot absorber.");
                absorber.SetAbsorbRange(900);
                Require(!absorber.GetComponent<CircleCollider2D>().enabled, "Resource bot activated its pickup sensor.");

                bot.ID = 10015;
                movement.SetMoveToTarget(bot.transform);
                Require(movement.MoveToPlayer, "Ranked AI seat lost normal star attraction.");
                movement.ResetForReuse(true);
                loot.LaunchToward(bot);
                Require(movement.DeathTargetId != 0 && loot.PickupReadyAt > PhotonNetwork.Time,
                    "Eligible killer lost death-star flight or its scatter grace period.");
                bot.ID = 10016;
                PhotonLauncher.SelectGameType = GameType.InfinityWar;
                Require(bot.CanCollectStars, "Resource restriction escaped arena mode.");
            }
            finally
            {
                Object.DestroyImmediate(lootObject); Object.DestroyImmediate(botObject); Object.DestroyImmediate(managerObject);
                BattleManager.BM = previousManager; PhotonLauncher.SelectGameType = previousMode;
                GameDictionary.String_UIDic = previousStrings;
            }
        }

        static void CheckSpawnPalette()
        {
            var instance = Object.Instantiate(Resources.Load<GameObject>("PlayerRole"));
            try
            {
                var player = instance.GetComponent<PlayerRole>();
                var appearance = (GameObject)typeof(Role).GetField("AppearanceObj", Private).GetValue(player);
                var block = new MaterialPropertyBlock();
                Require(!player.IsInitialized, "Fixture should exercise the frame before Init.");
                foreach (bool local in new[] { false, true })
                {
                    appearance.SetActive(false);
                    player.ApplyViewerFaction(local);
                    Require(appearance.activeSelf && player.MyForce == (local ? Force.Player : Force.Opponent),
                        "Initial appearance revealed without the viewer's faction.");
                    int count = 0;
                    foreach (var renderer in instance.GetComponentsInChildren<SpriteRenderer>(true))
                    {
                        renderer.GetPropertyBlock(block);
                        Require(block.GetFloat("_NeonSide") == (local ? 0 : 1), "Initial sprite retained the wrong side.");
                        Require(renderer.sharedMaterial.shader.name.StartsWith("Neon/Faction/"), "Initial sprite kept its legacy palette material.");
                        count++;
                    }
                    Require(count > 0, "Player fixture has no sprites.");
                }
            }
            finally { Object.DestroyImmediate(instance); }
        }

        static void CheckFreezeAssets()
        {
            var durations = new Dictionary<string, float>
            {
                {"Ammo-DoubleCrutch-Ice", 2.5f}, {"Ammo-FrozenShock", 2.5f}, {"Ammo-IceCannon", 2.5f},
                {"Ammo-Icicle", 2.5f}, {"Ammo-QuadrupleIcicle", 2.5f}, {"Bomb-FrozenShock", 2.5f},
                {"Bomb-FrozenWing", 1f}, {"Bomb-IceCannon", 2.5f}, {"Melee-FrozenSpray", .75f}, {"Melee-FrozenZone", 1f}
            };
            foreach (var entry in durations)
            {
                var ammo = Resources.Load<GameObject>("Gameobjects/Battle/Ammo/" + entry.Key).GetComponent<Ammo>();
                var buffs = (List<BufferData>)typeof(Ammo).GetField("Buffers", Private).GetValue(ammo);
                Require(buffs != null && buffs.Exists(b => b.Type == RoleBuffer.Freeze && Mathf.Approximately(b.Time, entry.Value)),
                    "Wrong imported freeze duration: " + entry.Key);
            }
        }

        static void Require(bool ok, string message) { if (!ok) throw new InvalidOperationException(message); }
    }
}
