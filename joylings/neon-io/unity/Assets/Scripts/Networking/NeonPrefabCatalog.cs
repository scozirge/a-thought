using UnityEngine;
namespace Neon.Networking
{
    [CreateAssetMenu(menuName = "Neon/Network prefab catalog")]
    public sealed class NeonPrefabCatalog : ScriptableObject
    {
        public GameObject[] Prefabs = new GameObject[0];
    }
}
