using System.IO;
using Fusion;

namespace Neon.Networking
{
    internal static class NeonPackedState
    {
        // Explicitly pack four bytes per replicated int, independent of Fusion's byte element alignment.
        public static void Write(NetworkArray<int> words, byte[] bytes)
        {
            if (bytes.Length > words.Length * 4) throw new InvalidDataException("Packed state exceeds capacity.");
            for (int index = 0; index * 4 < bytes.Length; index++)
            {
                int value = PackWord(bytes, index * 4);
                if (words[index] != value) words.Set(index, value);
            }
        }
        public static byte[] Read(NetworkArray<int> words, int length)
        {
            if (length < 0 || length > words.Length * 4) throw new InvalidDataException("Invalid packed state length.");
            var bytes = new byte[length];
            for (int index = 0; index * 4 < bytes.Length; index++) UnpackWord(words[index], bytes, index * 4);
            return bytes;
        }
        public static int PackWord(byte[] bytes, int offset)
        {
            uint result = 0;
            for (int part = 0; part < 4 && offset + part < bytes.Length; part++) result |= (uint)bytes[offset + part] << (part * 8);
            return unchecked((int)result);
        }
        public static void UnpackWord(int word, byte[] bytes, int offset)
        {
            uint value = unchecked((uint)word);
            for (int part = 0; part < 4 && offset + part < bytes.Length; part++) bytes[offset + part] = (byte)(value >> (part * 8));
        }
    }
}
