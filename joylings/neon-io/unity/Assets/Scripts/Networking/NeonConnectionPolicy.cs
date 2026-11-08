using Fusion;

namespace Neon.Networking
{
    // Pure decisions shared by the live startup flow and editor regression fixtures.
    public static class NeonConnectionPolicy
    {
        public const float ConnectSeconds = 45, MatchObjectSeconds = 15, BattleSeconds = 70;
        public static bool RetryArenaRoom(ShutdownReason reason, bool randomArena, int retries, bool cancelled)
            => randomArena && !cancelled && retries < 2 &&
                (reason == ShutdownReason.GameClosed || reason == ShutdownReason.GameIsFull || reason == ShutdownReason.GameNotFound);

        public static bool RosterReady(bool matchExists, ArenaPhase phase, bool hasSeat)
            => matchExists && phase >= ArenaPhase.Loading && hasSeat;

        public static bool RosterRejected(bool matchExists, ArenaPhase phase, bool hasSeat)
            => matchExists && phase >= ArenaPhase.Loading && !hasSeat;

        public static float StageTimeout(string stage)
            => stage == "connecting" ? ConnectSeconds : stage == "waiting-match" ? MatchObjectSeconds :
                stage == "queue" ? NeonArenaRules.QueueSeconds + 15 : BattleSeconds;
    }
}
