using PlayerPrefs = Neon.ProfilePreferences;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using Starbro.NeonIO;
using System;

namespace Scoz.Func
{
    public partial class Debugger : MonoBehaviour
    {


        // Update is called once per frame
        void KeyDetector()
        {
            return;
            if (Input.GetKeyDown(KeyCode.Q))
            {
                MyPlayer.AddStar(10);
                LobbyUI.RefreshStar();
                Debug.Log("Star+10");
            }
            else if (Input.GetKeyDown(KeyCode.A))
            {
            }
            else if (Input.GetKeyDown(KeyCode.W))
            {
                BattleManager.BM.MyPlayerRole.LevelUp();
                /*
                int rand = UnityEngine.Random.Range(0, 2);
                FeaturePart part = (FeaturePart)rand;
                BattleManager.BM.MyPlayerRole.GetRandomFeature(part);
                */
                /*
                string resultStr = "////////Show All LocoData///////";
                foreach (var name in Enum.GetNames((typeof(LocoData))))
                {
                    resultStr += "\n";
                    string content = PlayerPrefs.GetInt(name).ToString();
                    if (content == "" || content == "0")
                        content = PlayerPrefs.GetString(name);
                    if (content == "" || content == "0")
                        content = PlayerPrefs.GetFloat(name).ToString();
                    resultStr += string.Format("{0}={1}", name, content);
                }
                Debug.Log(resultStr);
                */
            }
            else if (Input.GetKeyDown(KeyCode.M))
            {
            }
            else if (Input.GetKeyDown(KeyCode.C))
            {
            }
            else if (Input.GetKeyDown(KeyCode.V))
            {
            }
            else if (Input.GetKeyDown(KeyCode.E))
            {
                BattleManager.KillAllEnemies();
            }
            else if (Input.GetKeyDown(KeyCode.R))
            {
            }
            else if (Input.GetKeyDown(KeyCode.T))
            {
            }
            else if (Input.GetKeyDown(KeyCode.P))
            {
            }
            else if (Input.GetKeyDown(KeyCode.O))
            {
            }
            else if (Input.GetKeyDown(KeyCode.I))
            {
            }
            else if (Input.GetKeyDown(KeyCode.U))
            {
            }
            else if (Input.GetKeyDown(KeyCode.L))
            {
            }
        }
    }
}
