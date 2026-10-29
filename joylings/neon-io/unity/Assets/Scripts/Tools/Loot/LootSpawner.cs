using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
using Neon.Networking;
namespace Scoz.Func
{
    public class LootSpawner : MonoBehaviour
    {
        public const int MaxPooledLoot = 512;
        public static IReadOnlyList<Loot> RegisteredLoot => MySelf ? MySelf.LootList : System.Array.Empty<Loot>();
        public static int ActiveCount
        {
            get { int count = 0; if (MySelf) foreach (var loot in MySelf.LootList) if (loot && loot.IsActive) count++; return count; }
        }
        public static int ActiveCountWithin(float radius)
        {
            if (!MySelf || radius <= 0) return 0;
            int count = 0;
            float radiusSquared = radius * radius;
            foreach (var loot in MySelf.LootList)
                if (loot && loot.IsActive && ((Vector2)loot.transform.position).sqrMagnitude <= radiusSquared) count++;
            return count;
        }
        List<Loot> LootList;
        [SerializeField]
        Loot ExpLootPrefab = null;
        [LabelOverride("初始隨機力道")]
        [SerializeField]
        Vector2 RandomForce;


        static Loot ExpLootPrefab_Static;
        static LootSpawner MySelf;
        void Awake()
        {
            MySelf = this;
            LootList = new List<Loot>();
            ExpLootPrefab_Static = ExpLootPrefab;

        }
        public static void Register(Loot loot)
        {
            if (MySelf != null && loot != null && !MySelf.LootList.Contains(loot)) MySelf.LootList.Add(loot);
        }
        public static void Unregister(Loot loot)
        {
            if (MySelf != null) MySelf.LootList.Remove(loot);
        }
        void OnDestroy()
        {
            if (MySelf != this) return;
            LootList.Clear();
            MySelf = null;
            ExpLootPrefab_Static = null;
        }
        Vector2 GetRandomForce()
        {
            Vector2 force = Vector2.zero;
            if (RandomForce != Vector2.zero)
            {

                float x = Random.Range(-RandomForce.x, RandomForce.x);
                float y = Random.Range(-RandomForce.y, RandomForce.y);
                force = new Vector2(x, y);
            }
            return force;
        }
        public static void SpawnExpLoot(int _count, Vector3 _pos, Role killer = null)
        {
            if (MySelf == null || (PhotonNetwork.IsConnected && !PhotonNetwork.IsMasterClient)) return;
            if (ExpLootPrefab_Static == null)
            {
                Debug.LogWarning("尚未指定ExpLootPrefab");
                return;
            }

            float burstAngle = Random.Range(0, Mathf.PI * 2);
            for (int i = 0; i < _count; i++)
            {
                Loot loot = GetAvailableLoot();
                if (loot == null)
                {
                    if (MySelf.LootList.Count >= MaxPooledLoot)
                    {
                        int remaining = _count - i;
                        while (remaining > 0)
                        {
                            ExpLoot nearest = FindMergeTarget(_pos);
                            if (nearest == null)
                            {
                                // During master reassignment scene-object authority can arrive a frame later.
                                MySelf.StartCoroutine(MySelf.RetrySpawn(remaining, _pos, killer));
                                return;
                            }
                            remaining -= nearest.AddValue(remaining);
                            nearest.LaunchToward(killer);
                        }
                        return;
                    }
                    if (PhotonNetwork.IsConnected)
                    {
                        if(PhotonNetwork.IsMasterClient)
                        {
                            GameObject go = PhotonNetwork.InstantiateSceneObject(ExpLootPrefab_Static.name, _pos, Quaternion.identity);
                            Register(go.GetComponent<Loot>());
                            loot = go.GetComponent<ExpLoot>();
                        }
                    }
                    else
                    {
                        loot = Instantiate(ExpLootPrefab_Static, Vector3.zero, Quaternion.identity) as Loot;
                        loot.transform.SetParent(MySelf.transform);
                        loot.transform.localPosition = _pos;
                        Register(loot);
                    }
                }
                // Reserve/reset on the authority synchronously. An All RPC can be deferred
                // until the Fusion tick and would select the same inactive star repeatedly.
                Vector2 force = MySelf.GetRandomForce();
                if (killer != null && killer.IsAlive && killer.IsInitialized)
                {
                    float angle = burstAngle + Mathf.PI * 2 * i / _count + Random.Range(-.15f, .15f);
                    force = new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * Random.Range(450f, 600f);
                }
                loot.SetLoot(true, _pos, force);
                if (loot is ExpLoot experience) experience.LaunchToward(killer);
            }
        }
        static ExpLoot FindMergeTarget(Vector3 position)
        {
            ExpLoot nearest = null;
            float nearestDistance = float.PositiveInfinity;
            foreach (Loot item in MySelf.LootList)
            {
                ExpLoot candidate = item as ExpLoot;
                if (candidate == null || !candidate.IsActive || candidate.Value == int.MaxValue) continue;
                if (PhotonNetwork.IsConnected && !candidate.photonView.IsMine) continue;
                float distance = (candidate.transform.position - position).sqrMagnitude;
                if (distance >= nearestDistance) continue;
                nearest = candidate;
                nearestDistance = distance;
            }
            return nearest;
        }
        IEnumerator RetrySpawn(int count, Vector3 position, Role killer)
        {
            while ((!PhotonNetwork.IsConnected || PhotonNetwork.IsMasterClient) &&
                GetAvailableLoot() == null && FindMergeTarget(position) == null)
                yield return null;
            SpawnExpLoot(count, position, killer);
        }
        static Loot GetAvailableLoot()
        {
            if (MySelf == null) return null;
            MySelf.LootList.RemoveAll(loot => loot == null);
            for (int i = 0; i < MySelf.LootList.Count; i++)
            {
                if (!MySelf.LootList[i].IsActive && (!PhotonNetwork.IsConnected || MySelf.LootList[i].photonView.IsMine))
                {
                    return MySelf.LootList[i];
                }
            }
            return null;
        }
    }
}
