using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    [RequireComponent(typeof(ParticleSystem))]
    public class ParticleManager : MonoBehaviour
    {
        [HideInInspector]
        public ParticleSystem MyParticle;
        bool Loop;
        float LifeTime;
        float CurParticleTime = 0;
        static Dictionary<string, float> ParticleLifeTimeDic = new Dictionary<string, float>();
        AudioSource[] MyAudios;
        [Tooltip("可動態設定的子特效清單群組，可將指定數量的特效加到指定群組中，方便在遊戲中動態調整某個子特效的數值")]
        public List<ParticleSystem> ParticleGroup1;
        [Tooltip("可動態設定的子特效清單群組，可將指定數量的特效加到指定群組中，方便在遊戲中動態調整某個子特效的數值")]
        public List<ParticleSystem> ParticleGroup2;
        List<List<ParticleSystem>> ParticleGroups;

        public void Init()
        {
            ParticleGroups = new List<List<ParticleSystem>>();
            if (ParticleGroup1 != null)
                ParticleGroups.Add(ParticleGroup1);
            if (ParticleGroup2 != null)
                ParticleGroups.Add(ParticleGroup2);
            var particleModule = GetComponent<ParticleSystem>().main;
            bool playOnAwake = particleModule.playOnAwake;
            MyParticle = GetComponent<ParticleSystem>();
            MyParticle.Stop();
            //particleModule.playOnAwake = false;
            if (ParticleLifeTimeDic.ContainsKey(name))
            {
                LifeTime = ParticleLifeTimeDic[name];
                Loop = LifeTime == 1000;

            }
            else
            {
                LifeTime = 0;
                Loop = false;
                ParticleSystem[] psArray = transform.GetComponentsInChildrenExcludeSelf<ParticleSystem>();
                if (psArray == null)
                {
                    psArray = new ParticleSystem[1] { transform.GetComponent<ParticleSystem>() };
                }
                for (int i = 0; i < psArray.Length; i++)
                {
                    if (psArray[i].main.loop)
                    {
                        Loop = true;
                        break;
                    }
                    float time = psArray[i].main.startDelayMultiplier + psArray[i].main.duration + psArray[i].main.startLifetimeMultiplier;
                    if (LifeTime < time)
                        LifeTime = time;
                }
                if (Loop)
                    ParticleLifeTimeDic.Add(name, 1000);
                else
                    ParticleLifeTimeDic.Add(name, LifeTime);
            }
            var main = MyParticle.main;
            if (!Loop) main.duration = LifeTime + 0.1f;
            if (playOnAwake)
                MyParticle.Play();
        }

        void OnDisable()
        {
            if (MyParticle == null)
                return;
            CurParticleTime = MyParticle.time;
            if (!Loop)
                if (CurParticleTime >= LifeTime)
                {
                    Destroy(gameObject);
                    //CurParticleTime = LifeTime;
                }
            DisableAudio();
        }
        void DisableAudio()
        {
            MyAudios = GetComponentsInChildren<AudioSource>(true);
            if (MyAudios != null)
            {
                for (int i = 0; i < MyAudios.Length; i++)
                {
                    MyAudios[i].enabled = false;
                }
            }
        }
        void OnEnable()
        {
            if (MyParticle == null)
                return;
            if (MyAudios != null)
                foreach (AudioSource source in MyAudios)
                    if (source) source.enabled = true;
            if (Loop || CurParticleTime < LifeTime)
            {
                MyParticle.Simulate(CurParticleTime);
                MyParticle.Play();
            }
        }
        void Update()
        {
            if (Loop)
                return;
            if (!MyParticle)
                return;
            CurParticleTime = MyParticle.time;
            if (CurParticleTime >= LifeTime)
                Destroy(gameObject);
        }
        public static void SetParticlesDuration(ParticleSystem _ps, float _time)
        {
            ParticleSystem[] psArray = _ps.GetComponentsInChildren<ParticleSystem>();
            foreach (var i in psArray)
            {
                if (i.gameObject.activeInHierarchy)
                {
                    i.Stop();
                    var main = i.main;
                    main.duration = _time;
                    i.Simulate(0);
                    i.Play();
                }
            }
        }
        public static void SetIfEmit(ParticleSystem ps, bool _emit)
        {
            var emit = ps.emission;
            emit.enabled = _emit;
        }
        public void ActiveParticleGroup(bool _active, int _group)
        {
            if (ParticleGroups == null)
                return;
            if (_group < 0 || _group >= ParticleGroups.Count)
                return;
            if (ParticleGroups[_group] != null && ParticleGroups[_group].Count > 0)
            {
                for (int i = 0; i < ParticleGroups[_group].Count; i++)
                {
                    ParticleGroups[_group][i].gameObject.SetActive(_active);
                }
            }
        }
        public void SetIfEmitCertainParticles(bool _emit, sbyte _group)
        {
            if (ParticleGroups == null)
                return;
            if (_group < 0 || _group >= ParticleGroups.Count)
                return;
            if (ParticleGroups[_group] != null && ParticleGroups[_group].Count > 0)
            {
                for (int i = 0; i < ParticleGroups[_group].Count; i++)
                {
                    SetIfEmit(ParticleGroups[_group][i], _emit);
                }
            }
        }
    }
}
