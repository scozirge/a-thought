using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.UI;
namespace Scoz.Func
{
    public partial class GameDictionary : MonoBehaviour
    {
        [SerializeField]
        List<SpriteData> SpriteList = null;
        [SerializeField]
        Sprite[] NumberIcons = null;
        [SerializeField]
        List<EffectData> EffectList = null;
        [SerializeField]
        List<SoundData> MusicList = null;
        [SerializeField]
        List<SoundData> SoundList = null;


        static Dictionary<string, SpriteData> SpriteDic = new Dictionary<string, SpriteData>();
        static Dictionary<string, EffectData> EffectDic = new Dictionary<string, EffectData>();
        static Dictionary<string, SoundData> MusicDic = new Dictionary<string, SoundData>();
        static Dictionary<string, SoundData> SoundDic = new Dictionary<string, SoundData>();
        static GameDictionary Myself;

        public static bool IsInit { get; private set; }

        void InitSpriteDic()
        {
            if (SpriteList.Count != 0)
            {
                for (int i = 0; i < SpriteList.Count; i++)
                {
                    SpriteDic.Add(SpriteList[i].Name, SpriteList[i]);
                }
            }
        }
        void InitEffectDic()
        {
            if (EffectList.Count != 0)
            {
                for (int i = 0; i < EffectList.Count; i++)
                {
                    EffectDic.Add(EffectList[i].Name, EffectList[i]);
                }
            }
        }
        public static SpriteData GetSprite(string _SpriteName)
        {
            if (SpriteDic.ContainsKey(_SpriteName))
            {
                return SpriteDic[_SpriteName];
            }
            else
                return null;
        }
        public static EffectData GetEffect(string _effectName)
        {
            if (EffectDic.ContainsKey(_effectName))
            {
                return EffectDic[_effectName];
            }
            else
                return null;
        }
        void InitMusicDic()
        {
            if (MusicList.Count != 0)
            {
                for (int i = 0; i < MusicList.Count; i++)
                {
                    MusicDic.Add(MusicList[i].Name, MusicList[i]);
                }
            }
        }
        void InitSoundDic()
        {
            if (SoundList.Count != 0)
            {
                for (int i = 0; i < SoundList.Count; i++)
                {
                    SoundDic.Add(SoundList[i].Name, SoundList[i]);
                }
            }
        }
        public static AudioClip GetMusic(string _MusicName)
        {
            if (MusicDic.ContainsKey(_MusicName))
            {
                return MusicDic[_MusicName].Audio;
            }
            else
                return null;
        }
        public static AudioClip GetSound(string _SoundName)
        {
            if (SoundDic.ContainsKey(_SoundName))
            {
                return SoundDic[_SoundName].Audio;
            }
            else
                return null;
        }

        /// <summary>
        /// 設定字典
        /// </summary>
        public void InitDic()
        {
            if (IsInit)
                return;
            Myself = this;
            IsInit = true;
            InitSpriteDic();
            InitEffectDic();
            InitMusicDic();
            InitSoundDic();
            //將Json資料寫入字典裡
            LoadJsonDataToDic();
            DontDestroyOnLoad(gameObject);
            Debug.Log("GameDic Inited");
        }

        public static Sprite GetNumberIcons(int _number)
        {
            if (_number < 0 || _number > 9)
            {
                return null;
            }
            if (Myself != null && Myself.NumberIcons != null && _number < Myself.NumberIcons.Length)
                return Myself.NumberIcons[_number];
            else
                return null;
        }
    }
}
