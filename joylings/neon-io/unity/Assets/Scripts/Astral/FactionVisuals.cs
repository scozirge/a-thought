using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using Starbro.NeonIO;
using Scoz.Func;

namespace Neon.Astral
{
    // Presentation is local to the viewer: Force.Player is their own side;
    // Opponent and hostile neutral NPCs are enemies. Never serialize these colors.
    public static class FactionVisuals
    {
        static readonly Dictionary<Material,Material> materials=new Dictionary<Material,Material>();
        static readonly int Side=Shader.PropertyToID("_NeonSide");
        static readonly MaterialPropertyBlock block=new MaterialPropertyBlock();
        public static readonly Color Friendly=new Color(.28f,.70f,1f), Hostile=new Color(1f,.30f,.36f);
        public static bool TryForce(Transform source,out Force force)
        {
            if(source)
            {
                var ammo=source.GetComponentInParent<Ammo>();
                if(ammo){force=ammo.VisualForce;return true;}
                var role=source.GetComponentInParent<Role>();
                if(role){force=role.MyForce;return true;}
            }
            force=default;return false;
        }
        public static void Apply(Transform root,Force force)
        {
            if(!root)return;
            foreach(var renderer in root.GetComponentsInChildren<Renderer>(true))
            {
                if(!(renderer is SpriteRenderer)&&!(renderer is ParticleSystemRenderer)&&!(renderer is TrailRenderer)&&!(renderer is LineRenderer))continue;
                // Respect nested ammunition which may have been reflected to the other side.
                var ammo=renderer.GetComponentInParent<Ammo>();
                Set(renderer,ammo?ammo.VisualForce:force);
            }
        }
        static void Set(Renderer renderer,Force force)
        {
            var source=renderer.sharedMaterials;bool changed=false;
            for(int i=0;i<source.Length;i++)
            {
                if(!source[i]||source[i].shader.name.StartsWith("Neon/Faction/"))continue;
                source[i]=Convert(source[i],renderer is SpriteRenderer);changed=true;
            }
            if(changed)renderer.sharedMaterials=source;
            renderer.GetPropertyBlock(block);block.SetFloat(Side,force==Force.Player?0:1);renderer.SetPropertyBlock(block);block.Clear();
            if(renderer is ParticleSystemRenderer particles && particles.trailMaterial && !particles.trailMaterial.shader.name.StartsWith("Neon/Faction/"))
                particles.trailMaterial=Convert(particles.trailMaterial,false);
        }
        static Material Convert(Material original,bool sprite)
        {
            if(materials.TryGetValue(original,out var cached)&&cached)return cached;
            string name=original.shader.name;
            var shader=Resources.Load<Shader>(sprite?"Faction/FactionSprite":"Faction/FactionParticle");
            if(!shader){Debug.LogError("Missing faction shader for "+name);return original;}
            var m=new Material(original){shader=shader,name=original.name+" (viewer palette)"};
            if(!sprite)
            {
                int mode=0;BlendMode src=BlendMode.SrcAlpha,dst=BlendMode.OneMinusSrcAlpha;
                if(name=="FY/SubAdd"){mode=2;src=BlendMode.One;}
                else if(name.Contains("Additive")){mode=1;dst=BlendMode.One;}
                else if(name.Contains("Premultiply")){mode=3;src=BlendMode.One;}
                else if(name.Contains("Multiply")){mode=4;src=BlendMode.Zero;dst=BlendMode.SrcColor;}
                else if(original.HasProperty("_SrcBlend"))
                {src=(BlendMode)original.GetInt("_SrcBlend");dst=(BlendMode)original.GetInt("_DstBlend");if(src==BlendMode.One)mode=3;}
                m.SetInt("_SrcBlend",(int)src);m.SetInt("_DstBlend",(int)dst);m.SetInt("_SourceMode",mode);
                // Legacy additive/alpha shaders multiply the tint by two. FY uses vertex color directly.
                m.SetFloat("_LegacyFactor",name.StartsWith("Legacy Shaders/Particles/")?2f:1f);
                if(original.HasProperty("_TintColor"))m.SetColor("_Color",original.GetColor("_TintColor"));
                else if(!original.HasProperty("_Color"))m.SetColor("_Color",Color.white);
            }
            materials[original]=m;return m;
        }
    }
}
