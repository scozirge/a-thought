using UnityEngine;
using UnityEditor;
using UnityEngine.UI;
using System.Collections;
using UnityEditor.Events;
using UnityEngine.Events;
namespace Scoz.Func
{
    [CustomEditor(typeof(MyToggle))]
    public class MyToggleEditor : UnityEditor.UI.ToggleEditor
    {
        public override void OnInspectorGUI()
        {
            MyToggle myToggle = target as MyToggle;
            //EditorGUI.BeginChangeCheck();
            base.OnInspectorGUI();
            myToggle.OffGraphic = EditorGUILayout.ObjectField("OffGraphic", myToggle.OffGraphic, typeof(Graphic), true) as Graphic;

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