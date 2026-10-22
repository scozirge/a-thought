using System;
using Starbro.NeonIO;
using UnityEngine;

namespace Neon.Networking
{
    internal static class NeonRpcValidation
    {
        public static bool IsValid(string method, object[] values)
        {
            if (string.IsNullOrEmpty(method) || method.Length > 64 || values == null || values.Length > 12) return false;
            foreach (object value in values) if (!FiniteAndBounded(value)) return false;
            if (method == "ReceiveNetworkHit")
            {
                if (values.Length != 11 || !(values[0] is int attacker) || attacker < 0 || !(values[1] is int hitDamage) || hitDamage < 0 || hitDamage > 1000000 ||
                    !(values[2] is Vector2) || !(values[3] is string) || !(values[4] is Vector2) || !(values[9] is int kind) || kind < 0 || kind > 2 ||
                    !(values[10] is float vampire) || vampire < 0 || vampire > 1) return false;
                return BufferArrays(values, 5);
            }
            if (method == "ConfirmLifeSteal") return values.Length == 3 && values[0] is int victim && victim > 0 && values[1] is int sequence && sequence >= 0 && values[2] is int heal && heal > 0 && heal <= 1000000;
            if (method == "NotifyDeath") return values.Length == 4 && values[0] is int revision && revision >= 0 && values[1] is int killer && killer >= 0 && values[2] is int drops && drops >= 0 && drops <= 10000 && values[3] is Vector2;
            if (method.StartsWith("BeAttack", StringComparison.Ordinal) || method == "ReceiveDmg")
                if (values.Length < 1 || !(values[0] is int damage) || damage < 0 || damage > 1000000) return false;
            if (method == "GainExp")
                return values.Length == 1 && values[0] is int experience && experience > 0 && experience <= 10000;
            if (method == "CastSkill" || method == "CastPrepareSkill" || method == "SkillSpawnAttackPrefab")
                return values.Length == 2 && IsEnum<FeaturePart>(values[0]) && values[1] is int index && index >= 0 && index < 64;
            if (method == "GetFeature")
                return values.Length == 2 && IsEnum<FeaturePart>(values[0]) && values[1] is int id && id >= 0 && id < 100000;
            // Buffer arrays are four parallel arrays. Validate all four, including value2 (missing in the original code).
            int arraysAt = method == "AddBuffer" && values.Length == 4 ? 0 :
                method == "BeAttackAndAddBuffer" ? 2 : method == "BeAttackAndCallParticleAndAddBuffer" ? 4 : -1;
            if (arraysAt >= 0)
            {
                if (values.Length != arraysAt + 4 || !BufferArrays(values, arraysAt)) return false;
            }
            return true;
        }
        static bool BufferArrays(object[] values, int index)
        {
            if (!(values[index] is int[] types) || !(values[index + 1] is float[] times) || !(values[index + 2] is float[] first) || !(values[index + 3] is float[] second)) return false;
            if (types.Length != times.Length || types.Length != first.Length || types.Length != second.Length || types.Length > 64) return false;
            for (int i = 0; i < types.Length; i++) if (!Enum.IsDefined(typeof(RoleBuffer), types[i]) || times[i] < 0 || times[i] > 1000000) return false;
            return true;
        }
        static bool IsEnum<T>(object value) { return value is int integer && Enum.IsDefined(typeof(T), integer); }
        static bool Number(float value) { return !float.IsNaN(value) && !float.IsInfinity(value) && Mathf.Abs(value) <= 10000000f; }
        static bool FiniteAndBounded(object value)
        {
            if (value == null || value is bool) return true;
            if (value is int integer) return integer >= -10000000 && integer <= 10000000;
            if (value is float number) return Number(number);
            if (value is double real) return !double.IsNaN(real) && !double.IsInfinity(real) && Math.Abs(real) <= 1e12;
            if (value is string text) return text.Length <= 256;
            if (value is Vector2 vector) return Number(vector.x) && Number(vector.y);
            if (value is Vector3 vector3) return Number(vector3.x) && Number(vector3.y) && Number(vector3.z);
            if (value is BufferData buffer) return Enum.IsDefined(typeof(RoleBuffer), buffer.Type) && Number(buffer.Time) && buffer.Time >= 0 && Number(buffer.Value) && Number(buffer.Value2);
            if (value is int[] integers) { if (integers.Length > 64) return false; foreach (int item in integers) if (!FiniteAndBounded(item)) return false; return true; }
            if (value is float[] numbers) { if (numbers.Length > 64) return false; foreach (float item in numbers) if (!Number(item)) return false; return true; }
            return false;
        }
    }
}
