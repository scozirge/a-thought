using PlayerPrefs = Neon.ProfilePreferences;
using System;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;

namespace Scoz.Func
{
    public partial class MyPlayer
    {
        const string LocalPrefix = "Neon.Local.";

        public static bool TryInitLegacyPlayerData(string[] data)
        {
            if (data == null || data.Length < 8) return false;
            int value;
            foreach (int index in new[] { 0, 1, 2, 4, 7 })
                if (!int.TryParse(data[index], out value)) return false;
            try
            {
                InitPlayerData(data);
                return true;
            }
            catch (Exception error)
            {
                Debug.LogWarning("Legacy profile data is unavailable: " + error.Message);
                return false;
            }
        }

        public static void LoadLocalProgress()
        {
            MaxKill = Mathf.Max(0, PlayerPrefs.GetInt(LocalPrefix + "MaxKill", 0));
            ChallengeWinningStreak = Mathf.Max(0, PlayerPrefs.GetInt(LocalPrefix + "WinningStreak", 0));
            HeadSpellClamorUnlock = PlayerPrefs.GetInt(LocalPrefix + "HeadSpellClamor", 0) == 1;
            BodySpellClamorUnlock = PlayerPrefs.GetInt(LocalPrefix + "BodySpellClamor", 0) == 1;
            BackSpellClamorUnlock = PlayerPrefs.GetInt(LocalPrefix + "BackSpellClamor", 0) == 1;
            for (int i = 0; i < GeneralClamorContents.Length; i++)
                GeneralClamorContents[i] = PlayerPrefs.GetString(LocalPrefix + "Clamor." + i, GeneralClamorContents[i]);
            foreach (FeatureData feature in GameDictionary.FeatureDic.Values)
                feature.Content = PlayerPrefs.GetString(LocalPrefix + "Clamor.spellclamor" + feature.ID, feature.Content);
        }

        public static void SaveLocalProgress()
        {
            if (!KongregateAPIBehaviour.UsesLocalProfile || !GameDictionary.IsInit) return;
            PlayerPrefs.SetInt(LocoData.Star.ToString(), Mathf.Max(0, Star));
            PlayerPrefs.SetString(LocoData.FeatureData.ToString(), OwnStarFeatureStr ?? "");
            PlayerPrefs.SetString(LocoData.ClamorData.ToString(), OwnGeneralClamorStr ?? "");
            PlayerPrefs.SetInt(LocalPrefix + "MaxKill", MaxKill);
            PlayerPrefs.SetInt(LocalPrefix + "WinningStreak", ChallengeWinningStreak);
            PlayerPrefs.SetInt(LocalPrefix + "HeadSpellClamor", HeadSpellClamorUnlock ? 1 : 0);
            PlayerPrefs.SetInt(LocalPrefix + "BodySpellClamor", BodySpellClamorUnlock ? 1 : 0);
            PlayerPrefs.SetInt(LocalPrefix + "BackSpellClamor", BackSpellClamorUnlock ? 1 : 0);
            PlayerPrefs.Save();
        }

        public static bool IsValidClamorKey(string key)
        {
            if (string.IsNullOrEmpty(key)) return false;
            int id;
            if (key.StartsWith("spellclamor", StringComparison.Ordinal))
                return int.TryParse(key.Substring(11), out id) && GameDictionary.FeatureDic.ContainsKey(id);
            return int.TryParse(key, out id) && id >= 0 && id < GeneralClamorContents.Length;
        }

        public static void SaveLocalClamors(Dictionary<string, string> changes)
        {
            if (changes == null) return;
            foreach (KeyValuePair<string, string> change in changes)
            {
                if (!IsValidClamorKey(change.Key)) continue;
                string content = change.Value ?? "";
                PlayerPrefs.SetString(LocalPrefix + "Clamor." + change.Key, content);
                if (change.Key.StartsWith("spellclamor", StringComparison.Ordinal))
                    GameDictionary.FeatureDic[int.Parse(change.Key.Substring(11))].Content = content;
                else
                    GeneralClamorContents[int.Parse(change.Key)] = content;
            }
            PlayerPrefs.Save();
        }

        // Used by startup and migration checks: corrupt/truncated saves never leave null skill slots.
        public static FeatureData[] ParseChallengeLoadout(string saved)
        {
            int[] defaults = { 5, 103, 213, 102, 17 };
            FeatureData[] result = new FeatureData[defaults.Length];
            string[] entries = (saved ?? "").Split(',');
            for (int i = 0; i < result.Length; i++)
            {
                int id;
                FeatureData feature;
                if (i < entries.Length && int.TryParse(entries[i], out id)
                    && GameDictionary.FeatureDic.TryGetValue(id, out feature))
                    result[i] = feature;
                else if (GameDictionary.FeatureDic.TryGetValue(defaults[i], out feature))
                    result[i] = feature;
                else
                    throw new InvalidOperationException("Required default skill is missing: " + defaults[i]);
            }
            return result;
        }
    }
}
