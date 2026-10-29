using System.Collections.Generic;
using UnityEngine;
using Neon.Networking;
using Scoz.Func;

namespace Starbro.NeonIO
{
    // Shared simulation authority chooses destinations once. Preview is presentation only.
    public sealed class AccessoryMotion : MonoBehaviour
    {
        public static readonly List<AccessoryMotion> Active = new List<AccessoryMotion>();
        Role role;
        GameObject preview;
        Vector2 destination;
        float deadline;
        bool planned;
        void OnEnable() { role = GetComponent<Role>(); Active.Add(this); }
        void OnDisable() { Active.Remove(this); Clear(); }
        void OnDestroy() { Clear(); }
        void Clear() { if (preview) Destroy(preview); preview = null; planned = false; }
        public Role MagnetRole => role && role.IsAlive && role.CanCollectStars && (role.HasAccessory(11) || role.HasAccessory(122)) ? role : null;
        public static bool InView(Role owner, Vector2 point)
        {
            var camera = Camera.main;
            if (!camera || !camera.orthographic) return false;
            Vector2 center = owner.HasSimulationAuthority && owner is PlayerRole ? (Vector2)camera.transform.position : (Vector2)owner.transform.position;
            Vector2 half = new Vector2(camera.orthographicSize * camera.aspect,camera.orthographicSize);
            if (PhotonNetwork.IsConnected && !owner.HasSimulationAuthority)
            {
                var entity = owner.GetComponent<NeonFusionEntity>();
                if (!entity || !entity.StateReady || entity.ViewHalfSize.y <= 0) return false;
                center = entity.ViewCenter; half = entity.ViewHalfSize;
            }
            Vector2 delta = point - center;
            return Mathf.Abs(delta.x) < half.x * .94f && Mathf.Abs(delta.y) < half.y * .94f;
        }
        public static Vector2 SafePoint(Vector2 point)
        {
            var arena = NeonArena.Instance;
            if (!arena) return point;
            return Vector2.ClampMagnitude(point, Mathf.Max(0, arena.Radius - 100));
        }
        bool Plan()
        {
            var camera = Camera.main;
            if (!camera || !camera.orthographic) return false;
            for (int i = 0; i < 64; i++)
            {
                Vector2 center = role is PlayerRole ? (Vector2)camera.transform.position : (Vector2)role.transform.position;
                Vector2 point = center + new Vector2(Random.Range(-.85f,.85f)*camera.orthographicSize*camera.aspect, Random.Range(-.85f,.85f)*camera.orthographicSize);
                point = SafePoint(point);
                if (!InView(role,point)) continue;
                destination = point;
                preview = new GameObject("Teleport destination preview");
                preview.SetActive(role is PlayerRole);
                preview.transform.position = point;
                foreach (var source in role.GetComponentsInChildren<SpriteRenderer>())
                {
                    if (!source.enabled || !source.gameObject.activeInHierarchy || !source.sprite) continue;
                    var child = new GameObject("Preview sprite"); child.transform.SetParent(preview.transform);
                    child.transform.position = (Vector3)point + source.transform.position - role.transform.position;
                    child.transform.rotation = source.transform.rotation; child.transform.localScale = source.transform.lossyScale;
                    var sprite = child.AddComponent<SpriteRenderer>(); sprite.sprite = source.sprite;
                    sprite.color = new Color(source.color.r,source.color.g,source.color.b,.3f);
                    sprite.flipX = source.flipX; sprite.flipY = source.flipY;
                    sprite.sortingLayerID = source.sortingLayerID; sprite.sortingOrder = source.sortingOrder;
                }
                deadline = Time.time + 3; planned = true; return true;
            }
            return false;
        }
        void Update()
        {
            if (!role || !role.IsAlive || !role.HasSimulationAuthority || !role.HasAccessory(117)) { Clear(); return; }
            if (!planned) { Plan(); return; }
            if (!InView(role,destination) || (SafePoint(destination)-destination).sqrMagnitude > 1) { Clear(); Plan(); return; }
            if (Time.time < deadline) return;
            if (PhotonNetwork.IsConnected) role.photonView.RPC("ApplyTeleport",RpcTarget.All,destination);
            else role.ApplyTeleport(destination);
            Clear(); Plan();
        }
    }
}
