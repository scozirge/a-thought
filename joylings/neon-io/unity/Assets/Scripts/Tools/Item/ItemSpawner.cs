using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class ItemSpawner<T> : MonoBehaviour where T : Item
    {
        public T ItemPrefab;
        [SerializeField]
        int MaxLogs = 0;
        [SerializeField]
        Vector3 SpawnPos = Vector3.zero;
        [SerializeField]
        Transform ParentTrans = null;
        protected List<T> LogList = new List<T>();


        public T Spawn<V>() where V : T
        {
            if (LogList.Count >= MaxLogs && MaxLogs != 0)
            {
                Destroy(LogList[0].gameObject);
                LogList.RemoveAt(0);
            }
            V item = Instantiate(ItemPrefab) as V;
            item.transform.SetParent(ParentTrans);
            item.transform.localPosition = SpawnPos;
            LogList.Add(item);
            return item;
        }

        public void ClearLog()
        {
            for (int i = 0; i < LogList.Count; i++)
            {
                Destroy(LogList[i].gameObject);
            }
            LogList.Clear();
        }
    }
}
