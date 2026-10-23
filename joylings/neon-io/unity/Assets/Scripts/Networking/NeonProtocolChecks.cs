#if UNITY_EDITOR
using System;
using System.IO;
using Starbro.NeonIO;
using UnityEditor;
using UnityEngine;

namespace Neon.Networking
{
    public static class NeonProtocolChecks
    {
        [MenuItem("Neon IO/Check network protocol")]
        public static void Run()
        {
            var tickRate = Fusion.TickRate.Resolve(Fusion.NetworkProjectConfig.Global.Simulation.TickRateSelection);
            Require(NeonArenaRules.AmbientStarsPerWindow(4000) == 24 && NeonArenaRules.AmbientStarsPerWindow(2000) == 6
                && NeonArenaRules.AmbientStarsPerWindow(1000) == 1 && NeonArenaRules.AmbientStarsPerWindow(800) == 0,
                "Ambient stars must decrease with safe-zone area, stopping in the final circle.");
            Require(NeonArenaRules.AmbientStarLimit(2000) == 96 && NeonArenaRules.AmbientStarLimit(1000) == 24
                && !NeonArenaRules.CanSpawnAmbientStar(2000, 96, 96)
                && !NeonArenaRules.CanSpawnAmbientStar(4000, 0, 384)
                && !NeonArenaRules.CanSpawnAmbientStar(0, 0, 0)
                && !NeonArenaRules.CanSpawnAmbientStar(-1, 0, 0), "Ambient density or collapsed-circle limit failed.");
            Require(tickRate.Client == 32 && tickRate.Server == 32 && tickRate.ClientSend == 16 && tickRate.ServerSend == 16,
                "Fusion Shared tick/send rates must be 32/16 without runtime fallback.");
            var bytes = NeonWireCodec.Pack("BeAttackAndAddBuffer", new object[] { 25, new Vector2(3, -4), new int[] { (int)RoleBuffer.Stun }, new float[] { 2 }, new float[] { 0.5f }, new float[] { 0 } });
            var decoded = NeonWireCodec.Unpack(bytes);
            var arguments = (object[])decoded[1];
            Require((string)decoded[0] == "BeAttackAndAddBuffer" && (int)arguments[0] == 25 && (Vector2)arguments[1] == new Vector2(3, -4), "Hit RPC round trip changed values.");
            Require(NeonRpcValidation.IsValid((string)decoded[0], arguments), "Valid hit rejected.");
            arguments[5] = new float[0];
            Require(!NeonRpcValidation.IsValid((string)decoded[0], arguments), "Mismatched fourth buff array accepted.");
            Require(!NeonRpcValidation.IsValid("BeAttack", new object[] { -1, Vector2.zero }), "Negative damage accepted.");
            Require(!NeonRpcValidation.IsValid("BeAttack", new object[] { 10, new Vector2(float.NaN, 0) }), "NaN hit force accepted.");
            Require(NeonRpcValidation.IsValid("AddBuffer", new object[] { new BufferData(RoleBuffer.Stun, 99999, 0, 0) }), "Legacy long-lived buff rejected.");
            Require(!NeonRpcValidation.IsValid("GainExp", new object[] { 0 }), "Zero experience accepted.");
            var confirmedHit = new object[] { 1, 50, Vector2.zero, "BumpHit", Vector2.zero, Array.Empty<int>(), Array.Empty<float>(), Array.Empty<float>(), Array.Empty<float>(), 1, 0.25f };
            var hitRoundTrip = NeonWireCodec.Unpack(NeonWireCodec.Pack("ReceiveNetworkHit", confirmedHit));
            Require(NeonRpcValidation.IsValid((string)hitRoundTrip[0], (object[])hitRoundTrip[1]), "Confirmed hit packet rejected.");
            confirmedHit[10] = 2f;
            Require(!NeonRpcValidation.IsValid("ReceiveNetworkHit", confirmedHit), "Invalid lifesteal ratio accepted.");
            var properties = new Hashtable { { "Kills", 7 }, { "GodStateTime", 12.5f }, { "Buffers", "暈眩" } };
            var propertiesBack = NeonWireCodec.UnpackProperties(NeonWireCodec.PackProperties(properties));
            Require((int)propertiesBack["Kills"] == 7 && (float)propertiesBack["GodStateTime"] == 12.5f && (string)propertiesBack["Buffers"] == "暈眩", "Player properties round trip failed.");
            var remotePlayer = new Player { ActorNumber = 123 };
            Require(!remotePlayer.SetCustomProperties(new Hashtable { { "ChallengeEnded", 1 } }) && remotePlayer.CustomProperties.Count == 0,
                "A remote player without a ready session accepted locally forged properties.");
            bool rejected = false;
            try { NeonWireCodec.Unpack(new byte[] { 10, 255, 255, 255, 127 }); } catch (InvalidDataException) { rejected = true; }
            Require(rejected, "Oversized untrusted collection was not rejected.");
            var statusTypes = (RoleBuffer[])Enum.GetValues(typeof(RoleBuffer));
            var fullRole = new RoleNetworkState { health = 1234, maxHealth = 9999, level = 17, id = 10001,
                experience = 345, stars = 123, kills = 5, lifeRevision = 7, alive = true,
                moveDirection = new Vector3(-1, 0.5f, 0), arrowAngle = -123.5f,
                name = new string('界', 64), title = new string('霓', 64), head = 1, body = 101, back = 201,
                buffs = new RoleBufferState[statusTypes.Length] };
            for (int i = 0; i < statusTypes.Length; i++) fullRole.buffs[i] = new RoleBufferState { type = (int)statusTypes[i], time = 99999, value = 0.5f, value2 = 123 };
            byte[] roleBytes = NeonRoleStateCodec.Encode(fullRole);
            var roleBack = NeonRoleStateCodec.Decode(roleBytes);
            Require(roleBytes.Length <= 1024 && roleBack.buffs.Length == statusTypes.Length && roleBack.name == fullRole.name && roleBack.title == fullRole.title && roleBack.lifeRevision == 7 && roleBack.health == 1234 && roleBack.arrowAngle == -123.5f, "Maximum Unicode/status role state failed.");
            var packedBytes = new byte[] { 0, 127, 128, 255, 1 };
            var unpackedBytes = new byte[packedBytes.Length];
            NeonPackedState.UnpackWord(NeonPackedState.PackWord(packedBytes, 0), unpackedBytes, 0);
            NeonPackedState.UnpackWord(NeonPackedState.PackWord(packedBytes, 4), unpackedBytes, 4);
            for (int i = 0; i < packedBytes.Length; i++) Require(packedBytes[i] == unpackedBytes[i], "Packed word sign or partial-tail round trip failed.");
            rejected = false;
            try { NeonRoleStateCodec.Decode(new byte[1025]); } catch (InvalidDataException) { rejected = true; }
            Require(rejected, "Oversized role snapshot accepted.");
            Require(AssetDatabase.AssetPathToGUID("Assets/Scripts/Networking/PhotonView.cs") == "aa584fbee541324448dd18d8409c7a41", "Original prefab PhotonView GUID was not preserved.");
            var lootObject = new GameObject("Protocol loot value check");
            try
            {
                lootObject.AddComponent<CircleCollider2D>();
                var loot = lootObject.AddComponent<Scoz.Func.ExpLoot>();
                Require(loot.AddValue(30) == 30 && loot.AddValue(100) == 100 && loot.Value == 131, "Aggregated loot lost value.");
                loot.Value = int.MaxValue - 2;
                Require(loot.AddValue(10) == 2 && loot.Value == int.MaxValue, "Loot value overflow was not prevented.");
                Require(loot.AddValue(-1) == 0 && loot.Value == int.MaxValue, "Negative loot contribution changed value.");
                loot.SetLoot(true, Vector2.zero, Vector2.zero);
                Require(loot.Value == 1, "Reused loot retained an old aggregate value.");
                int total = 0, packets = 0;
                foreach (int grant in Scoz.Func.ExpLoot.SplitGrants(25001))
                {
                    Require(NeonRpcValidation.IsValid("GainExp", new object[] { grant }), "Aggregate grant exceeded RPC bounds.");
                    total += grant; packets++;
                }
                Require(total == 25001 && packets == 3, "Aggregate grant splitting changed the total value.");
            }
            finally { UnityEngine.Object.DestroyImmediate(lootObject); }
            Debug.Log("NEON_PROTOCOL_CHECKS_OK typed RPC, max Unicode/all buffs " + roleBytes.Length + " bytes, packed state, GUID, aggregate loot, malformed data, hit validation");
        }
        static void Require(bool condition, string message) { if (!condition) throw new Exception(message); }
    }
}
#endif
