using UnityEngine;
using UnityEngine.UI;

namespace Neon.Astral
{
    // Render the original rigged guardian, with its original animation, into UI.
    public sealed class AstralPortrait : MonoBehaviour
    {
        public Transform source;GameObject model,stage;Camera portraitCamera;RenderTexture target;SpriteRenderer[] sprites;Material material;
        void Start()
        {
            if(!source)return;
            stage=new GameObject("Portrait stage");stage.transform.position=new Vector3(10000,10000,0);
            model=Instantiate(source.gameObject,stage.transform,false);model.name="Astral original guardian";model.transform.localPosition=Vector3.zero;model.transform.localScale=Vector3.one;model.SetActive(true);
            foreach(var t in model.GetComponentsInChildren<Transform>(true))t.gameObject.layer=31;
            foreach(var particles in model.GetComponentsInChildren<ParticleSystem>())particles.gameObject.SetActive(false);
            var renderers=model.GetComponentsInChildren<SpriteRenderer>();sprites=renderers;if(renderers.Length==0)return;
            var bounds=renderers[0].bounds;foreach(var r in renderers)bounds.Encapsulate(r.bounds);
            target=new RenderTexture(1024,1024,16,RenderTextureFormat.ARGB32){name="Original guardian portrait"};target.Create();
            portraitCamera=new GameObject("Portrait camera").AddComponent<Camera>();portraitCamera.transform.position=new Vector3(bounds.center.x,bounds.center.y,-100);portraitCamera.orthographic=true;portraitCamera.orthographicSize=Mathf.Max(bounds.extents.x,bounds.extents.y)*1.08f;
            portraitCamera.clearFlags=CameraClearFlags.SolidColor;portraitCamera.backgroundColor=Color.clear;portraitCamera.cullingMask=1<<31;portraitCamera.farClipPlane=200;portraitCamera.targetTexture=target;portraitCamera.allowHDR=false;
            var raw=gameObject.AddComponent<RawImage>();raw.texture=target;raw.raycastTarget=false;
            var shader=Resources.Load<Shader>("Astral/Guardian");if(shader){material=new Material(shader);raw.material=material;}
        }
        void LateUpdate()
        {
            if(!portraitCamera||sprites==null||sprites.Length==0)return;var bounds=sprites[0].bounds;foreach(var r in sprites)bounds.Encapsulate(r.bounds);
            portraitCamera.transform.position=new Vector3(bounds.center.x,bounds.center.y,bounds.center.z-100);portraitCamera.orthographicSize=Mathf.Max(bounds.extents.x,bounds.extents.y)*1.08f;
        }
        void OnDestroy(){if(stage)Destroy(stage);if(portraitCamera)Destroy(portraitCamera.gameObject);if(material)Destroy(material);if(target){target.Release();Destroy(target);}}
    }
}
