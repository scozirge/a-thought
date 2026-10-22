using PlayerPrefs = Neon.ProfilePreferences;
using System;
using System.Collections;
using System.Linq;
using Neon.Astral;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace Neon.Validation
{
    // Called only by explicit smoke-test arguments. This opens the shipped UI and
    // uses its normal matchmaking/AI timeout; it never fabricates a room or opponent.
    public static class NeonChallengeCheck
    {
        public static IEnumerator StartFromAstralLobby(Action<bool> completed)
        {
            float deadline=Time.realtimeSinceStartup+8;
            while((!AstralPresentation.Instance||AstralPresentation.Instance.CurrentView!="lobby")&&Time.realtimeSinceStartup<deadline)yield return null;
            var presentation=AstralPresentation.Instance;
            if(!presentation||presentation.CurrentView!="lobby"){completed(false);yield break;}
            string loadoutKey=LocoData.ChallengeSelectFeature.ToString(),tutorialKey=LocoData.InitTutorial.ToString();
            bool hadLoadout=PlayerPrefs.HasKey(loadoutKey),hadTutorial=PlayerPrefs.HasKey(tutorialKey);
            string savedLoadout=PlayerPrefs.GetString(loadoutKey);int savedTutorial=PlayerPrefs.GetInt(tutorialKey);
            try
            {
                MyPlayer.ChallengeSelectFeatures=MyPlayer.ParseChallengeLoadout("");PlayerPrefs.SetInt(tutorialKey,1);
                var input=presentation.GetComponentsInChildren<InputField>().FirstOrDefault(x=>x.name=="Player name");if(input)input.text=MyPlayer.Name;
                var enter=presentation.GetComponentsInChildren<Button>().FirstOrDefault(x=>x.name=="Challenge");if(!enter){completed(false);yield break;}enter.onClick.Invoke();
                yield return null;yield return null;
                var match=presentation.GetComponentsInChildren<Button>().FirstOrDefault(x=>x.name=="Start matchmaking");if(!match){completed(false);yield break;}match.onClick.Invoke();
                completed(ChallengeUI.IsFindingOpponent);Debug.Log("NEON_CHALLENGE_START: Astral lobby and matchmaking buttons, original five-skill controller.");
            }
            finally
            {
                if(hadLoadout)PlayerPrefs.SetString(loadoutKey,savedLoadout);else PlayerPrefs.DeleteKey(loadoutKey);
                if(hadTutorial)PlayerPrefs.SetInt(tutorialKey,savedTutorial);else PlayerPrefs.DeleteKey(tutorialKey);
            }
        }
        public static bool StartFromLobby()
        {
            Scene scene = SceneManager.GetActiveScene();
            if (scene.name != "Lobby" || !GameDictionary.IsInit || !MyPlayer.CheckInitPlayerData.Finished)
            {
                Debug.LogError("NEON_CHALLENGE_START_FAILED: the original lobby/profile is not ready.");
                return false;
            }

            Button challengeButton = null;
            foreach (Button button in Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (button.gameObject.scene == scene && button.name == "ChallengeBtn")
                {
                    challengeButton = button;
                    break;
                }
            }
            if (!challengeButton || !challengeButton.isActiveAndEnabled || !challengeButton.IsInteractable())
            {
                Debug.LogError("NEON_CHALLENGE_START_FAILED: the original Challenge button is unavailable.");
                return false;
            }

            // Use the same five defaults as a fresh profile, independent of the
            // developer's saved selection. Ownership, stars and prices stay intact.
            FeatureData[] previousLoadout = MyPlayer.ChallengeSelectFeatures;
            string loadoutKey = LocoData.ChallengeSelectFeature.ToString();
            string tutorialKey = LocoData.InitTutorial.ToString();
            bool hadLoadout = PlayerPrefs.HasKey(loadoutKey);
            string savedLoadout = PlayerPrefs.GetString(loadoutKey);
            bool hadTutorial = PlayerPrefs.HasKey(tutorialKey);
            int savedTutorial = PlayerPrefs.GetInt(tutorialKey);
            bool started = false;
            try
            {
                MyPlayer.ChallengeSelectFeatures = MyPlayer.ParseChallengeLoadout("");
                challengeButton.onClick.Invoke();
                ChallengeUI ui = ChallengeUI.Myself;
                if (!ui || !ui.isActiveAndEnabled || ui.gameObject.scene != scene)
                {
                    Debug.LogError("NEON_CHALLENGE_START_FAILED: the button did not open ChallengeUI.");
                    return false;
                }

                // Equivalent to closing the first-use tutorial before Match.
                if (PopupUI.IsInit) PopupUI.ShowTutorial_Static(false, 1);
                ui.Connect();
                started = ChallengeUI.IsFindingOpponent;
                if (started)
                    Debug.Log("NEON_CHALLENGE_START: original UI matchmaking, fresh-profile loadout 5,103,213,102,17.");
                else
                    Debug.LogError("NEON_CHALLENGE_START_FAILED: Connect did not enter matchmaking.");
                return started;
            }
            catch (Exception error)
            {
                Debug.LogError("NEON_CHALLENGE_START_FAILED: " + error);
                return false;
            }
            finally
            {
                // ChallengeUI.RefreshText persists its five selections. Keep test
                // defaults in memory for this match but restore the user's keys.
                if (hadLoadout) PlayerPrefs.SetString(loadoutKey, savedLoadout);
                else PlayerPrefs.DeleteKey(loadoutKey);
                if (hadTutorial) PlayerPrefs.SetInt(tutorialKey, savedTutorial);
                else PlayerPrefs.DeleteKey(tutorialKey);
                if (!started) MyPlayer.ChallengeSelectFeatures = previousLoadout;
            }
        }
    }
}
