using Fusion;
using Scoz.Func;
using Starbro.NeonIO;

namespace Neon.Networking
{
    // Kept in the match roster: death removes the live role's accessories.
    public struct ArenaAppearance : INetworkStruct
    {
        public int Head, Body, Back;
        public NetworkBool Captured;

        public static ArenaAppearance Capture(Role role) => new ArenaAppearance
        {
            Head = role.EquippedFeatureId(FeaturePart.Head),
            Body = role.EquippedFeatureId(FeaturePart.Body),
            Back = role.EquippedFeatureId(FeaturePart.Back),
            Captured = true
        };

        public bool SameAs(ArenaAppearance other) => Head == other.Head && Body == other.Body &&
            Back == other.Back && (bool)Captured == (bool)other.Captured;

        public bool IsValid => Captured && ValidPart(Head, FeaturePart.Head) &&
            ValidPart(Body, FeaturePart.Body) && ValidPart(Back, FeaturePart.Back);

        static bool ValidPart(int id, FeaturePart part) => id == 0 ||
            (GameDictionary.FeatureDic.TryGetValue(id, out var feature) && feature.MyFeaturePart == part);
    }
}
