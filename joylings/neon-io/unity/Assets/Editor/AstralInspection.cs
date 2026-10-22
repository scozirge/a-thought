using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

namespace Neon.Editor
{
    public static class AstralInspection
    {
        [Serializable] class Document { public List<Node> nodes = new List<Node>(); }
        [Serializable] class Node
        {
            public string path, components, text, key, sprite, font;
            public bool active;
            public Vector2 size, position, min, max, pivot;
            public Vector3 scale;
            public int fontSize;
            public List<string> fields = new List<string>();
        }
        public static void Dump()
        {
            Directory.CreateDirectory("../logs/ui-inspection");
            foreach (string name in new[] { "Init", "Lobby", "Battle", "Challenge" })
            {
                var scene = EditorSceneManager.OpenScene("Assets/Scenes/" + name + ".unity", OpenSceneMode.Single);
                var doc = new Document();
                foreach (var root in scene.GetRootGameObjects()) Walk(root.transform, "", doc);
                File.WriteAllText("../logs/ui-inspection/" + name + ".json", JsonUtility.ToJson(doc, true));
            }
            foreach (string name in new[] { "PopupUI", "Lobby/SettingUI", "Lobby/ShopUI", "Lobby/SelectSkillUI Variant", "Lobby/ChallengeUI", "Lobby/PurchaseItem", "Lobby/FeatureChoiceItem", "Lobby/ClamorItem" })
            {
                string path = "Assets/Resources/Gameobjects/" + name + ".prefab";
                var go = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (!go) continue;
                var doc = new Document(); Walk(go.transform, "", doc);
                File.WriteAllText("../logs/ui-inspection/" + name.Replace('/', '_') + ".json", JsonUtility.ToJson(doc, true));
            }
            Debug.Log("NEON_UI_INSPECTION_OK");
        }
        static void Walk(Transform t, string parent, Document doc)
        {
            var n = new Node { path = parent + "/" + t.name, active = t.gameObject.activeSelf, scale = t.localScale,
                components = string.Join(",", t.GetComponents<Component>().Where(c => c).Select(c => c.GetType().Name)) };
            var rect = t as RectTransform;
            if (rect) { n.size = rect.sizeDelta; n.position = rect.anchoredPosition; n.min = rect.anchorMin; n.max = rect.anchorMax; n.pivot = rect.pivot; }
            var text = t.GetComponent<Text>();
            if (text) { n.text = text.text; n.fontSize = text.fontSize; n.font = text.font ? AssetDatabase.GetAssetPath(text.font) : ""; }
            var myText = t.GetComponent<Scoz.Func.MyText>(); if (myText) n.key = myText.UIString;
            var image = t.GetComponent<Image>(); if (image && image.sprite) n.sprite = AssetDatabase.GetAssetPath(image.sprite);
            foreach (var comp in t.GetComponents<MonoBehaviour>())
            {
                if (!comp || comp.GetType().Assembly.GetName().Name != "Assembly-CSharp") continue;
                foreach (var f in comp.GetType().GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public))
                {
                    if (!(f.IsPublic || f.GetCustomAttribute<SerializeField>() != null)) continue;
                    var obj = f.GetValue(comp) as UnityEngine.Object;
                    if (obj) n.fields.Add(comp.GetType().Name + "." + f.Name + "=" + obj.name);
                }
            }
            var button = t.GetComponent<Button>();
            if (button) for (int i = 0; i < button.onClick.GetPersistentEventCount(); i++) n.fields.Add("Click=" + button.onClick.GetPersistentTarget(i) + "." + button.onClick.GetPersistentMethodName(i));
            doc.nodes.Add(n);
            foreach (Transform child in t) Walk(child, n.path, doc);
        }
    }
}
