using Neon.Networking;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEngine;
using UnityEngine.UI;
using static Neon.Astral.AstralWidgets;

namespace Neon.Astral
{
    public sealed partial class AstralPresentation
    {
        void StartArena()
        {
            var original = Field<InputField>(lobby, "NameInputField");
            if (original && !string.IsNullOrWhiteSpace(original.text)) MyPlayer.SetName(original.text.Trim());
            NeonArenaFlow.Search();
        }
        void BuildArenaWaiting()
        {
            bool touch = TouchUI;
            if (touch) TouchHeader(L("競技模式", "ARENA"), NeonArenaFlow.Cancel);
            else Header(L("競技模式", "ARENA"), "", NeonArenaFlow.Cancel);
            float w = touch ? ViewWidth - 48 : 1100;
            var status = Text(page, "Arena queue", "", 0, touch ? 0 : 40, w, touch ? 44 : 70, touch ? 22 : 36, Gold, TextAnchor.MiddleCenter);
            Button(page, "Cancel arena", L("取消配對", "CANCEL SEARCH"), 0, touch ? TouchBottom + 34 : -110, touch ? 240 : 400, touch ? 44 : 68, NeonArenaFlow.Cancel, false, touch ? 16 : 26);
            live.Add(() =>
            {
                var match = NeonArena.Instance;
                status.text = match && match.Phase != ArenaPhase.Waiting
                    ? L("正在準備戰場…", "PREPARING THE ARENA…")
                    : L("配對中…", "MATCHMAKING…");
            });
        }
        void BuildArenaHud()
        {
            if (!NeonArenaFlow.Active) return;
            bool touch = TouchUI;
            var state = Text(page, "Arena state", "", 0, 0, touch ? Mathf.Clamp(ViewWidth - 440, 128, 250) : 600, touch ? 42 : 66, touch ? 14 : 24, Gold, TextAnchor.MiddleCenter);
            Pin(state.transform, new Vector2(.5f, 1), new Vector2(0, touch ? 12 : 24));
            live.Add(() =>
            {
                var match = NeonArena.Instance;
                if (!match || match.Phase == ArenaPhase.Loading) { state.text = L("準備戰場中…", "PREPARING ARENA…"); return; }

                state.text = L("存活 ", "ALIVE ") + match.Remaining + "/16  ·  " + L("縮圈 ", "ZONE ") + Mathf.CeilToInt(match.Radius) + "m";
                if (BattleManager.BM && BattleManager.BM.MyPlayerRole && ((Vector2)BattleManager.BM.MyPlayerRole.transform.position).magnitude > match.Radius)
                { state.color = new Color(1, .53f, .42f); state.text += "\n" + L("離開危險區！", "RETURN TO THE SAFE ZONE!"); }
                else state.color = Gold;
            });
        }
        void BuildArenaResult()
        {
            var match = NeonArena.Instance;
            if (!match || !match.HasLocalResult) return;
            match.SaveReward();
            var row = match.Entries[match.LocalSlot];
            bool touch = TouchUI;
            float w = touch ? Mathf.Min(ViewWidth - 32, 760) : 1200;
            float h = touch ? ViewHeight - 24 : 720;
            var panel = Plate(page, "Arena results", 0, 0, w, h).transform;
            Text(panel, "Placement", L("第 ", "#") + row.Rank + (Chinese ? " 名 / 16" : " / 16"), 0, h * .5f - (touch ? 34 : 90), w - 40, touch ? 44 : 100, touch ? 30 : 64, Gold, TextAnchor.MiddleCenter);
            Transform body = panel;
            if (touch)
            {
                float bodyHeight = Mathf.Max(44, h - 130);
                Scroll(panel, "Arena result details", 0, -1, w - 24, bodyHeight, out var content);
                content.sizeDelta = new Vector2(0, 144);
                body = Rect(content, "Result content", 0, -72, w - 24, 144); TopContent((RectTransform)body, -72);
            }
            string stats = L("擊殺 ", "KILLS ") + row.Kills + "     ·     " + L("造成傷害 ", "DAMAGE ") + row.Damage.ToString("N0");
            Text(body, "Arena statistics", stats, 0, touch ? 48 : 100, w - 40, touch ? 36 : 60, touch ? 18 : 32, Pearl, TextAnchor.MiddleCenter);
            int place = NeonArenaRules.PlacementReward(row.Rank), kills = NeonArenaRules.KillReward(row.Kills), damage = NeonArenaRules.DamageReward(row.Damage);
            Text(body, "Reward breakdown", L("名次 ", "PLACE ") + place + "  +  " + L("擊殺 ", "KILLS ") + kills + "  +  " + L("傷害 ", "DAMAGE ") + damage, 0, touch ? 6 : 0, w - 32, touch ? 36 : 54, touch ? 14 : 25, Muted, TextAnchor.MiddleCenter);
            Text(body, "Arena reward", "+ " + (place + kills + damage) + L(" 星幣", " STARS"), 0, touch ? -42 : -100, w - 40, touch ? 40 : 64, touch ? 24 : 38, Gold, TextAnchor.MiddleCenter);
            Button(panel, "Arena return", L("返回大廳", "RETURN TO LOBBY"), 0, -h * .5f + (touch ? 34 : 80), touch ? 260 : 440, touch ? 44 : 70, () => battle.LeaveRoom(), false, touch ? 16 : 28);
        }
    }
}
