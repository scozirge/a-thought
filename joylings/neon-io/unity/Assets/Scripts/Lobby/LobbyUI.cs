using PlayerPrefs = Neon.ProfilePreferences;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Scoz.Func;
using System;

namespace Starbro.NeonIO
{
    public class LobbyUI : MonoBehaviour
    {
        #region Public Field
        public static LobbyUI MySelf = null;
        [HideInInspector]
        // Use the same default region for all classroom clients.
        public static Region ChooseedRegion = Region.asia;
        [HideInInspector]
        public Language ChooseedLanguage = Language.English;
        [HideInInspector]
        public int ChooseBattleSong = 0;
        #endregion

        #region Private Field
        [SerializeField]
        GameObject ControlPanel = null;
        [SerializeField]
        GameObject ProgressLab = null;
        [SerializeField]
        GameObject ShopUI = null;
        [SerializeField]
        InputField NameInputField = null;
        [SerializeField]
        Dropdown RegionDropDown = null;
        [SerializeField]
        Dropdown LanguageDropDown = null;
        [SerializeField]
        Dropdown BattleSongDropDown = null;

        [SerializeField]
        GameObject SettingUI = null;
        [SerializeField]
        GameObject[] SettingSubObjs = null;
        [SerializeField]
        Image[] TabImages = null;
        [SerializeField]
        Transform LineBG = null;

        [SerializeField]
        Slider MusicSlider = null;
        [SerializeField]
        Slider SoundSlider = null;
        [SerializeField]
        GameObject[] ConnectShowObjs = null;
        [SerializeField]
        Text[] StarTexts = null;


        #endregion

        #region MonoBehaviour Func
        private void Awake()
        {
            if (!GameManager.InitCheck.Finished)
                GameManager.DeployGameManager();
            PhotonLauncher.SetLobbyUI(this);
            SetRegionDropdownUI();
            SetLanguageDropdown();
            SetChooseBattleSongDropdown();
        }
        public void OnEnable()
        {
            MySelf = this;
            ActiveProgressLab(false);
            ActiveControlPanel(true);
            MusicSlider.value = AudioPlayer.GetMusicVolume();
            SoundSlider.value = AudioPlayer.GetSoundVolume();
            NameInputField.text = MyPlayer.Name;
        }
        void OnDestroy()
        {
            if (MySelf == this) MySelf = null;
        }
        #endregion

        #region Public Func
        public void ActiveControlPanel(bool _bool)
        {
            ControlPanel.SetActive(_bool);
        }
        public void ActiveProgressLab(bool _bool)
        {
            ProgressLab.SetActive(_bool);
        }
        public void ActiveShopUI(bool _bool)
        {
            ShopUI.SetActive(_bool);
        }
        public void Connect()
        {
            if (!PlayerPrefs.HasKey(LocoData.InitTutorial.ToString()))
            {
                PopupUI.ShowTutorial_Static(true, 1);
                PlayerPrefs.SetInt(LocoData.InitTutorial.ToString(), 1);
                return;
            }
            if (!string.IsNullOrWhiteSpace(NameInputField.text) && NameInputField.text != StringData.GetString("Guest"))
                MyPlayer.SetName(NameInputField.text.Trim());
            ActiveProgressLab(true);
            ActiveControlPanel(false);
            PhotonLauncher.SelectGameType = GameType.InfinityWar;
            PhotonLauncher.JoinTheRandomRoom();
            AudioPlayer.StopAllMusic();
            AudioPlayer.PlayLoopMusicAtSecond_Static(GameDictionary.GetMusic(string.Format("Battle{0}", ChooseBattleSong)), "Battle", 0);
            for (int i = 0; i < ConnectShowObjs.Length; i++)
            {
                ConnectShowObjs[i].SetActive(true);
            }
            if(NameInputField.text!=StringData.GetString("Guest"))
                MyPlayer.SetName(NameInputField.text);
            UnityAnalyst.SendStartGame();
        }
        public void ExitGame()
        {
            Application.Quit();
        }
        public void SetRegion()
        {
            ChooseedRegion = (Region)RegionDropDown.value;
        }
        public void SetLanguage()
        {
            ChooseedLanguage = (Language)LanguageDropDown.value;
            MyPlayer.SetLanguage(ChooseedLanguage);
        }
        public void SetBattleSong()
        {
            ChooseBattleSong = BattleSongDropDown.value;
            MyPlayer.SetChooseBattleSong(ChooseBattleSong);
        }
        public void ActiveSettingUI(bool _bool)
        {
            SettingUI.SetActive(_bool);
            if (_bool)
                SetSettingCurrentTab(0);
        }
        public void SetMusicVolume(float _volume)
        {
            MyPlayer.SetMusicVolume(_volume);
        }
        public void SetSoundVolume(float _volume)
        {
            MyPlayer.SetSoundVolume(_volume);
        }
        public void FullScreen()
        {
            Screen.fullScreen = !Screen.fullScreen;
            if (Screen.fullScreen)
            {
                UnityAnalyst.SendClickFullScreen();
            }

        }
        public void ClearData()
        {
            MyPlayer.ClearLocoData();
        }
        public void WatchTutorial()
        {
            PopupUI.ShowTutorial_Static(true,0);
        }
        public void SetSettingCurrentTab(int _index)
        {
            if (_index==1 && !KongregateAPIBehaviour.KGIsLogin && !KongregateAPIBehaviour.UsesLocalProfile)//要有登入kongregate才能進入喊話介面
            {
                PopupUI.ShowConfirmCancel(StringData.GetString("KGRigister"), KongregateAPIBehaviour.KGLogin, null);
                return;
            }
            ChangeToTabUI(_index);
        }

