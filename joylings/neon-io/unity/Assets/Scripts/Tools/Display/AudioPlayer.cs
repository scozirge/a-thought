using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Audio;
namespace Scoz.Func
{
    public class AudioPlayer : MonoBehaviour
    {
        public static AudioPlayer Myself;
        public static bool IsInit;
        static List<AudioSource> SoundList;
        static List<AudioSource> MusicList;
        static GameObject AudioManager;
        static GameObject MySoundObject;
        static GameObject MyMusicObject;

        static Dictionary<string, AudioSource> LoopSoundDic;
        static Dictionary<string, AudioSource> LoopMusicDic;
        static AudioSource CurPlaySound;
        static AudioSource CurPlayMusic;
        static Dictionary<string, Coroutine> MusicFadeDic;


        static AudioMixer MyAudioMixer = null;
        static string MusicGroup = "Music";
        static string SoundGroup = "Sound";
        static int MaxAttenuation = -30;//最高降低音量為把Volume調整為-40，低於-40就會設定不開音量
        public static float MusicVolumeRatio = 1;
        public static float SoundVolumeRatio = 1;

        [SerializeField]
        List<SoundData> StartPlayMusicList = null;
        public static void InstantiateAudioManager()
        {
            if (!IsInit)
            {
                IsInit = true;
                AudioManager = new GameObject("AudioManager");
                AudioPlayer ap = AudioManager.AddComponent<AudioPlayer>();
                ap.Init();
            }
        }
        public void Init()
        {
            Myself = this;
            MyAudioMixer = Resources.Load<AudioMixer>("Music/NewAudioMixer");
            DontDestroyOnLoad(gameObject);
            LoopSoundDic = new Dictionary<string, AudioSource>();
            LoopMusicDic = new Dictionary<string, AudioSource>();
            MusicFadeDic = new Dictionary<string, Coroutine>();
            SoundList = new List<AudioSource>();
            MusicList = new List<AudioSource>();
            MySoundObject = new GameObject("SoundPlayer");
            MyMusicObject = new GameObject("MusicPlayer");
            MySoundObject.transform.SetParent(AudioManager.transform);
            MyMusicObject.transform.SetParent(AudioManager.transform);
            AudioSource mySound = MySoundObject.AddComponent<AudioSource>();
            mySound.outputAudioMixerGroup = MyAudioMixer.FindMatchingGroups(SoundGroup)[0];
            AudioSource myMusic = MyMusicObject.AddComponent<AudioSource>();
            myMusic.outputAudioMixerGroup = MyAudioMixer.FindMatchingGroups(MusicGroup)[0];
            SoundList.Add(mySound);
            MusicList.Add(myMusic);
            CurPlaySound = mySound;
            CurPlayMusic = myMusic;
        }
        private void Start()
        {
            if (!IsInit)
                InstantiateAudioManager();
            if (StartPlayMusicList != null)
            {
                for (int i = 0; i < StartPlayMusicList.Count; i++)
                {
                    PlayLoopMusic_Static(StartPlayMusicList[i].Audio, StartPlayMusicList[i].Name);
                }
            }
        }
        public static void FadeOutMusic(string _key, float _fadeTime)
        {
            if (!Myself)
                return;
            if (!LoopMusicDic.ContainsKey(_key))
            {
                return;
            }
            if (_fadeTime <= 0 || LoopMusicDic[_key].volume <= 0) { Myself.StopLoopMusic(_key); return; }
            if (MusicFadeDic.ContainsKey(_key))
            {
                Myself.StopCoroutine(MusicFadeDic[_key]);
                MusicFadeDic.Remove(_key);
            }
            Coroutine c = Myself.StartCoroutine(Myself.FadeOut(_key, _fadeTime));
            MusicFadeDic.Add(_key, c);
        }
        public static void FadeInMusic(AudioClip _ac, string _key, float _fadeTime, float _volume)
        {
            if (!Myself)
                return;
            if (LoopMusicDic.ContainsKey(_key))
            {
                Myself.StopLoopMusic(_key);
            }
            if (_fadeTime <= 0)
            {
                var immediate = PlayLoopMusic_Static(_ac, _key);
                if (immediate) immediate.volume = Mathf.Clamp01(_volume);
                return;
            }
            if (MusicFadeDic.ContainsKey(_key))
            {
                Myself.StopCoroutine(MusicFadeDic[_key]);
                MusicFadeDic.Remove(_key);
            }
            Coroutine c = Myself.StartCoroutine(Myself.FadeIn(_ac, _key, _fadeTime, _volume));
            MusicFadeDic.Add(_key, c);
        }
        IEnumerator FadeOut(string _key, float _fadeTime)
        {
            if (LoopMusicDic.ContainsKey(_key))
            {
                AudioSource source = LoopMusicDic[_key];
                float startVolume = source.volume;
                while (source && LoopMusicDic.TryGetValue(_key, out var current) && current == source && source.volume > 0)
                {
                    source.volume = Mathf.Max(0, source.volume - startVolume * Time.deltaTime / _fadeTime);
                    if (source.volume <= 0)
                    {
                        source.Stop(); source.loop = false; LoopMusicDic.Remove(_key);
                        break;
                    }
                    yield return null;
                }
            }
            MusicFadeDic.Remove(_key);
        }
        IEnumerator FadeIn(AudioClip _ac, string _key, float _fadeTime, float _volume)
        {
            AudioSource source = PlayLoopMusic_Static(_ac, _key);
            if (source)
            {
                source.volume = 0f;
                float target = Mathf.Clamp01(_volume);
                while (source && LoopMusicDic.TryGetValue(_key, out var current) && current == source && source.volume < target)
                {
                    source.volume = Mathf.Min(target, source.volume + Time.deltaTime / _fadeTime);
                    yield return null;
                }
            }
            MusicFadeDic.Remove(_key);
        }
        public static float GetMusicVolume()
        {
            return MusicVolumeRatio;
        }
        /// <summary>
        /// 傳入0~1
        /// </summary>
        public static void SetMusicVolume(float _volume)
        {

            if (_volume > 1)
                _volume = 1;
            else if (_volume < 0)
                _volume = 0;
            float attenuation = (MaxAttenuation * (1 - _volume));
            if (attenuation <= MaxAttenuation)
            {
                attenuation = -80;
            }
            else
            {
                if (attenuation > 0)
                    attenuation = 0;
            }
            MusicVolumeRatio = _volume;
            MyAudioMixer.SetFloat("MusicVol", attenuation);
        }
        public static float GetSoundVolume()
        {
            return SoundVolumeRatio;
        }
        /// <summary>
        /// 傳入0~1
        /// </summary>
        public static void SetSoundVolume(float _volume)
        {
            if (_volume > 1)
                _volume = 1;
            else if (_volume < 0)
                _volume = 0;
            float attenuation = (MaxAttenuation * (1 - _volume));
            if (attenuation <= MaxAttenuation)
            {
                attenuation = -80;
            }
            else
            {
                if (attenuation > 0)
                    attenuation = 0;
            }
            SoundVolumeRatio = _volume;
            MyAudioMixer.SetFloat("SoundVol", attenuation);
        }
        public void PlaySoundByDic(string _soundName)
        {
            PlaySound(GameDictionary.GetSound(_soundName));
        }
        public static void PlaySoundByDic_Static(string _soundName)
        {
            PlaySound(GameDictionary.GetSound(_soundName));
        }
        public static void PlaySoundByString(string _soundName)
        {
            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableSoundSource() == null)
            {
                GetNewSoundSource();
            }
            CurPlaySound.clip = Resources.Load<AudioClip>(string.Format("Sounds/{0}", _soundName));
            CurPlaySound.loop = false;
            CurPlaySound.Play(0);
        }
        public static void PlaySound(AudioClip _ac)
        {
            if (_ac == null)
            {
                return;
            }
            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableSoundSource() == null)
            {
                GetNewSoundSource();
            }
            CurPlaySound.clip = _ac;
            CurPlaySound.loop = false;
            CurPlaySound.Play(0);
        }
        public void PlaySoundByAudioClip(AudioClip _ac)
        {
            if (_ac == null)
            {
                Debug.LogWarning("要播放的音檔為null");
                return;
            }
            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableSoundSource() == null)
            {
                GetNewSoundSource();
            }
            CurPlaySound.clip = _ac;
            CurPlaySound.loop = false;
            CurPlaySound.Play(0);
        }
        public void PlayMusicByString(string _MusicName)
        {

            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableMusicSource() == null)
            {
                GetNewMusicSource();
            }
            CurPlayMusic.volume = 1f;
            CurPlayMusic.loop = false;
            CurPlayMusic.clip = Resources.Load<AudioClip>(string.Format("Musics/{0}", _MusicName));
            CurPlayMusic.Play(0);
        }
        public void PlayMusicByAudioClip(AudioClip _ac)
        {
            if (_ac == null)
            {
                Debug.LogWarning("要播放的音檔為null");
                return;
            }
            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableMusicSource() == null)
            {
                GetNewMusicSource();
            }
            CurPlayMusic.volume = 1f;
            CurPlayMusic.loop = false;
            CurPlayMusic.clip = _ac;
            CurPlayMusic.Play(0);
        }
        public static void PlayMusicByAudioClip_Static(AudioClip _ac)
        {
            if (_ac == null)
            {
                Debug.LogWarning("要播放的音檔為null");
                return;
            }
            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableMusicSource() == null)
            {
                GetNewMusicSource();
            }
            CurPlayMusic.volume = 1f;
            CurPlayMusic.loop = false;
            CurPlayMusic.clip = _ac;
            CurPlayMusic.Play(0);
        }
        public void PlayLoopSound(AudioClip _ac, string _key)
        {

            if (_ac == null)
            {
                Debug.LogWarning("要播放的音檔為null");
                return;
            }
            if (LoopSoundDic.ContainsKey(_key))
            {
                //Debug.LogWarning(string.Format("Key:{0} 循環播放音效索引重複", _key));
                return;
            }
            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableSoundSource() == null)
            {
                GetNewSoundSource();
            }

            CurPlaySound.clip = _ac;
            CurPlaySound.loop = true;
            CurPlaySound.Play();
            LoopSoundDic.Add(_key, CurPlaySound);
        }
        public static void PlayLoopSound_Static(AudioClip _ac, string _key)
        {
            if (_ac == null)
            {
                Debug.LogWarning("要播放的音檔為null");
                return;
            }
            if (LoopSoundDic.ContainsKey(_key))
            {
                //Debug.LogWarning(string.Format("Key:{0} 循環播放音效索引重複", _key));
                return;
            }
            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableSoundSource() == null)
            {
                GetNewSoundSource();
            }
            CurPlaySound.clip = _ac;
            CurPlaySound.loop = true;
            CurPlaySound.Play();
            LoopSoundDic.Add(_key, CurPlaySound);
        }
        public void StopLoopSound(string _key)
        {
            if (LoopSoundDic.ContainsKey(_key))
            {
                LoopSoundDic[_key].Stop();
                LoopSoundDic[_key].loop = false;
                LoopSoundDic.Remove(_key);
            }
        }
        public static void StopLoopSound_Static(string _key)
        {
            if (LoopSoundDic.ContainsKey(_key))
            {
                LoopSoundDic[_key].Stop();
                LoopSoundDic[_key].loop = false;
                LoopSoundDic.Remove(_key);
            }
        }

        public void PlayLoopMusic(AudioClip _ac, string _key)
        {
            if (_ac == null)
            {
                Debug.LogWarning("要播放的音檔為null");
                return;
            }
            if (LoopMusicDic.ContainsKey(_key))
            {
                Debug.LogWarning(string.Format("Key:{0} 循環播放音效索引重複", _key));
                return;
            }
            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableMusicSource() == null)
            {
                GetNewMusicSource();
            }
            CurPlayMusic.volume = 1f;
            CurPlayMusic.clip = _ac;
            CurPlayMusic.loop = true;
            CurPlayMusic.Play();
            LoopMusicDic.Add(_key, CurPlayMusic);

        }
        public static AudioSource PlayLoopMusicAtSecond_Static(AudioClip _ac, string _key, float _second)
        {
            AudioSource myAS = PlayLoopMusic_Static(_ac, _key);
            if (myAS) myAS.time = Mathf.Clamp(_second, 0, Mathf.Max(0, _ac.length - .001f));
            return myAS;
        }
        public static AudioSource PlayLoopMusic_Static(AudioClip _ac, string _key)
        {
            if (_ac == null)
            {
                Debug.LogWarning("要播放的音檔為null");
                return null;
            }
            if (LoopMusicDic.ContainsKey(_key))
            {
                //Debug.LogWarning(string.Format("Key:{0} 循環播放音效索引重複", _key));
                return null;
            }
            if (!IsInit)
                InstantiateAudioManager();
            if (GetApplicableMusicSource() == null)
            {
                GetNewMusicSource();
            }
            CurPlayMusic.volume = 1f;
            CurPlayMusic.clip = _ac;
            CurPlayMusic.loop = true;
            CurPlayMusic.Play();
            LoopMusicDic.Add(_key, CurPlayMusic);
            return LoopMusicDic[_key];
        }
        public static bool CheckMusicKeyIfExit(string _key)
        {
            if (LoopMusicDic.ContainsKey(_key))
                return true;
            else
                return false;
        }
        public void StopLoopMusic(string _key)
        {
            if (MusicFadeDic.TryGetValue(_key, out var fade))
            {
                if (fade != null) StopCoroutine(fade);
                MusicFadeDic.Remove(_key);
            }
            if (LoopMusicDic.ContainsKey(_key))
            {
                LoopMusicDic[_key].Stop();
                LoopMusicDic[_key].loop = false;
                LoopMusicDic.Remove(_key);
            }
            //else
            //Debug.LogWarning(string.Format("Key:{0}　不存在尋換播放音效清單中", _key));
        }
        public static void StopAllMusic()
        {
            if (!IsInit) return;
            foreach (var fade in MusicFadeDic.Values)
                if (fade != null && Myself) Myself.StopCoroutine(fade);
            MusicFadeDic.Clear();
            foreach (var source in LoopMusicDic.Values)
            {
                if (!source) continue;
                source.Stop(); source.loop = false;
            }
            LoopMusicDic.Clear();
        }
        static AudioSource GetApplicableSoundSource()
        {
            CurPlaySound = null;
            for (int i = 0; i < SoundList.Count; i++)
            {
                if (!SoundList[i].loop && !SoundList[i].isPlaying)
                {
                    CurPlaySound = SoundList[i];
                    return CurPlaySound;
                }
            }
            return CurPlaySound;
        }
        static AudioSource GetNewSoundSource()
        {
            CurPlaySound = MySoundObject.AddComponent<AudioSource>();
            CurPlaySound.outputAudioMixerGroup = MyAudioMixer.FindMatchingGroups(SoundGroup)[0];
            SoundList.Add(CurPlaySound);
            return CurPlaySound;
        }
        static AudioSource GetApplicableMusicSource()
        {
            CurPlayMusic = null;
            for (int i = 0; i < MusicList.Count; i++)
            {
                if (!MusicList[i].loop && !MusicList[i].isPlaying)
                {
                    CurPlayMusic = MusicList[i];
                    return CurPlayMusic;
                }
            }
            return CurPlayMusic;
        }
        static AudioSource GetNewMusicSource()
        {
            CurPlayMusic = MyMusicObject.AddComponent<AudioSource>();
            CurPlayMusic.outputAudioMixerGroup = MyAudioMixer.FindMatchingGroups(MusicGroup)[0];
            MusicList.Add(CurPlayMusic);
            return CurPlayMusic;
        }
    }
}
