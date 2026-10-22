#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEditor;
using LitJson;
using Scoz.Func;
using Starbro.NeonIO;

public static class NeonContentValidation
{
    [MenuItem("Neon IO/Validate preserved content and regression fixes")]
    public static void Validate()
    {
        TextAsset json = Resources.Load<TextAsset>("Json/Feature");
        Require(json != null, "Feature.json is missing");
        JsonData features = JsonMapper.ToObject(json.text)["Feature"];
        Require(features.Count == 95, "Original feature count changed; expected 95");
        foreach (JsonData feature in features)
        {
            string type = feature["FeatureType"].ToString().Trim();
            string part = feature["FeaturePart"].ToString().Trim();
            string icon = feature["Icon"].ToString().Trim();
            Require(Resources.Load<Skill>("Gameobjects/Battle/Skill/Skill-" + type) != null,
                "Missing skill prefab: " + type);
            Require(Resources.Load<Sprite>("Images/Role/" + part + "/" + icon) != null,
                "Missing character sprite: " + part + "/" + icon);
        }
        foreach (string role in new[] { "PlayerRole", "NeutralRole", "God" })
            Require(Resources.Load<GameObject>(role) != null, "Missing role prefab: " + role);
        foreach (string scene in new[] { "Init", "Lobby", "Battle", "Challenge", "ParticleExhibition" })
            Require(AssetDatabase.LoadAssetAtPath<SceneAsset>("Assets/Scenes/" + scene + ".unity") != null,
                "Missing original scene: " + scene);

        CheckCorruptLoadouts();
        CheckBufferReplacement();
        CheckParticleGroupBounds();
        Require(!MyPlayer.IsValidClamorKey("-1") && !MyPlayer.IsValidClamorKey("6")
            && !MyPlayer.IsValidClamorKey(null), "Invalid clamor keys were accepted");
        Debug.Log("NEON_CONTENT_VALIDATION_PASSED: 95 features, character sprites, original roles/scenes, corrupt saves, buffer replacement and particle bounds.");
    }

    static void CheckCorruptLoadouts()
    {
        var original = GameDictionary.FeatureDic;
        try
        {
            GameDictionary.FeatureDic = new Dictionary<int, FeatureData>();
            foreach (int id in new[] { 5, 103, 213, 102, 17 })
                GameDictionary.FeatureDic.Add(id, new FeatureData { ID = id });
            foreach (string save in new[] { "", "bad", "999999,5", "5,103,213,102,17,999,not-an-id" })
            {
                FeatureData[] parsed = MyPlayer.ParseChallengeLoadout(save);
                Require(parsed.Length == 5, "Corrupt save changed loadout length");
                foreach (FeatureData entry in parsed) Require(entry != null, "Corrupt save left a null skill");
            }
        }
        finally { GameDictionary.FeatureDic = original; }
    }

    static void CheckBufferReplacement()
    {
        var go = new GameObject("NeonValidationAmmo");
        try
        {
            Ammo ammo = go.AddComponent<Ammo>();
            ammo.AddBuffer(new BufferData(RoleBuffer.Stun, 1, 0, 0));
            ammo.AddBuffer(new BufferData(RoleBuffer.Stun, 2, 0, 0));
            var buffers = (List<BufferData>)typeof(Ammo).GetField("Buffers", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(ammo);
            Require(buffers.Count == 1 && buffers[0].Time == 2, "Replacing a buff duplicated it");
        }
        finally { UnityEngine.Object.DestroyImmediate(go); }
    }

    static void CheckParticleGroupBounds()
    {
        var go = new GameObject("NeonValidationParticles");
        try
        {
            ParticleManager manager = go.AddComponent<ParticleManager>();
            var groups = new List<List<ParticleSystem>> { new List<ParticleSystem>() };
            typeof(ParticleManager).GetField("ParticleGroups", BindingFlags.Instance | BindingFlags.NonPublic).SetValue(manager, groups);
            manager.ActiveParticleGroup(true, -1);
            manager.ActiveParticleGroup(true, groups.Count);
            manager.SetIfEmitCertainParticles(true, -1);
            manager.SetIfEmitCertainParticles(true, (sbyte)groups.Count);
        }
        finally { UnityEngine.Object.DestroyImmediate(go); }
    }

    static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
}
#endif
