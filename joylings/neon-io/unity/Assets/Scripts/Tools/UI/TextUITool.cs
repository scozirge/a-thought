using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
namespace Scoz.Func
{
    public class TextUITool
    {
        public static float GetLineHeight(Text text)
        {
            Canvas.ForceUpdateCanvases();
            var extents = text.cachedTextGenerator.rectExtents.size * 0.5f;
            var lineHeight = text.cachedTextGeneratorForLayout.GetPreferredHeight("A", text.GetGenerationSettings(extents));
            lineHeight *= text.cachedTextGenerator.lineCount;
            return lineHeight;
        }
    }
}
