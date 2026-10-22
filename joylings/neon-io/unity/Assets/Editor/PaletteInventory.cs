using UnityEditor;
using UnityEngine;
using System.Linq;
using System.IO;
using System.Collections.Generic;

namespace Neon.Editor
{
    public static class PaletteInventory
    {
        public static void Write()
        {
            var rows=new List<string>();
            foreach(var guid in AssetDatabase.FindAssets("t:Material",new[]{"Assets/Resources"}))
            {
                var path=AssetDatabase.GUIDToAssetPath(guid);var m=AssetDatabase.LoadAssetAtPath<Material>(path);
                string props=string.Join(" ",new[]{"_Color","_TintColor","_SrcBlend","_DstBlend","_Intensity","_SubRate"}.Where(p=>m.HasProperty(p)).Select(p=>p+"="+(p.Contains("Color")?m.GetColor(p).ToString():m.GetFloat(p).ToString())));
                rows.Add(path+" | "+m.shader.name+" | "+props);
            }
            Directory.CreateDirectory("../logs");File.WriteAllLines("../logs/palette-materials.txt",rows);
        }
    }
}
