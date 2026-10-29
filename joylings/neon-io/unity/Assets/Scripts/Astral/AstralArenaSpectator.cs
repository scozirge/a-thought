using Neon.Networking;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using static Neon.Astral.AstralWidgets;

namespace Neon.Astral
{
    public sealed partial class AstralPresentation
    {
        void BuildArenaExit(bool touch, UnityEngine.Events.UnityAction leave)
        {
            float size = touch ? 44 : 58, edge = touch ? 12 : 24;
            var exit = IconButton(page, "Arena exit", AstralGraphic.Shape.Exit,
                -page.rect.width * .5f + edge + size * .5f, page.rect.height * .5f - edge - size * .5f, size, leave);
            Pin(exit.transform, new Vector2(0, 1), new Vector2(edge, edge));
            if (!touch) exit.gameObject.AddComponent<AstralHover>().content = () => L("返回大廳", "Return to lobby");
        }

        void BuildArenaSpectator()
        {
            bool touch = TouchUI;
            // Behind all controls: UI clicks never also advance the observed player.
            var field = Scrim(page, "Spectator battlefield input", Color.clear);
            field.gameObject.AddComponent<AstralSpectatorClick>().advance = () => NeonArenaSpectator.Instance?.Next();
            BuildArenaExit(touch, () => battle.LeaveRoom());
            float width = touch ? Mathf.Max(120, ViewWidth - 144) : 840;
            var target = HudText(page, "Spectating player", "", 0, 0, width, touch ? 44 : 64,
                touch ? 17 : 28, Pearl, TextAnchor.MiddleCenter);
            target.supportRichText = false;
            target.resizeTextForBestFit = true; target.resizeTextMinSize = touch ? 12 : 20; target.resizeTextMaxSize = touch ? 17 : 28;
            Pin(target.transform, new Vector2(.5f, 1), new Vector2(0, touch ? 12 : 24));
            var remaining = HudText(page, "Spectator remaining", "", 0, 0, touch ? 96 : 180, touch ? 30 : 44,
                touch ? 14 : 22, Gold, TextAnchor.MiddleRight);
            Pin(remaining.transform, Vector2.one, new Vector2(touch ? 12 : 24, touch ? 64 : 100));
            var hint = HudText(page, "Spectator controls", touch ? L("點擊戰場切換玩家", "Tap the battlefield to switch players") :
                L("滑鼠左鍵切換玩家", "Left-click to switch players"), 0, 0, touch ? Mathf.Max(120, ViewWidth - 184) : 700,
                touch ? 44 : 48, touch ? 12 : 20, Muted, TextAnchor.MiddleLeft);
            Pin(hint.transform, Vector2.zero, new Vector2(touch ? 16 : 28, touch ? 12 : 24));
            var result = Button(page, "Spectator results", L("查看結算", "RESULTS"), 0, 0,
                touch ? 128 : 200, touch ? 44 : 56, () => NeonArenaSpectator.Instance?.ShowResult(), false, touch ? 15 : 24);
            Pin(result.transform, new Vector2(1, 0), new Vector2(touch ? 12 : 24, touch ? 12 : 24));
            live.Add(() =>
            {
                var spectator = NeonArenaSpectator.Instance;
                string name = spectator ? spectator.TargetName : "";
                target.text = string.IsNullOrEmpty(name) ? L("正在切換視角…", "SWITCHING VIEW…") : L("觀戰 · ", "WATCHING · ") + name;
                var match = NeonArena.Instance;
                remaining.text = match ? L("存活 ", "ALIVE ") + match.Remaining + "/16" : "";
            });
        }
    }

    public sealed class AstralSpectatorClick : MonoBehaviour, IPointerClickHandler
    {
        public System.Action advance;
        public void OnPointerClick(PointerEventData eventData)
        {
            if (eventData.button != PointerEventData.InputButton.Left || !NeonWebBridge.InputAvailable) return;
            advance?.Invoke();
        }
    }
}
