using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;
namespace Scoz.Func
{
    public class GameobjectFinder : MonoBehaviour
    {
        public static GameObject SelfGameobject;
        public static GameObject FindClosestGameobjectWithTags(GameObject _self, params string[] _tags)
        {
            List<GameObject> goList = new List<GameObject>();
            for(int i=0;i< _tags.Length;i++)
            {
                goList.AddRange(GameObject.FindGameObjectsWithTag(_tags[i]));
            }
            GameObject closest = null;
            float distance = Mathf.Infinity;
            SelfGameobject = _self;
            Vector3 position = SelfGameobject.transform.position;
            foreach (GameObject go in goList)
            {
                if (go.GetInstanceID() == _self.gameObject.GetInstanceID())
                    continue;
                float curDistance = Vector2.Distance(go.transform.position, position);
                if (curDistance < distance)
                {
                    closest = go;
                    distance = curDistance;
                }
            }
            return closest;
        }
        public static GameObject FindInRangeClosestGameobjectWithTag(GameObject _self, int _range, params string[] _tags)
        {
            List<GameObject> goList = new List<GameObject>();
            for (int i = 0; i < _tags.Length; i++)
            {
                goList.AddRange(GameObject.FindGameObjectsWithTag(_tags[i]));
            }
            GameObject closest = null;
            float distance = Mathf.Infinity;
            SelfGameobject = _self;
            Vector3 position = SelfGameobject.transform.position;
            foreach (GameObject go in goList)
            {
                if (go.GetInstanceID() == _self.gameObject.GetInstanceID())
                    continue;
                float curDistance = Vector2.Distance(go.transform.position, position);
                if (curDistance > _range)
                    continue;
                if (curDistance < distance)
                {
                    closest = go;
                    distance = curDistance;
                }
            }
            return closest;
        }
        public static List<GameObject> FindClosestSpecificNumberOfGameobjectsWithTags(GameObject _self, int _count, params string[] _tags)
        {
            List<GameObject> goList = new List<GameObject>();
            for (int i = 0; i < _tags.Length; i++)
            {
                goList.AddRange(GameObject.FindGameObjectsWithTag(_tags[i]));
            }
            SelfGameobject = _self;
            goList.Remove(SelfGameobject);
            goList.Sort(SortByDistance);
            List<GameObject> targetList = new List<GameObject>();
            for (int i = 0; i < _count; i++)
            {
                if (i < goList.Count)
                    targetList.Add(goList[i]);
                else
                    break;
            }
            return targetList;
        }
        public static List<GameObject> FindClosestSpecificNumberOfGameobjectsInRangeWithTags(GameObject _self, int _count, int _range,params string[] _tags )
        {
            List<GameObject> goList = new List<GameObject>();
            for (int i = 0; i < _tags.Length; i++)
            {
                goList.AddRange(GameObject.FindGameObjectsWithTag(_tags[i]));
            }
            SelfGameobject = _self;
            Vector3 position = SelfGameobject.transform.position;
            goList.Remove(SelfGameobject);
            goList.Sort(SortByDistance);
            List<GameObject> targetList = new List<GameObject>();
            for (int i = 0; i < _count; i++)
            {
                if (i < goList.Count)
                {
                    float curDistance = Vector2.Distance(goList[i].transform.position, position);
                    if (curDistance > _range)
                        break;
                    else
                        targetList.Add(goList[i]);
                }
                else
                    break;
            }
            return targetList;
        }
        public static List<GameObject> FindClosestSpecificNumberOfNotTGameobjectsInRangeWithTags<T>(GameObject _self, int _count, int _range, params string[] _tags)
        {
            List<GameObject> goList = new List<GameObject>();
            for (int i = 0; i < _tags.Length; i++)
            {
                goList.AddRange(GameObject.FindGameObjectsWithTag(_tags[i]));
            }
            SelfGameobject = _self;
            Vector3 position = SelfGameobject.transform.position;
            goList.Remove(SelfGameobject);
            goList.RemoveAll(item => item.GetComponent<T>() != null);
            if (goList.Count > 0)
            {
                goList.Sort(SortByDistance);
                List<GameObject> targetList = new List<GameObject>();
                for (int i = 0; i < _count; i++)
                {
                    if (i < goList.Count)
                    {
                        float curDistance = Vector2.Distance(goList[i].transform.position, position);
                        if (curDistance > _range)
                            break;
                        else
                            targetList.Add(goList[i]);
                    }
                    else
                        break;
                }
                return targetList;
            }
            return null;
        }
        public static Role FindClosestRole(GameObject _self)
        {
            var targets = FindObjectsOfType<Role>();
            Vector2 position = _self.transform.position;
            float distance = Mathf.Infinity;
            Role closestRole = null;
            foreach (Role role in targets)
            {
                if (role.gameObject.GetInstanceID() == _self.GetInstanceID())
                    continue;
                float curDistance = Vector2.Distance(role.transform.position, position);
                if (curDistance < distance)
                {
                    closestRole = role;
                    distance = curDistance;
                }
            }
            return closestRole;
        }
        public static ShootAmmo FindClosestShootAmmo(GameObject _self)
        {
            var targets = FindObjectsOfType<ShootAmmo>();
            Vector2 position = _self.transform.position;
            float distance = Mathf.Infinity;
            ShootAmmo closestAmmor = null;
            foreach (ShootAmmo ammo in targets)
            {
                if (ammo.gameObject.GetInstanceID() == _self.GetInstanceID())
                    continue;
                float curDistance = Vector2.Distance(ammo.transform.position, position);
                if (curDistance < distance)
                {
                    closestAmmor = ammo;
                    distance = curDistance;
                }
            }
            return closestAmmor;
        }
        static int SortByDistance(GameObject _go1, GameObject _go2)
        {
            float dstToA = Vector3.Distance(SelfGameobject.transform.position, _go1.transform.position);
            float dstToB = Vector3.Distance(SelfGameobject.transform.position, _go2.transform.position);
            return dstToA.CompareTo(dstToB);
        }
    }
}
