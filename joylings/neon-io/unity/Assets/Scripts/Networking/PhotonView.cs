using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;

namespace Neon.Networking
{
    [DisallowMultipleComponent]
    public sealed class PhotonView : MonoBehaviour
    {
        // Retained solely so the original prefab GUID/references survive the migration.
        public List<Component> ObservedComponents = new List<Component>();
        public int sceneViewId;
        internal NeonFusionEntity Entity;
        public bool IsReady { get { return !PhotonNetwork.IsConnected || (!PhotonNetwork.IsDisconnecting && Entity && Entity.Object && Entity.Object.IsValid); } }
        public bool IsMine { get { return !PhotonNetwork.IsConnected || (!PhotonNetwork.IsDisconnecting && Entity && Entity.Object && Entity.Object.HasStateAuthority); } }
        public int ViewID { get { return Entity && Entity.Object && Entity.Object.IsValid ? unchecked((int)Entity.Object.Id.Raw) : GetInstanceID(); } }
        public Player Owner { get { return IsReady && Entity ? PhotonNetwork.GetPlayer(Entity.Object.StateAuthority) : PhotonNetwork.LocalPlayer; } }
        static readonly Dictionary<string, MethodInfo[]> MethodCache = new Dictionary<string, MethodInfo[]>();
        public static PhotonView Find(int id)
        {
            return PhotonNetwork.Runtime ? PhotonNetwork.Runtime.FindView(id) : null;
        }
        public void RPC(string method, RpcTarget target, params object[] arguments)
        {
            if (Entity && Entity.Object && Entity.Object.IsValid)
                Entity.SendLegacyRpc(method, target, arguments);
            else if (!PhotonNetwork.InRoom)
                InvokeLocal(method, arguments, PhotonNetwork.Time, PhotonNetwork.LocalPlayer);
            else
                Debug.LogWarning("Skipped RPC before Fusion spawn: " + method, this);
        }
        public void RPCToAuthority(string method, params object[] arguments)
        {
            if (Entity && Entity.Object && Entity.Object.IsValid) Entity.SendToAuthority(method, arguments);
            else if (!PhotonNetwork.InRoom) InvokeLocal(method, arguments, PhotonNetwork.Time, PhotonNetwork.LocalPlayer);
        }
        internal bool InvokeLocal(string method, object[] arguments, double time, Player sender)
        {
            foreach (var component in GetComponents<MonoBehaviour>())
            {
                if (!component) continue;
                var type = component.GetType(); string key = type.FullName + ":" + method;
                if (!MethodCache.TryGetValue(key, out var methods))
                {
                    var matches = new List<MethodInfo>();
                    foreach (var candidate in type.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic))
                        if (candidate.Name == method && Attribute.IsDefined(candidate, typeof(PunRPC), true)) matches.Add(candidate);
                    methods = matches.ToArray(); MethodCache.Add(key, methods);
                }
                foreach (var candidate in methods)
                {
                    var parameters = candidate.GetParameters();
                    bool hasInfo = parameters.Length > 0 && parameters[parameters.Length - 1].ParameterType == typeof(PhotonMessageInfo);
                    if (parameters.Length != arguments.Length + (hasInfo ? 1 : 0)) continue;
                    object[] converted = new object[parameters.Length]; bool valid = true;
                    for (int i = 0; i < arguments.Length; i++)
                    {
                        var value = arguments[i]; var targetType = parameters[i].ParameterType;
                        if (value == null) converted[i] = targetType.IsValueType ? Activator.CreateInstance(targetType) : null;
                        else if (targetType.IsInstanceOfType(value)) converted[i] = value;
                        else if (targetType.IsEnum && value is int) converted[i] = Enum.ToObject(targetType, value);
                        else { valid = false; break; }
                    }
                    if (!valid) continue;
                    if (hasInfo) converted[converted.Length - 1] = new PhotonMessageInfo { SentServerTime = time, photonView = this, Sender = sender };
                    try { candidate.Invoke(component, converted); }
                    catch (TargetInvocationException ex) { Debug.LogException(ex.InnerException ?? ex, component); }
                    return true;
                }
            }
            Debug.LogWarning("No supported network method " + method + " on " + name, this);
            return false;
        }
    }
}
