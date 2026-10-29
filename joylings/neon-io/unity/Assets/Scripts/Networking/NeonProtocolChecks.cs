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
            Require(NeonArenaRules.AmbientStarsPerWindow(4000) == 4 && NeonArenaRules.AmbientStarsPerWindow(2000) == 2
                && NeonArenaRules.AmbientStarsPerWindow(1000) == 1 && NeonArenaRules.AmbientStarsPerWindow(800) == 0,
                "Ambient stars must decrease with safe-zone area, stopping in the final circle.");
            Require(NeonArenaRules.AmbientStarLimit(2000) == 96 && NeonArenaRules.AmbientStarLimit(1000) == 24
                && !NeonArenaRules.CanSpawnAmbientStar(2000, 96, 96)
                && !NeonArenaRules.CanSpawnAmbientStar(4000, 0, 384)
                && !NeonArenaRules.CanSpawnAmbientStar(0, 0, 0)
                && !NeonArenaRules.CanSpawnAmbientStar(-1, 0, 0), "Ambient density or collapsed-circle limit failed.");
            Require(NeonArenaRules.DropCount(0) == 2 && NeonArenaRules.DropCount(15) == 2 && NeonArenaRules.DropCount(16) == 1
                && NeonArenaRules.DropCount(31) == 1 && NeonArenaRules.DropCount(-1) == 0, "Arena death drops must be two for seats, one for resource bots.");
            Require(NeonArenaRules.Radius(15) == 4000 && NeonArenaRules.Radius(52.5f) == 2000
                && NeonArenaRules.Radius(90) == 0, "Black mist must close after 15 + 75 seconds.");
            Require(NeonArenaRules.QueueSeconds == 1, "Test queue must wait one second.");
            for (int rank = 1; rank <= 16; rank++)
            {
                int bots = NeonArenaRating.Delta(rank, 1000, Array.Empty<int>());
                int peers = NeonArenaRating.Delta(rank, 1000, new[] { 1000 });
                int higher = NeonArenaRating.Delta(rank, 1000, new[] { 1400 });
                int lower = NeonArenaRating.Delta(rank, 1000, new[] { 600 });
                Require(bots == peers && (rank <= 3 ? bots > 0 : bots < 0), "Rating sign or bot baseline failed.");
                Require(higher >= peers && lower <= peers, "Opponent rating must alter rewards and losses consistently.");
            }
            Require(NeonArenaRating.Delta(1,1000,new[]{1400})==45 && NeonArenaRating.Delta(16,1000,new[]{1400})==-10,
                "Higher-opponent rating examples failed.");
            Require(NeonArenaRating.Delta(1,1000,new[]{600})==15 && NeonArenaRating.Delta(16,1000,new[]{600})==-30,
                "Lower-opponent rating examples failed.");
            string normalRatingKey = NeonArenaRating.StorageKey;
            NeonArenaRating.StorageKey = "Neon.Test.Rating." + Guid.NewGuid().ToString("N");
            try
            {
                Require(NeonArenaRating.Current == 1000, "New player rating must be 1000.");
                NeonArenaRating.Begin("one", -20); NeonArenaRating.Complete("one",30); NeonArenaRating.Complete("one",30);
                Require(NeonArenaRating.Current == 1030, "Rating settlement applied twice.");
                NeonArenaRating.Begin("two", -20); NeonArenaRating.RecoverAbandoned(); NeonArenaRating.RecoverAbandoned();
                Require(NeonArenaRating.Current == 1010, "Abandoned match was not settled exactly once.");
                NeonArenaRating.Complete("floor", -2000);
                Require(NeonArenaRating.Current == 0 && NeonArenaRating.LastDelta == -1010, "Rating floor or displayed delta failed.");
            }
            finally { Neon.ProfilePreferences.DeleteKey(NeonArenaRating.StorageKey); Neon.ProfilePreferences.Save(); NeonArenaRating.StorageKey = normalRatingKey; }
            Require(NeonBotDifficulty.TierFor(999)==0 && NeonBotDifficulty.TierFor(1000)==1 && NeonBotDifficulty.TierFor(1599)==1
                && NeonBotDifficulty.TierFor(1600)==2 && NeonBotDifficulty.TierFor(100000)==2, "Bot tier boundaries failed.");
            foreach (int rating in new[] { 1000, 1600 })
            {
                var previousTier=NeonBotDifficulty.For(rating-1); var nextTier=NeonBotDifficulty.For(rating);
                Require(nextTier.Decision < previousTier.Decision && nextTier.Scan < previousTier.Scan && nextTier.Turn > previousTier.Turn
                    && nextTier.Margin > previousTier.Margin, "Bot tiers must improve reaction and zone planning.");
            }
            var botCast = new object[] { (int)FeaturePart.Head, 0, 5, 123, new Vector3(200, 300, 0), Vector3.up };
            var botCastBack = NeonWireCodec.Unpack(NeonWireCodec.Pack("CastBotSkill", botCast));
            Require(NeonRpcValidation.IsValid((string)botCastBack[0], (object[])botCastBack[1]), "Bot cast aim snapshot failed round trip.");
            botCast[5] = new Vector3(float.NaN, 0, 0);
            Require(!NeonRpcValidation.IsValid("CastBotSkill", botCast), "Invalid bot aim accepted.");
            NeonBotChecks.Run();
            int queuesWithDeparture = 0;
            for (int seed = 0; seed < 40; seed++)
            {
                var queue = new NeonQueueProgress("queue-" + seed); var same = new NeonQueueProgress("queue-" + seed);
                int previous = 0, pauses = 0, clusters = 0; bool departed = false;
                for (int step = 0; step <= 30; step++)
                {
                    int count = queue.CountAt(step * NeonArenaRules.QueueSeconds / 30f);
                    Require(count >= 1 && count <= 16 && count == same.CountAt(step * NeonArenaRules.QueueSeconds / 30f), "Queue seats must be bounded and reproducible across reflows/peers.");
                    if (count < previous) departed = true;
                    if (count == previous) pauses++; if (count - previous > 1) clusters++;
                    previous = count;
                }
                Require(queue.CountAt(0) == 1 && previous == 16 && pauses > 2 && clusters > 0, "Queue must have pauses, clusters and finish before launch.");
                if (departed) queuesWithDeparture++;
            }
            Require(queuesWithDeparture > 10 && queuesWithDeparture < 40, "Some queues should have temporary vacancies; others should not.");
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
            var speeds = new SpeedBuffStack();
            speeds.Set(1, 3, .3f); speeds.Set(257, 1, .6f);
            Require(Mathf.Abs(speeds.Total - .9f) < .0001f, "Independent speed sources did not stack.");
            speeds.Set(1, 3, .3f);
            Require(speeds.Count == 2 && Mathf.Abs(speeds.Total - .9f) < .0001f, "Refreshing a speed source stacked it twice.");
            speeds.Tick(1.1f);
            Require(speeds.Count == 1 && Mathf.Abs(speeds.Total - .3f) < .0001f, "Expired speed source affected another source.");
            speeds.Set(257, 5, .4f); speeds.Remove(1);
            Require(speeds.Count == 1 && Mathf.Abs(speeds.Total - .4f) < .0001f, "Removing a skill cleared unrelated speed.");
            Require(SpeedBuffStack.StunDuration(5, 1) == 5 && SpeedBuffStack.StunDuration(.5f, 1) == 1,
                "Stun did not preserve the longer remaining duration.");
            speeds.Clear(); Require(speeds.Count == 0 && speeds.Total == 0, "Speed survived reset.");
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
            var stackedRole = new RoleNetworkState { name = new string('界', 64), title = new string('霓', 64), buffs = new RoleBufferState[32] };
            for (int i = 0; i < 32; i++) stackedRole.buffs[i] = new RoleBufferState { type = (int)RoleBuffer.SpeedUp, time = i + 1, value = .1f, value2 = i };
            byte[] stackedBytes = NeonRoleStateCodec.Encode(stackedRole);
            var stackedBack = NeonRoleStateCodec.Decode(stackedBytes);
            Require(stackedBytes.Length <= NeonRoleStateCodec.Capacity && stackedBack.buffs.Length == 32, "Stacked status snapshot overflow.");
            var migrated = new SpeedBuffStack();
            foreach (var buff in stackedBack.buffs) migrated.Set((int)buff.value2, buff.time, buff.value);
            migrated.Tick(1.1f);
            Require(migrated.Count == 31 && Mathf.Abs(migrated.Total - 3.1f) < .0001f, "Snapshot lost independent speed expiry.");
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
