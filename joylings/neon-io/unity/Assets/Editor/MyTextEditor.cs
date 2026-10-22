using UnityEngine;
using UnityEditor;
using UnityEngine.UI;
using System.Collections;

namespace Scoz.Func
{
    [CustomEditor(typeof(MyText))]
    public class MyTextEditor : UnityEditor.UI.TextEditor
    {
        SerializedProperty UIString;
        protected override void OnEnable()
        {
            base.OnEnable();
            UIString = serializedObject.FindProperty("UIString");
        }
        public override void OnInspectorGUI()
        {
            serializedObject.Update();
            Rect textFieldRect = new Rect(EditorGUILayout.GetControlRect(true, 16));
            EditorGUI.PropertyField(textFieldRect, UIString);
            serializedObject.ApplyModifiedProperties();
            /*
            MyText myText = target as MyText;
            myText.UIString = EditorGUILayout.TextField("UIString", myText.UIString);
            */
            base.OnInspectorGUI();

            /*
            if(Application.isPlaying)
            {
                if (EditorGUI.EndChangeCheck())
                {
                    Debug.Log("set");
                    Undo.RecordObject(myText, "UIText Modification");
                }
            }
            */
        }
    }
}