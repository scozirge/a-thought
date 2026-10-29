using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Starbro.NeonIO;

namespace Scoz.Func
{
    public class SceneObj : MonoBehaviour
    {
        public bool IsFG;
        public bool ToTransparent = true;

        SpriteRenderer[] MySRs;
        Color[] originalColors;
        float targetVisibility = 1, visibility = 1;
        static Material nearCloud, farCloud;
        public bool StyledCloud { get; private set; }
        public float Visibility => visibility;

        private void Awake()
        {
            string scene = gameObject.scene.name;
            StyledCloud = (scene == "Battle" || scene == "Challenge") && name.StartsWith("Cloud", System.StringComparison.OrdinalIgnoreCase);
            if (IsFG || StyledCloud)
            {
                MySRs = GetComponentsInChildren<SpriteRenderer>();
                originalColors = new Color[MySRs.Length];
                for (int i = 0; i < MySRs.Length; i++)
                {
                    originalColors[i] = MySRs[i].color;
                    if (StyledCloud) MySRs[i].sharedMaterial = CloudMaterial(IsFG);
                }
            }

        }

        public void SetToTransparent(bool _bool)
        {
            if (!ToTransparent)
                return;
            if (MySRs == null)
                return;
            targetVisibility = _bool ? (StyledCloud ? .30f : .4f) : 1;
        }
        void Update()
        {
            if (MySRs == null || Mathf.Approximately(visibility, targetVisibility)) return;
            visibility = Mathf.MoveTowards(visibility, targetVisibility, Time.unscaledDeltaTime * 3.5f);
            for (int i = 0; i < MySRs.Length; i++)
            {
                Color color = originalColors[i]; color.a *= visibility;
                MySRs[i].color = color;
            }
        }
        static Material CloudMaterial(bool foreground)
        {
            if (foreground && nearCloud) return nearCloud;
            if (!foreground && farCloud) return farCloud;
            var material = new Material(Resources.Load<Shader>("Astral/CloudDepth"));
            material.name = foreground ? "Foreground clouds - gold ink" : "Background clouds - blue haze";
            material.SetColor("_Fill", foreground ? new Color(.075f,.12f,.19f) : new Color(.065f,.11f,.17f));
            material.SetColor("_Ink", foreground ? new Color(.68f,.59f,.39f) : new Color(.20f,.30f,.38f));
            material.SetFloat("_Opacity", foreground ? .94f : .48f);
            if (foreground) nearCloud = material; else farCloud = material;
            return material;
        }
    }
}