        public static void RefreshStar()
        {
            if (MySelf == null) return;
            for(int i=0;i< MySelf.StarTexts.Length;i++)
            {
                MySelf.StarTexts[i].text= MyPlayer.Star.ToString();
            }
        }
        public void Test()
        {
            KongregateAPIBehaviour.TestRelogin();
        }
        #endregion


        #region Private Func
        void SetRegionDropdownUI()
        {
            if (!RegionDropDown)
                return;
            RegionDropDown.ClearOptions();
            string[] regions = Enum.GetNames(typeof(Region));
            for (int i = 0; i < regions.Length; i++)
            {
                switch (regions[i])
                {
                    case "asia":
                        regions[i] = "Asia";
                        break;
                    case "au":
                        regions[i] = "Australia";
                        break;
                    case "cae":
                        regions[i] = "Canada";
                        break;
                    case "eu":
                        regions[i] = "Europe";
                        break;
                    case "India":
                        regions[i] = "India";
                        break;
                    case "jp":
                        regions[i] = "Japan";
                        break;
                    case "ru":
                        regions[i] = "Russia";
                        break;
                    case "rue":
                        regions[i] = "Russia, East";
                        break;
                    case "sa":
                        regions[i] = "South America";
                        break;
                    case "kr":
                        regions[i] = "South Korea";
                        break;
                    case "us":
                        regions[i] = "USA, East";
                        break;
                    case "usw":
                        regions[i] = "USA, West";
                        break;
                }
            }
            RegionDropDown.AddOptions(new List<string>(regions));
            RegionDropDown.value = (int)ChooseedRegion;
        }
        void SetLanguageDropdown()
        {
            if (!LanguageDropDown)
                return;
            LanguageDropDown.ClearOptions();
            string[] languages = Enum.GetNames(typeof(Language));
            LanguageDropDown.AddOptions(new List<string>(languages));
            ChooseedLanguage = MyPlayer.UseLanguage;
            LanguageDropDown.value = (int)ChooseedLanguage;
        }
        void SetChooseBattleSongDropdown()
        {
            if (!BattleSongDropDown)
                return;
            BattleSongDropDown.ClearOptions();
            string[] songIndexs = new string[2] { "Electronic Symphony Remixed", "Warped" };
            BattleSongDropDown.AddOptions(new List<string>(songIndexs));
            ChooseBattleSong = MyPlayer.ChooseBattleSong;
            BattleSongDropDown.value = ChooseBattleSong;
        }

        public void ShowUpcomingTip(bool _active)
        {
            if (_active)
                PopupUI.ShowTip(StringData.GetString("Upcoming"), new Vector2(0, 0.5f), Camera.main.ScreenToWorldPoint(Input.mousePosition));
            else
                PopupUI.HidTip();
        }
        void ChangeToTabUI(int _index)
        {
            for (int i = 0; i < SettingSubObjs.Length; i++)
            {
                if (i != _index)
                    SettingSubObjs[i].SetActive(false);
                else
                    SettingSubObjs[i].SetActive(true);
                if (_index == 0)
                {
                    TabImages[0].transform.SetSiblingIndex(3);
                    TabImages[1].transform.SetSiblingIndex(1);
                    TabImages[2].transform.SetSiblingIndex(0);
                    TabImages[0].color = Color.white;
                    TabImages[1].color = Color.gray;
                    TabImages[2].color = Color.gray;
                    LineBG.SetSiblingIndex(2);
                }
                else if (_index == 1)
                {
                    TabImages[0].transform.SetSiblingIndex(1);
                    TabImages[1].transform.SetSiblingIndex(3);
                    TabImages[2].transform.SetSiblingIndex(0);
                    TabImages[0].color = Color.gray;
                    TabImages[1].color = Color.white;
                    TabImages[2].color = Color.gray;
                    LineBG.SetSiblingIndex(2);
                }
                else if (_index == 2)
                {
                    TabImages[0].transform.SetSiblingIndex(0);
                    TabImages[1].transform.SetSiblingIndex(1);
                    TabImages[2].transform.SetSiblingIndex(3);
                    TabImages[0].color = Color.gray;
                    TabImages[1].color = Color.gray;
                    TabImages[2].color = Color.white;
                    LineBG.SetSiblingIndex(2);
                }
            }
        }
        #endregion
    }
}
