using UnityEngine;

namespace Neon.Astral
{
    // Values are canvas units: CSS pixels on touch, reference-resolution units on desktop.
    public readonly struct ArenaResultLayout
    {
        public readonly bool Touch, Narrow;
        public readonly float Width, Height, Padding, Header, Footer, Viewport, Content, Podium, Stats, Rewards, Gap;
        public float InnerWidth => Width - Padding * 2;
        public bool Scrolls => Content > Viewport + .5f;
        public ArenaResultLayout(bool touch, float width, float height)
        {
            Touch = touch;
            Width = touch ? Mathf.Min(width - 24, 900) : 1200;
            Height = touch ? Mathf.Min(height - 16, 520) : 850;
            Narrow = touch && Width < 520;
            Padding = touch ? 12 : 44;
            Header = touch ? 34 : 70;
            Footer = touch ? 56 : 100;
            Gap = touch ? 8 : 20;
            Stats = touch ? (Narrow ? 116 : 66) : 108;
            Rewards = touch ? 60 : 88;
            Viewport = Mathf.Max(48, Height - Header - Footer - Gap);
            Content = Mathf.Max(Viewport, touch ? (Narrow ? 380 : 276) : 590);
            Podium = Content - Stats - Rewards - Gap * 2;
        }
    }
}
