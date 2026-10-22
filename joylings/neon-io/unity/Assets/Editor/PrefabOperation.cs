using UnityEngine;
using UnityEditor;
using System.Collections.Generic;
using System.Linq;

namespace Starbro.NeonIO
{
    enum FindAssetsByNameResult
    {
        NoFind,
        FindOne,
        FindOnes,
    }
    public class PrefabOperation : MonoBehaviour
    {
        private const string FindFilterText = "t:Prefab";
        [MenuItem("GameObject/Runtime Edit/PingPrefab", false, 0)]
        static void PingPrefab(MenuCommand _menuCommand)
        {
            if(!Application.isPlaying)
            {
                EditorUtility.DisplayDialog("", "Just use this function at runtime", "ok");
                return;
            }
            if (!SelectedObjIsAGameObjeck(_menuCommand.context))
            {
                EditorUtility.DisplayDialog("", "There is no selected Gameobject\nor\nThe selected object is not a Gameobject.", "ok");
                return;
            }
            FindAssetsByNameResult findResult;
            string path= FindGameObjectPathInAsset(_menuCommand.context as GameObject, true, out findResult);
            switch (findResult)
            {
                case FindAssetsByNameResult.FindOnes:
                    EditorUtility.DisplayDialog("Update Prefab", string.Format("Find more than one prefabs possess the same name¡G\n{0}", path), "ok");
                    break;
                case FindAssetsByNameResult.NoFind:
                    EditorUtility.DisplayDialog("Update Prefab", "There is no selected Gameobject\nor\nCan't find any prefab has the same name with the selected Gameobject's.", "ok");
                    break;
            }
        }
        [MenuItem("GameObject/Runtime Edit/UpdatePrefab", false, 0)]
        static void UpdatePrefabButDontPingInAsset(MenuCommand _menuCommand)
        {
            if (!Application.isPlaying)
            {
                EditorUtility.DisplayDialog("", "Just use this function at runtime", "ok");
                return;
            }
            UpdatePrefab(_menuCommand, false);
        }
        [MenuItem("GameObject/Runtime Edit/UpdatePrefabAndPingObjectInAsset", false, 0)]
        static void UpdatePrefabAndPingInAsset(MenuCommand _menuCommand)
        {
            if (!Application.isPlaying)
            {
                EditorUtility.DisplayDialog("", "Just use this function at runtime", "ok");
                return;
            }
            UpdatePrefab(_menuCommand, true);
        }
        static void UpdatePrefab(MenuCommand _menuCommand, bool _pingTarget)
        {
            if (!SelectedObjIsAGameObjeck(_menuCommand.context))
            {
                EditorUtility.DisplayDialog("", "There is no selected Gameobject\nor\nThe selected object is not a Gameobject.", "ok");
                return;
            }
            bool result = false;
            FindAssetsByNameResult findResult;
            string path = FindGameObjectPathInAsset(_menuCommand.context as GameObject, _pingTarget, out findResult);
            switch (findResult)
            {
                case FindAssetsByNameResult.FindOne:
                    PrefabUtility.SaveAsPrefabAssetAndConnect(_menuCommand.context as GameObject, path, InteractionMode.AutomatedAction, out result);
                    if (result)
                        EditorUtility.DisplayDialog("Update Prefab", (result) ? "Success!" : "Fail", "OK!");
                    break;
                case FindAssetsByNameResult.FindOnes:
                    EditorUtility.DisplayDialog("Update Prefab", string.Format("Find more than one prefabs possess the same name¡G\n{0}", path), "ok");
                    break;
                case FindAssetsByNameResult.NoFind:
                    EditorUtility.DisplayDialog("Update Prefab", "There is no selected Gameobject\nor\nCan't find any prefab has the same name with the selected Gameobject's.", "ok");
                    break;
            }
        }
        static string FindGameObjectPathInAsset(GameObject _target, bool _pingTarget, out FindAssetsByNameResult _result)
        {
            string targetName = _target.name.Replace("(Clone)", "");
            GameObject[] gos = GetPrefabsWhosNameIs(targetName).ToArray();
            if (gos == null || gos.Length == 0)
            {
                _result = FindAssetsByNameResult.NoFind;
                return "";
            }
            else if (gos.Length == 1)
            {
                string path = AssetDatabase.GetAssetPath(gos[0]);
                if (_pingTarget)
                    EditorGUIUtility.PingObject(gos[0].GetInstanceID());
                _result = FindAssetsByNameResult.FindOne;
                return path;
            }
            else
            {
                string resultPaths = "";
                for (int i = 0; i < gos.Length; i++)
                {
                    if (resultPaths != "")
                        resultPaths += "\n";
                    string path = AssetDatabase.GetAssetPath(gos[i]);
                    resultPaths += path;
                }
                _result = FindAssetsByNameResult.FindOnes;
                return resultPaths;
            }
        }
        static bool SelectedObjIsAGameObjeck(Object _obj)
        {
            if (_obj != null && _obj.GetType() == typeof(GameObject))
                return true;
            return false;
        }

        private static IEnumerable<GameObject> GetPrefabsWhosNameIs(string _name)
        {
            var allPrefabs = GetPathToEachPrefabInProject();

            float totalPrefabCount = allPrefabs.Count();

            foreach (var prefabPath in allPrefabs)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath) as GameObject;
                if (prefab.name == _name)
                {
                    yield return prefab;
                }
            }
        }
        private static IEnumerable<string> GetPathToEachPrefabInProject()
        {
            foreach (var prefabGUID in AssetDatabase.FindAssets(FindFilterText))
            {
                yield return AssetDatabase.GUIDToAssetPath(prefabGUID);
            }
        }
    }
}
