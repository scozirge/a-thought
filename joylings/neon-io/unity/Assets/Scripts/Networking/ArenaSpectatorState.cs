namespace Neon.Networking
{
    // Local presentation state only. No player authority, rewards or match rules change.
    public sealed class ArenaSpectatorState
    {
        public bool CanWatch { get; private set; }
        public bool Watching { get; private set; }
        public int TargetSlot { get; private set; } = -1;
        int available;

        public void Synchronize(ArenaPhase phase, bool hasResult, bool eliminated, int availableSeats)
        {
            CanWatch = phase == ArenaPhase.Running && hasResult && eliminated;
            available = availableSeats & ((1 << NeonArenaRules.PlayerSeats) - 1);
            if (!CanWatch) { Stop(); return; }
            if (Watching && (TargetSlot < 0 || (available & (1 << TargetSlot)) == 0)) Next();
        }

        public bool Begin()
        {
            if (!CanWatch) return false;
            Watching = true;
            TargetSlot = NextSlot(-1, available);
            return true;
        }
        public void Next() { if (Watching) TargetSlot = NextSlot(TargetSlot, available); }
        public void Stop() { Watching = false; TargetSlot = -1; }

        static int NextSlot(int current, int seats)
        {
            for (int offset = 1; offset <= NeonArenaRules.PlayerSeats; offset++)
            {
                int slot = (current + offset) % NeonArenaRules.PlayerSeats;
                if ((seats & (1 << slot)) != 0) return slot;
            }
            return -1;
        }
    }
}
