using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using UnityEngine;
using Starbro.NeonIO;
using Scoz.Func;
using Neon.Networking;
using Neon.Validation;

namespace Neon.Astral
{
    // Explicit validation only. No test actors or color overrides in normal play.
    public sealed class NeonPaletteCheck : MonoBehaviour
    {
        [Serializable] public sealed class ActorSide { public int id,renderers;public bool local;public string force; }
        [Serializable] public sealed class Result
        {
            public bool passed;public string failure="";public int renderers,particlePrefabs,skills,reflections;
            public List<ActorSide> actors=new List<ActorSide>();public List<string> originalShaders=new List<string>();
        }
        public readonly Result result=new Result();
        readonly MaterialPropertyBlock block=new MaterialPropertyBlock();
        public IEnumerator Run(string capturePath,bool catalog)
        {
            var task=RunCore(capturePath,catalog);
            while(true)
            {
                bool more=false;object next=null;
                try{more=task.MoveNext();if(more)next=task.Current;}
                catch(Exception e){result.failure=e.ToString();Debug.LogError("PALETTE_CHECK: "+result.failure);yield break;}
                if(!more)yield break;yield return next;
            }
        }
        IEnumerator RunCore(string capturePath,bool catalog)
        {
            if(!catalog&&PhotonNetwork.InRoom&&PhotonNetwork.CurrentRoom.PlayerCount>1)
            {
                var own=BattleManager.BM.MyPlayerRole;
                own.BaseMoveSpeed=0;own.AddBuffer(RoleBuffer.Immortal,30);
                own.transform.position=PhotonNetwork.IsMasterClient?new Vector3(-180,0,0):new Vector3(180,0,0);
                own.GetFeature(FeaturePart.Head,5);own.GetFeature(FeaturePart.Body,103);own.GetFeature(FeaturePart.Back,213);
                yield return new WaitForSeconds(3);
                NeonRenderCapture.Capture(capturePath);
            }
            yield return new WaitForSeconds(.3f);
            foreach(var role in FindObjectsByType<Role>(FindObjectsSortMode.None))
            {
                if(!role.IsInitialized)continue;
                int count=Check(role.transform,role.MyForce);
                if(role is PlayerRole)result.actors.Add(new ActorSide{id=role.photonView.ViewID,local=role.MyForce==Force.Player,force=role.MyForce.ToString(),renderers=count});
            }
            if(PhotonNetwork.InRoom&&PhotonNetwork.CurrentRoom.PlayerCount>1)
                Require(result.actors.Any(a=>a.local)&&result.actors.Any(a=>!a.local),"Both local and remote player palettes must be observed");
            foreach(var ammo in FindObjectsByType<Ammo>(FindObjectsSortMode.None))Check(ammo.transform,ammo.VisualForce);
            if(catalog)
            {
                // Inspect every original particle prefab in both palettes, including
                // detached death, impact, charge and trail renderers (inactive children too).
                var stage=new GameObject("Explicit palette fixture");stage.transform.position=new Vector3(20000,20000,0);
                foreach(var prefab in Resources.LoadAll<GameObject>("Particles").Concat(Resources.LoadAll<GameObject>("Particles_n")))
                {
                    if(!prefab.GetComponent<ParticleSystem>())continue;
                    foreach(var r in prefab.GetComponentsInChildren<Renderer>(true))
                        foreach(var m in r.sharedMaterials)if(m&&!result.originalShaders.Contains(m.shader.name))result.originalShaders.Add(m.shader.name);
                    var instance=Instantiate(prefab,stage.transform);instance.SetActive(false);
                    FactionVisuals.Apply(instance.transform,Force.Player);Check(instance.transform,Force.Player);
                    FactionVisuals.Apply(instance.transform,Force.Opponent);Check(instance.transform,Force.Opponent);
                    result.particlePrefabs++;Destroy(instance);
                    if(result.particlePrefabs%12==0)yield return null;
                }
                Destroy(stage);
                var local=BattleManager.BM.MyPlayerRole;
                var enemy=FindObjectsByType<NeutralRole>(FindObjectsSortMode.None).FirstOrDefault();
                if(!enemy)
                {
                    var prefab=Resources.Load<NeutralRole>("NeutralRole");
                    if(prefab){enemy=Instantiate(prefab);enemy.Init();enemy.BaseMoveSpeed=0;}
                }
                Require(enemy,"Enemy role for original skill catalog validation");
                if(!enemy)yield break;
                local.transform.position=Vector3.zero;enemy.transform.position=new Vector3(230,0,0);
                local.BaseMoveSpeed=enemy.BaseMoveSpeed=0;
                local.AddBuffer(RoleBuffer.Immortal,30);enemy.AddBuffer(RoleBuffer.Immortal,30);
                foreach(var feature in FeatureData.GetAllFeatureDatas())
                {
                    foreach(Role role in new Role[]{local,enemy})
                    {
                        role.GetFeature(feature.MyFeaturePart,feature.ID);
                        Check(role.transform,role.MyForce);
                    }
                    result.skills++;yield return null;
                }
                // A real ShootAmmo is initialized by the original attack controller.
                local.GetFeature(FeaturePart.Head,5);
                yield return new WaitForSeconds(.1f);
                var attack=local.SkillDic[FeaturePart.Head];attack.SpawnAttackPrefab(0);
                var shot=FindObjectsByType<ShootAmmo>(FindObjectsSortMode.None).FirstOrDefault(a=>a.VisualForce==Force.Player);
                Require(shot,"A live friendly projectile was spawned");
                if(shot){shot.ForceReverse(Force.Opponent,1);Check(shot.transform,Force.Opponent);result.reflections++;}
                Require(result.skills==95&&result.particlePrefabs>0,"Complete skill and particle catalog");
                // Side-by-side screenshot uses actual roles and their original effects.
                local.GetFeature(FeaturePart.Body,103);enemy.GetFeature(FeaturePart.Body,103);
                local.GetFeature(FeaturePart.Back,213);enemy.GetFeature(FeaturePart.Back,213);
                local.transform.position=Vector3.zero;enemy.transform.position=new Vector3(230,0,0);
                yield return new WaitForSeconds(.2f);
                NeonRenderCapture.Capture(capturePath);
            }
            result.passed=string.IsNullOrEmpty(result.failure);
        }
        int Check(Transform root,Force force)
        {
            int count=0;
            foreach(var r in root.GetComponentsInChildren<Renderer>(true))
            {
                if(!(r is SpriteRenderer)&&!(r is ParticleSystemRenderer)&&!(r is TrailRenderer)&&!(r is LineRenderer))continue;
                if(FactionVisuals.PreservesGuardian(r))
                {foreach(var m in r.sharedMaterials)if(m)Require(!m.shader.name.StartsWith("Neon/Faction/"),"Guardian preserves lobby palette: "+r.name);continue;}
                var ammo=r.GetComponentInParent<Ammo>();Force expected=ammo?ammo.VisualForce:force;
                foreach(var m in r.sharedMaterials)if(m)Require(m.shader.name.StartsWith("Neon/Faction/")&&m.shader.isSupported,"Palette shader missing/unsupported: "+r.name);
                r.GetPropertyBlock(block);Require(Mathf.Approximately(block.GetFloat("_NeonSide"),expected==Force.Player?0:1),"Wrong viewer side: "+r.name);block.Clear();count++;
            }
            result.renderers+=count;return count;
        }
        void Require(bool condition,string message){if(!condition&&result.failure==""){result.failure=message;Debug.LogError("PALETTE_CHECK: "+message);}}
    }
}
