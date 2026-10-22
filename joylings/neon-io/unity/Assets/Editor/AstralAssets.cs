using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEditor;
using Neon.Astral;

namespace Neon.Editor
{
    public static class AstralAssets
    {
        public static void Prepare()
        {
            var entries=new List<AstralIcons.Entry>();var json=LitJson.JsonMapper.ToObject(File.ReadAllText("Assets/Resources/Json/Feature.json"))["Feature"];
            foreach(LitJson.JsonData f in json)
            {
                string resource="Images/Role/"+f["FeaturePart"]+"/"+f["Icon"];var sprite=Resources.Load<Sprite>(resource);if(!sprite)continue;
                var texture=new Texture2D(2,2);if(!ImageConversion.LoadImage(texture,File.ReadAllBytes(AssetDatabase.GetAssetPath(sprite)))){Object.DestroyImmediate(texture);continue;}
                var pixels=texture.GetPixels32();int minX=texture.width,minY=texture.height,maxX=0,maxY=0;
                for(int y=0;y<texture.height;y++)for(int x=0;x<texture.width;x++)if(pixels[y*texture.width+x].a>24){minX=Mathf.Min(minX,x);maxX=Mathf.Max(maxX,x);minY=Mathf.Min(minY,y);maxY=Mathf.Max(maxY,y);}
                if(minX<=maxX){int pad=4;minX=Mathf.Max(0,minX-pad);minY=Mathf.Max(0,minY-pad);maxX=Mathf.Min(texture.width-1,maxX+pad);maxY=Mathf.Min(texture.height-1,maxY+pad);entries.Add(new AstralIcons.Entry{id=int.Parse(f["ID"].ToString()),rect=new Rect((float)minX/texture.width,(float)minY/texture.height,(float)(maxX-minX+1)/texture.width,(float)(maxY-minY+1)/texture.height)});}
                Object.DestroyImmediate(texture);
            }
            File.WriteAllText("Assets/Resources/Astral/icon-bounds.json",JsonUtility.ToJson(new AstralIcons.Catalog{icons=entries.ToArray()},true));AssetDatabase.Refresh();
            Debug.Log("ASTRAL_ICON_FRAMING_OK "+entries.Count);
        }
    }
}
