using System;
using System.IO;
using Starbro.NeonIO;
using UnityEngine;

namespace Neon.Networking
{
    // 32 status slots, two names of at most 64 UTF-16 code units, and fixed scalar fields fit below 1024 bytes.
    // A binary snapshot avoids reserving 4096 bytes per role in every Fusion history entry.
    internal static class NeonRoleStateCodec
    {
        public const int Capacity = 1024;
        const byte Version = 2;
        const int MaximumBuffs = 32;
        public static byte[] Encode(RoleNetworkState state)
        {
            using (var stream = new MemoryStream(Capacity))
            using (var writer = new BinaryWriter(stream))
            {
                writer.Write(Version);
                writer.Write(state.health); writer.Write(state.maxHealth); writer.Write(state.level); writer.Write(state.id);
                writer.Write(state.experience); writer.Write(state.stars); writer.Write(state.kills); writer.Write(state.lifeRevision);
                writer.Write(state.alive);
                writer.Write(state.moveDirection.x); writer.Write(state.moveDirection.y); writer.Write(state.moveDirection.z); writer.Write(state.arrowAngle);
                writer.Write(ShortName(state.name)); writer.Write(ShortName(state.title));
                writer.Write(state.head); writer.Write(state.body); writer.Write(state.back);
                int count = state.buffs == null ? 0 : state.buffs.Length;
                if (count > MaximumBuffs) throw new InvalidDataException("Role status count exceeds protocol capacity.");
                writer.Write((byte)count);
                if (count > 0)
                {
                    Array.Sort(state.buffs, (first, second) => {
                        int type = first.type.CompareTo(second.type);
                        return type != 0 ? type : first.value2.CompareTo(second.value2);
                    });
                    foreach (var buff in state.buffs)
                    {
                        writer.Write(buff.type); writer.Write(buff.time); writer.Write(buff.value); writer.Write(buff.value2);
                    }
                }
                if (stream.Length > Capacity) throw new InvalidDataException("Role state exceeds protocol capacity.");
                return stream.ToArray();
            }
        }
        public static RoleNetworkState Decode(byte[] bytes)
        {
            if (bytes == null || bytes.Length > Capacity) throw new InvalidDataException("Invalid role snapshot size.");
            using (var stream = new MemoryStream(bytes, false))
            using (var reader = new BinaryReader(stream))
            {
                if (reader.ReadByte() != Version) throw new InvalidDataException("Unsupported role snapshot version.");
                var state = new RoleNetworkState
                {
                    health = reader.ReadInt32(), maxHealth = reader.ReadInt32(), level = reader.ReadInt32(), id = reader.ReadInt32(),
                    experience = reader.ReadInt32(), stars = reader.ReadInt32(), kills = reader.ReadInt32(), lifeRevision = reader.ReadInt32(),
                    alive = reader.ReadBoolean(),
                    moveDirection = new Vector3(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle()), arrowAngle = reader.ReadSingle(),
                    name = reader.ReadString(), title = reader.ReadString(),
                    head = reader.ReadInt32(), body = reader.ReadInt32(), back = reader.ReadInt32()
                };
                if (state.name.Length > 64 || state.title.Length > 64 || !Finite(state.moveDirection.x) || !Finite(state.moveDirection.y) || !Finite(state.moveDirection.z) || !Finite(state.arrowAngle)) throw new InvalidDataException("Invalid role snapshot fields.");
                int count = reader.ReadByte();
                if (count > MaximumBuffs) throw new InvalidDataException("Invalid role status count.");
                state.buffs = new RoleBufferState[count];
                for (int i = 0; i < count; i++)
                {
                    var buff = new RoleBufferState { type = reader.ReadInt32(), time = reader.ReadSingle(), value = reader.ReadSingle(), value2 = reader.ReadSingle() };
                    if (!Enum.IsDefined(typeof(RoleBuffer), buff.type) || !Finite(buff.time) || !Finite(buff.value) || !Finite(buff.value2)) throw new InvalidDataException("Invalid role status.");
                    state.buffs[i] = buff;
                }
                if (stream.Position != stream.Length) throw new InvalidDataException("Unexpected trailing role state.");
                return state;
            }
        }
        static string ShortName(string value) { return string.IsNullOrEmpty(value) ? "" : value.Length <= 64 ? value : value.Substring(0, 64); }
        static bool Finite(float number) { return !float.IsNaN(number) && !float.IsInfinity(number); }
    }
}
