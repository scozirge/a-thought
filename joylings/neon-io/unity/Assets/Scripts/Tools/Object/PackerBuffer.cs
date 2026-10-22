using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
namespace Scoz.Func
{
    public class PacketBuffer
    {
        List<byte> BufferList;
        byte[] ReadBuffer;
        int ReadPos;
        bool BuffUpdate = false;


        public PacketBuffer()
        {
            BufferList = new List<byte>();
            ReadPos = 0;
        }
        public int GetReadPos()
        {
            return ReadPos;
        }
        public byte[] ToArray()
        {
            return BufferList.ToArray();
        }
        public int Count()
        {
            return BufferList.Count;
        }
        public int Lenght()
        {
            return Count() - ReadPos;
        }
        public void Clear()
        {
            BufferList.Clear();
            ReadPos = 0;
        }

        //Write Data
        public void WriteBytes(byte[] _input)
        {
            BufferList.AddRange(_input);
            BuffUpdate = true;
        }
        public void WriteByte(byte _input)
        {
            BufferList.Add(_input);
            BuffUpdate = true;
        }
        public void WriteInteger(int _input)
        {
            BufferList.AddRange(BitConverter.GetBytes(_input));
            BuffUpdate = true;
        }
        public void WriteFloat(float _input)
        {
            BufferList.AddRange(BitConverter.GetBytes(_input));
            BuffUpdate = true;
        }
        public void WriteString(string _input)
        {
            BufferList.AddRange(BitConverter.GetBytes(_input.Length));
            BufferList.AddRange(Encoding.ASCII.GetBytes(_input));
            BuffUpdate = true;
        }

        //Read Data
        public int ReadInteger(bool _peek = true)
        {
            if (BufferList.Count > ReadPos)
            {
                if (BuffUpdate)
                {
                    ReadBuffer = BufferList.ToArray();
                    BuffUpdate = false;
                }

                int value = BitConverter.ToInt32(ReadBuffer, ReadPos);
                if (_peek & BufferList.Count > ReadPos)
                {
                    ReadPos += 4;
                }
                return value;
            }
            else
            {
                throw new Exception("Buffer is past its Limit!");
            }
        }
        public float ReadFloat(bool _peek = true)
        {
            if (BufferList.Count > ReadPos)
            {
                if (BuffUpdate)
                {
                    ReadBuffer = BufferList.ToArray();
                    BuffUpdate = false;
                }

                float value = BitConverter.ToSingle(ReadBuffer, ReadPos);
                if (_peek & BufferList.Count > ReadPos)
                {
                    ReadPos += 4;
                }
                return value;
            }
            else
            {
                throw new Exception("Buffer is past its Limit!");
            }
        }
        public byte ReadByte(bool _peek = true)
        {
            if (BufferList.Count > ReadPos)
            {
                if (BuffUpdate)
                {
                    ReadBuffer = BufferList.ToArray();
                    BuffUpdate = false;
                }

                byte value = ReadBuffer[ReadPos];
                if (_peek & BufferList.Count > ReadPos)
                {
                    ReadPos += 4;
                }
                return value;
            }
            else
            {
                throw new Exception("Buffer is past its Limit!");
            }
        }
        public byte[] ReadBytes(int _length, bool _peek = true)
        {
            if (BuffUpdate)
            {
                ReadBuffer = BufferList.ToArray();
                BuffUpdate = false;
            }

            byte[] value = BufferList.GetRange(ReadPos, _length).ToArray();
            if (_peek & BufferList.Count > ReadPos)
            {
                ReadPos += _length;
            }
            return value;
        }
        public string ReadString(bool _peek = true)
        {
            int length = ReadInteger(true);

            if (BuffUpdate)
            {
                ReadBuffer = BufferList.ToArray();
                BuffUpdate = false;
            }

            string value = Encoding.ASCII.GetString(ReadBuffer, ReadPos, length);
            if (_peek & BufferList.Count > ReadPos)
            {
                ReadPos += length;
            }
            return value;

        }
    }
}