using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;
namespace Starbro.NeonIO
{
    [System.Serializable]
    public struct BufferData
    {
        public RoleBuffer Type;
        public float Time;
        public float Value;
        public float Value2;

        public BufferData(RoleBuffer _type, float _time, float _value, float _value2)
        {
            Type = _type;
            Time = _time;
            Value = _value;
            Value2 = _value2;
        }
        public static object Deserialize(byte[] _datas)
        {
            PacketBuffer buffer = new PacketBuffer();
            buffer.WriteBytes(_datas);
            RoleBuffer roleBuffer = (RoleBuffer)buffer.ReadInteger();
            float time = buffer.ReadFloat();
            float value = buffer.ReadFloat();
            float value2 = buffer.ReadFloat();
            BufferData bufferDate = new BufferData(roleBuffer, time, value, value2);
            return bufferDate;
        }

        public static byte[] Serialize(object _obj)
        {
            var bufferData = (BufferData)_obj;
            PacketBuffer buffer = new PacketBuffer();
            buffer.WriteInteger((int)bufferData.Type);
            buffer.WriteFloat(bufferData.Time);
            buffer.WriteFloat(bufferData.Value);
            buffer.WriteFloat(bufferData.Value2);
            return buffer.ToArray();
        }
    }
}
