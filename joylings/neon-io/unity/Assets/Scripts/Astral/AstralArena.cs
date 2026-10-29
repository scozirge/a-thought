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
            float bodyTop = touch ? TouchTop - 78 : 250, bodyBottom = touch ? TouchBottom + 70 : -180;
            float space = bodyTop - bodyBottom;
            var status = Text(page, "Arena queue", "", 0, bodyTop - (touch ? 18 : 40), w, touch ? 36 : 70, touch ? 18 : 36, Gold, TextAnchor.MiddleCenter);
            float iconHeight = touch ? Mathf.Clamp((space - 52) * .5f, 16, 54) : 80;
            float pitchX = touch ? Mathf.Min((ViewWidth - 64) / 8, 60) : 104;
            float pitchY = iconHeight + (touch ? 8 : 24);
            float centerY = (bodyTop + bodyBottom) * .5f - 22;
            var seats = new AstralSeatIcon[NeonArenaRules.PlayerSeats];
            for (int i = 0; i < seats.Length; i++)
            {
                var icon = Rect(page, "Arena seat " + i, (i % 8 - 3.5f) * pitchX, centerY + (.5f - i / 8) * pitchY, iconHeight * .78f, iconHeight).gameObject.AddComponent<AstralSeatIcon>();
                icon.raycastTarget = false; seats[i] = icon;
            }
            Button(page, "Cancel arena", L("離開配對", "LEAVE MATCHMAKING"), 0, touch ? TouchBottom + 34 : -280, touch ? 260 : 400, touch ? 48 : 68, NeonArenaFlow.Cancel, false, touch ? 16 : 26);
            live.Add(() =>
            {
                var match = NeonArena.Instance;
                status.text = match && match.Phase != ArenaPhase.Waiting
                    ? L("正在準備戰場…", "PREPARING THE ARENA…")
                    : L("配對中…", "MATCHMAKING…");
                // Slow breathing keeps the status alive without harsh flashing.
                var color = Gold; color.a = .5f + .5f * (.5f + .5f * Mathf.Sin(Time.unscaledTime * Mathf.PI * 1.1f)); status.color = color;
                int filled = NeonArenaFlow.QueueFilled;
                for (int i = 0; i < seats.Length; i++) seats[i].Filled = i < filled;
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

                state.text = L("存活 ", "ALIVE ") + match.Remaining + "/16  ·  " + L("安全區 ", "SAFE ZONE ") + Mathf.CeilToInt(match.Radius) + "m";
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
            var layout = new ArenaResultLayout(TouchUI, ViewWidth, ViewHeight);
            BuildArenaResultContent(layout, row, NeonArenaRating.LastDelta, match.LocalSlot, rank =>
            {
                var current = NeonArena.Instance;
                if (current)
                    for (int i = 0; i < NeonArenaRules.PlayerSeats; i++)
                        if (current.Entries[i].Rank == rank) return (i, current.Entries[i]);
                return (-1, default);
            }, () => battle.LeaveRoom(), match.Phase == ArenaPhase.Running ?
                (UnityEngine.Events.UnityAction)(() => NeonArenaSpectator.Instance?.Begin()) : null);
        }

        void BuildArenaResultContent(ArenaResultLayout layout, ArenaEntry row, int ratingDelta, int localSlot,
            System.Func<int, (int slot, ArenaEntry entry)> standing, UnityEngine.Events.UnityAction leave,
            UnityEngine.Events.UnityAction watch)
        {
            bool touch = layout.Touch;
            float w = layout.Width, h = layout.Height, inner = layout.InnerWidth;
            var panel = Plate(page, "Arena results", 0, 0, w, h, false, true).transform;
            Text(panel, "Results heading", L("對戰結算", "MATCH RESULTS"), 0, h * .5f - layout.Header * .5f,
                inner, layout.Header, touch ? 19 : 30, Pearl, TextAnchor.MiddleCenter);
            float bodyCenter = h * .5f - layout.Header - layout.Viewport * .5f;
            RectTransform body;
            ScrollRect resultScroll = null;
            if (layout.Scrolls)
            {
                var scroll = Scroll(panel, "Arena result details", 0, bodyCenter, w - 8, layout.Viewport, out var content);
                resultScroll = scroll;
                scroll.GetComponent<Image>().color = Color.clear;
                content.sizeDelta = new Vector2(0, layout.Content);
                body = Rect(content, "Results content", 0, -layout.Content * .5f, inner, layout.Content);
                TopContent(body, -layout.Content * .5f);
            }
            else body = Rect(panel, "Results content", 0, bodyCenter, inner, layout.Content);

            float top = layout.Content * .5f;
            int[] order = { 2, 1, 3 };
            for (int i = 0; i < order.Length; i++)
                BuildArenaPodium(body, order[i], (i - 1) * inner / 3, top - layout.Podium * .5f,
                    inner / 3 - (touch ? 8 : 24), layout.Podium, touch, localSlot, standing);

            float statsTop = top - layout.Podium - layout.Gap;
            Graphic(body, "Stats divider", 0, statsTop, inner, 1, AstralGraphic.Shape.Rule, new Color(Gold.r, Gold.g, Gold.b, .4f));
            string[] labels = { L("名次", "PLACE"), L("擊殺數", "KILLS"), L("傷害", "DAMAGE"), L("吸收星數", "STARS COLLECTED") };
            string[] values = { L("第 ", "#") + row.Rank + L(" 名", ""), row.Kills.ToString("N0"), row.Damage.ToString("N0"), row.Stars.ToString("N0") };
            int columns = layout.Narrow ? 2 : 4;
            float cellWidth = inner / columns, cellHeight = layout.Stats / (layout.Narrow ? 2 : 1);
            for (int i = 0; i < labels.Length; i++)
            {
                float x = (i % columns - (columns - 1) * .5f) * cellWidth;
                float y = statsTop - (i / columns + .5f) * cellHeight;
                Text(body, "Stat label " + i, labels[i], x, y + (touch ? 16 : 29), cellWidth - 8,
                    touch ? 22 : 30, touch ? 12 : 20, Muted, TextAnchor.MiddleCenter);
                Text(body, "Stat value " + i, values[i], x, y - (touch ? 12 : 16), cellWidth - 8,
                    touch ? 34 : 60, touch ? 22 : 40, i == 0 ? Gold : Pearl, TextAnchor.MiddleCenter);
            }

            float rewardY = -layout.Content * .5f + layout.Rewards * .5f;
            var rewards = Plate(body, "Rewards", 0, rewardY, inner, layout.Rewards);
            rewards.color = new Color(Deep.r, Deep.g, Deep.b, .5f);
            rewards.border = new Color(Gold.r, Gold.g, Gold.b, .22f);
            int coins = NeonArenaRules.Reward(row.Rank, row.Kills, row.Damage);
            ArenaReward(rewards.transform, L("獲得星幣", "COINS EARNED"), "+" + coins.ToString("N0"), -inner * .25f, inner * .5f - 12, touch, Gold);
            ArenaReward(rewards.transform, L("積分", "RATING"), (ratingDelta > 0 ? "+" : "") + ratingDelta.ToString("N0"), inner * .25f, inner * .5f - 12, touch, ratingDelta < 0 ? Red : Teal);
            float actionY = -h * .5f + layout.Footer * .5f;
            float actionGap = touch ? 12 : 24;
            float actionWidth = watch != null ? Mathf.Min(touch ? 260 : 340, (inner - actionGap) * .5f) : Mathf.Min(touch ? 260 : 340, inner);
            float actionX = watch != null ? (actionWidth + actionGap) * .5f : 0;
            if (watch != null)
                Button(panel, "Arena watch", L("查看戰場", "WATCH BATTLE"), -actionX, actionY,
                    actionWidth, touch ? 44 : 64, watch, true, touch ? 15 : 25);
            var returnButton = Button(panel, "Arena return", L("返回大廳", "RETURN TO LOBBY"), actionX, actionY,
                actionWidth, touch ? 44 : 64, leave, false, touch ? 15 : 25);
            // Keep both actions fully visible even in the narrowest translated layout.
            var returnLabel = returnButton.GetComponentInChildren<Text>();
            returnLabel.resizeTextForBestFit = true; returnLabel.resizeTextMinSize = touch ? 11 : 20;
            returnLabel.resizeTextMaxSize = touch ? 15 : 25;
            if (resultScroll)
            {
                Canvas.ForceUpdateCanvases();
                resultScroll.StopMovement();
                resultScroll.verticalNormalizedPosition = 1;
            }
        }

        void ArenaReward(Transform parent, string label, string value, float x, float width, bool touch, Color color)
        {
            Text(parent, label, label, x, touch ? 18 : 22, width, touch ? 20 : 30, touch ? 12 : 20, Muted, TextAnchor.MiddleCenter);
            Text(parent, label + " value", value, x, touch ? -10 : -18, width, touch ? 36 : 52, touch ? 23 : 34, color, TextAnchor.MiddleCenter);
        }

        void BuildArenaPodium(Transform parent, int rank, float x, float y, float width, float height, bool touch,
            int localSlot, System.Func<int, (int slot, ArenaEntry entry)> standing)
        {
            var card = Rect(parent, "Podium " + rank, x, y, width, height);
            float nameHeight = touch ? 24 : 38, rankHeight = touch ? 28 : 46;
            float baseline = -height * .5f + nameHeight + rankHeight + (touch ? 4 : 12);
            float available = height - nameHeight - rankHeight - (touch ? 10 : 28);
            float size = rank == 1 ? 1 : rank == 2 ? .84f : .70f;
            var avatarRect = Rect(card, "Final accessories", 0, baseline + available * size * .5f, width * size, available * size);
            var avatar = avatarRect.gameObject.AddComponent<AstralArenaAvatar>();
            var pending = Text(card, "Pending", L("待揭曉", "PENDING"), 0, baseline + available * .4f, width, touch ? 26 : 40,
                touch ? 14 : 24, Muted, TextAnchor.MiddleCenter);
            Text(card, "Rank", L("第 ", "#") + rank + L(" 名", ""), 0, -height * .5f + nameHeight + rankHeight * .5f,
                width, rankHeight, touch ? (rank == 1 ? 18 : 15) : (rank == 1 ? 32 : 25), rank == 1 ? Gold : Pearl, TextAnchor.MiddleCenter);
            var name = Text(card, "Player", "—", 0, -height * .5f + nameHeight * .5f, width, nameHeight,
                touch ? 13 : 23, Muted, TextAnchor.MiddleCenter);
            name.supportRichText = false;
            name.horizontalOverflow = HorizontalWrapMode.Wrap;
            name.resizeTextForBestFit = true;
            name.resizeTextMinSize = touch ? 11 : 16;
            name.resizeTextMaxSize = touch ? 13 : 23;
            Graphic(card, "Podium line", 0, baseline - (touch ? 2 : 7), width * .75f, 1, AstralGraphic.Shape.Rule,
                new Color(Gold.r, Gold.g, Gold.b, rank == 1 ? .8f : .3f));
            int lastSlot = -1;
            ArenaAppearance lastAppearance = default;
            live.Add(() =>
            {
                var (slot, winner) = standing(rank);
                if (slot < 0) return;
                if (lastSlot == slot && lastAppearance.SameAs(winner.Appearance)) return;
                lastSlot = slot; lastAppearance = winner.Appearance;
                pending.gameObject.SetActive(!winner.Appearance.Captured);
                if (!winner.Appearance.Captured) pending.text = L("載入中…", "LOADING…");
                avatar.Show(winner.Appearance);
                name.text = winner.Name.ToString();
                name.color = slot == localSlot ? Gold : Muted;
            });
        }
    }
}
