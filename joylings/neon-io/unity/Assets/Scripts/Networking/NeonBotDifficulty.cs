namespace Neon.Networking
{
    public readonly struct NeonBotDifficulty
    {
        public readonly int Tier;
        public readonly float Decision, Scan, Turn, Sight, Stars, Retreat, Margin, Lead, AimError, LookAhead;
        NeonBotDifficulty(int tier, float decision, float scan, float turn, float stars, float retreat,
            float margin, float lead, float error, float lookAhead)
        {
            Tier = tier; Decision = decision; Scan = scan; Turn = turn; Sight = 1200; Stars = stars;
            Retreat = retreat; Margin = margin; Lead = lead; AimError = error; LookAhead = lookAhead;
        }
        public static int TierFor(int rating) => rating < 1000 ? 0 : rating < 1600 ? 1 : 2;
        public static NeonBotDifficulty For(int rating)
        {
            switch (TierFor(rating))
            {
                case 0: return new NeonBotDifficulty(0, .65f, .28f, 240, 650, .20f, 100, .15f, 12, 1);
                case 1: return new NeonBotDifficulty(1, .35f, .18f, 300, 850, .25f, 160, .65f, 7, 3);
                default:return new NeonBotDifficulty(2, .22f, .13f, 360, 1000, .30f, 220, .9f, 3, 5);
            }
        }
    }
}
