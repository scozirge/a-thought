using System;
using System.Collections.Generic;
using UnityEngine;
using Scoz.Func;

namespace Neon.Astral
{
    public static class AstralIcons
    {
        [Serializable] public class Entry {public int id;public Rect rect;}
        [Serializable] public class Catalog {public Entry[] icons;}
        static readonly Dictionary<int,Sprite> sprites=new Dictionary<int,Sprite>();static bool loaded;
        static Material material;
        public static Material Material {get{if(!material){var shader=Resources.Load<Shader>("Astral/Icon");if(shader)material=new Material(shader);}return material;}}
        public static Sprite Crop(Sprite original)
        {
            if(!original||!GameDictionary.IsInit)return original;
            if(!loaded)
            {
                loaded=true;var data=Resources.Load<TextAsset>("Astral/icon-bounds");if(data)
                foreach(var e in JsonUtility.FromJson<Catalog>(data.text).icons)
                {
                    if(!GameDictionary.FeatureDic.TryGetValue(e.id,out var feature)||!feature.IconSprite)continue;
                    var s=feature.IconSprite;var tex=s.texture;var r=e.rect;var cropped=Sprite.Create(tex,new Rect(r.x*tex.width,r.y*tex.height,r.width*tex.width,r.height*tex.height),new Vector2(.5f,.5f),100);
                    cropped.name=s.name+" (UI framing)";sprites[s.GetInstanceID()]=cropped;
                }
            }
            return sprites.TryGetValue(original.GetInstanceID(),out var result)?result:original;
        }
    }
}
