using System;
using System.IO;
using System.Collections;
using UnityEngine;
using Starbro.NeonIO;

namespace Neon.Networking
{
    // Deliberately small, typed and bounded protocol; never deserialize arbitrary CLR types from peers.
    internal static class NeonWireCodec
    {
        const int MaximumElements = 256;
        public static byte[] Pack(params object[] values)
        {
            using (var stream = new MemoryStream())
            using (var writer = new BinaryWriter(stream))
            {
                Write(writer, values);
                if (stream.Length > 8192) throw new InvalidDataException("Network payload exceeds 8192 bytes.");
                return stream.ToArray();
            }
        }
        public static object[] Unpack(byte[] data)
        {
            if (data == null || data.Length > 8192) throw new InvalidDataException("Invalid network payload length.");
            using (var stream = new MemoryStream(data, false))
            using (var reader = new BinaryReader(stream))
                return (object[])Read(reader, 0);
        }
        public static byte[] PackProperties(Hashtable properties)
        {
            var entries = new object[properties.Count * 2]; int index = 0;
            foreach (DictionaryEntry pair in properties) { entries[index++] = pair.Key.ToString(); entries[index++] = pair.Value; }
            return Pack(entries);
        }
        public static Hashtable UnpackProperties(byte[] bytes)
        {
            var result = new Hashtable(); var entries = Unpack(bytes);
            for (int i = 0; i + 1 < entries.Length; i += 2) result[(string)entries[i]] = entries[i + 1];
            return result;
        }
        static void Write(BinaryWriter writer, object value)
        {
            if (value == null) { writer.Write((byte)0); return; }
            if (value.GetType().IsEnum) value = Convert.ToInt32(value);
            if (value is int) { writer.Write((byte)1); writer.Write((int)value); }
            else if (value is float) { writer.Write((byte)2); writer.Write((float)value); }
            else if (value is bool) { writer.Write((byte)3); writer.Write((bool)value); }
            else if (value is string) { var text = (string)value; if (text.Length > 2048) throw new InvalidDataException("String too long."); writer.Write((byte)4); writer.Write(text); }
            else if (value is Vector2) { var v = (Vector2)value; writer.Write((byte)5); writer.Write(v.x); writer.Write(v.y); }
            else if (value is Vector3) { var v = (Vector3)value; writer.Write((byte)6); writer.Write(v.x); writer.Write(v.y); writer.Write(v.z); }
            else if (value is int[]) { var array = (int[])value; CheckCount(array.Length); writer.Write((byte)7); writer.Write(array.Length); foreach (int entry in array) writer.Write(entry); }
            else if (value is float[]) { var array = (float[])value; CheckCount(array.Length); writer.Write((byte)8); writer.Write(array.Length); foreach (float entry in array) writer.Write(entry); }
            else if (value is string[]) { var array = (string[])value; CheckCount(array.Length); writer.Write((byte)9); writer.Write(array.Length); foreach (string entry in array) Write(writer, entry); }
            else if (value is object[]) { var array = (object[])value; CheckCount(array.Length); writer.Write((byte)10); writer.Write(array.Length); foreach (object entry in array) Write(writer, entry); }
            else if (value is BufferData) { var b = (BufferData)value; writer.Write((byte)11); writer.Write((int)b.Type); writer.Write(b.Time); writer.Write(b.Value); writer.Write(b.Value2); }
            else if (value is double) { writer.Write((byte)12); writer.Write((double)value); }
            else throw new InvalidDataException("Unsupported network value " + value.GetType().Name);
        }
        static int Count(BinaryReader reader) { int count = reader.ReadInt32(); CheckCount(count); return count; }
        static void CheckCount(int count) { if (count < 0 || count > MaximumElements) throw new InvalidDataException("Invalid network collection size."); }
        static object Read(BinaryReader reader, int depth)
        {
            if (depth > 4) throw new InvalidDataException("Network value nesting too deep.");
            switch (reader.ReadByte())
            {
                case 0: return null;
                case 1: return reader.ReadInt32();
                case 2: return reader.ReadSingle();
                case 3: return reader.ReadBoolean();
                case 4: var text = reader.ReadString(); if (text.Length > 2048) throw new InvalidDataException(); return text;
                case 5: return new Vector2(reader.ReadSingle(), reader.ReadSingle());
                case 6: return new Vector3(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());
                case 7: var ints = new int[Count(reader)]; for (int i = 0; i < ints.Length; i++) ints[i] = reader.ReadInt32(); return ints;
                case 8: var floats = new float[Count(reader)]; for (int i = 0; i < floats.Length; i++) floats[i] = reader.ReadSingle(); return floats;
                case 9: var strings = new string[Count(reader)]; for (int i = 0; i < strings.Length; i++) strings[i] = (string)Read(reader, depth + 1); return strings;
                case 10: var objects = new object[Count(reader)]; for (int i = 0; i < objects.Length; i++) objects[i] = Read(reader, depth + 1); return objects;
                case 11: return new BufferData((RoleBuffer)reader.ReadInt32(), reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());
                case 12: return reader.ReadDouble();
                default: throw new InvalidDataException("Unknown network value tag.");
            }
        }
    }
}
