using UnityEngine;
using UnityEngine.UI;

namespace Neon.Astral
{
    public static class GodAppearance
    {
        public static void Apply(Transform root)
        {
            LayerHead(root);
            foreach(var image in root.GetComponentsInChildren<Image>(true))
                if(image.name=="health")
                {
                    // Replace the original huge red disc with a quiet, useful health line.
                    image.sprite=AstralWidgets.Solid;image.preserveAspect=false;
                    image.type=Image.Type.Filled;image.fillMethod=Image.FillMethod.Horizontal;image.fillOrigin=0;
                    image.color=new Color(.57f,.78f,.79f,.75f);image.raycastTarget=false;
                    image.rectTransform.localScale=Vector3.one;image.rectTransform.sizeDelta=new Vector2(360,10);
                    image.rectTransform.anchoredPosition=new Vector2(0,-580);
                }
            foreach(var sprite in root.GetComponentsInChildren<SpriteRenderer>(true))
            {
                if(sprite.name=="healthBottom"||sprite.name=="healthFrame")sprite.enabled=false;
            }
        }
        public static void LayerHead(Transform root)
        {
            foreach(var head in root.GetComponentsInChildren<SpriteRenderer>(true))
            {
                if(!head.sprite||head.sprite.name!="head"||!head.transform.parent)continue;
                int highest=int.MinValue;
                var parts=head.transform.parent.GetComponentsInChildren<SpriteRenderer>(true);
                foreach(var part in parts)
                    if(part!=head&&part.sortingLayerID==head.sortingLayerID&&(!part.sprite||part.sprite.name!="star"))highest=Mathf.Max(highest,part.sortingOrder);
                if(highest==int.MinValue)continue;
                foreach(var part in parts)
                    if(part.sprite&&part.sprite.name=="star"&&part.sortingLayerID==head.sortingLayerID)part.sortingOrder=highest+1;
                head.sortingOrder=highest+2;
            }
        }
    }
}
