using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
namespace Scoz.Func
{
    public class PreLoad : MonoBehaviour
    {
        public Vector3 PreLoadPos;
        public float DestroyTime;
        public List<string> LoadFolderSprites;
        public List<string> LoadFolderParticles;
        public string PreloadDicTag;


        List<GameObject> GoList;
        public static Dictionary<string, bool> IsPreloadDic;
        WaitToDo<float> WaitToDestroy;

        void Awake()
        {
            if (PreloadDicTag != null && PreloadDicTag != "")
            {
                if (IsPreloadDic == null)
                    IsPreloadDic = new Dictionary<string, bool>();

                if (IsPreloadDic.ContainsKey(PreloadDicTag))
                    if (IsPreloadDic[PreloadDicTag])
                        return;
                PreLoadGameObject();
            }
            else
            {
                PreLoadGameObject();
            }
        }
        public void PreLoadGameObject()
        {
            GoList = new List<GameObject>();
            //Sprite資料夾
            for (int i = 0; i < LoadFolderSprites.Count; i++)
            {
                if (LoadFolderSprites[i] == "")
                    continue;
                Sprite[] sprites = Resources.LoadAll<Sprite>(LoadFolderSprites[i]);
                if (sprites != null)
                {
                    Debug.Log(string.Format("PreLoadSprite:{0}", sprites.Length));
                    for (int j = 0; j < sprites.Length; j++)
                    {
                        //SpriteRenderer
                        GameObject go = new GameObject();
                        SpriteRenderer sr = go.AddComponent<SpriteRenderer>();
                        sr.sprite = sprites[j];
                        GoList.Add(go);
                        //Image
                        GameObject go2 = new GameObject();
                        Image im = go2.AddComponent<Image>();
                        im.sprite = sprites[i];
                        GoList.Add(go2);
                    }
                }
            }
            //Particle資料夾
            for (int i = 0; i < LoadFolderParticles.Count; i++)
            {
                ParticleSystem[] particles = Resources.LoadAll<ParticleSystem>(LoadFolderParticles[i]);
                if (particles != null)
                {
                    Debug.Log(string.Format("PreLoadParticle:{0}", particles.Length));
                    for (int j = 0; j < particles.Length; j++)
                    {
                        ParticleSystem ps = Instantiate(particles[j], PreLoadPos, Quaternion.identity) as ParticleSystem;
                        if (ps)
                        {
                            ps.Play();
                        }
                        GoList.Add(ps.gameObject);
                    }
                }
            }
            for (int i = 0; i < GoList.Count; i++)
            {
                if (GoList[i] == null)
                    continue;
                GoList[i].transform.SetParent(transform);
                GoList[i].transform.position = PreLoadPos;
            }
            if (PreloadDicTag != null && PreloadDicTag != "")
            {
                if (!IsPreloadDic.ContainsKey(PreloadDicTag))
                    IsPreloadDic.Add(PreloadDicTag, true);
                else
                    IsPreloadDic[PreloadDicTag] = true;
            }
            WaitToDestroy = new WaitToDo<float>(DestroyTime, DestroyPreloadObjs, true);
        }
        void Update()
        {
            if (WaitToDestroy != null)
                WaitToDestroy.RunTimer();
        }
        void DestroyPreloadObjs()
        {
            for (int i = 0; i < GoList.Count; i++)
            {
                if (GoList[i] == null)
                    continue;
                Destroy(GoList[i]);
            }
        }
    }
}
