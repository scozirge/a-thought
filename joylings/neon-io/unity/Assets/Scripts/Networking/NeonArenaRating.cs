using System;
using System.Collections.Generic;
using UnityEngine;
using Prefs = Neon.ProfilePreferences;

namespace Neon.Networking
{
    public static class NeonArenaRating
    {
        public const int Initial = 1000, Maximum = 100000;
        internal static string StorageKey = "Neon.Arena.RatingProfile.v1";
        [Serializable] public sealed class Profile
        {
            public int rating = Initial, lastDelta;
            public string lastMatch = "", pendingMatch = "";
            public int pendingLoss;
        }
        static Profile Read()
        {
            string data = Prefs.GetString(StorageKey, "");
            try { return string.IsNullOrEmpty(data) ? new Profile() : JsonUtility.FromJson<Profile>(data) ?? new Profile(); }
            catch { return new Profile(); }
        }
        static void Write(Profile profile) { Prefs.SetString(StorageKey, JsonUtility.ToJson(profile)); Prefs.Save(); }
        public static int Current => Mathf.Clamp(Read().rating, 0, Maximum);
        public static int LastDelta => Read().lastDelta;
        public static int BaseDelta(int rank)
        {
            if (rank < 1 || rank > 16) return 0;
            if (rank <= 3) return rank == 1 ? 30 : rank == 2 ? 20 : 10;
            return rank <= 6 ? -5 : rank <= 10 ? -10 : rank <= 15 ? -15 : -20;
        }
        // Placement determines the sign. Elo-style expected strength adjusts only the magnitude.
        public static int Delta(int rank, int own, IList<int> humanOpponents)
        {
            int basis = BaseDelta(rank);
            if (basis == 0 || humanOpponents == null || humanOpponents.Count == 0) return basis;
            double expected = 0;
            foreach (int opponent in humanOpponents)
                expected += 1 / (1 + Math.Pow(10, (Math.Clamp(opponent, 0, Maximum) - Math.Clamp(own, 0, Maximum)) / 400.0));
            expected /= humanOpponents.Count;
            double factor = Math.Clamp(basis > 0 ? 2 * (1 - expected) : 2 * expected, .5, 1.5);
            return Math.Sign(basis) * Math.Max(1, (int)Math.Round(Math.Abs(basis) * factor, MidpointRounding.AwayFromZero));
        }
        public static void Begin(string match, int loss)
        {
            var p = Read();
            if (p.lastMatch == match || p.pendingMatch == match) return;
            RecoverAbandoned(); p = Read();
            p.pendingMatch = match; p.pendingLoss = Math.Min(-1, loss); Write(p);
        }
        public static void Complete(string match, int delta)
        {
            var p = Read(); if (p.lastMatch == match) return;
            int before = Mathf.Clamp(p.rating, 0, Maximum);
            p.rating = Mathf.Clamp(before + delta, 0, Maximum); p.lastDelta = p.rating - before;
            p.lastMatch = match; p.pendingMatch = ""; p.pendingLoss = 0; Write(p);
        }
        public static void RecoverAbandoned()
        {
            var p = Read();
            if (!string.IsNullOrEmpty(p.pendingMatch)) Complete(p.pendingMatch, p.pendingLoss);
        }
    }
}
