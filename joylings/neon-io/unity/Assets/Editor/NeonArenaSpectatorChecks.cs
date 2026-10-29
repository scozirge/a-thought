using System;
using Neon.Networking;
using Neon.Astral;
using UnityEngine;
using UnityEngine.EventSystems;

namespace Neon.Editor
{
    public static class NeonArenaSpectatorChecks
    {
        public static void Run()
        {
            var state = new ArenaSpectatorState();
            int seats = (1 << 1) | (1 << 5) | (1 << 15) | (1 << 20);
            state.Synchronize(ArenaPhase.Running, false, false, seats);
            Require(!state.Begin(), "Living players must not spectate.");
            state.Synchronize(ArenaPhase.Running, true, true, seats);
            Require(state.CanWatch && !state.Watching, "Elimination must first show results.");
            Require(state.Begin() && state.TargetSlot == 1, "First valid seat was not selected.");
            state.Next(); Require(state.TargetSlot == 5, "Next seat not selected.");
            state.Next(); Require(state.TargetSlot == 15, "Last player seat not selected.");
            state.Next(); Require(state.TargetSlot == 1, "Cycle included a resource bot or failed to wrap.");
            state.Synchronize(ArenaPhase.Running, true, true, seats & ~(1 << 1));
            Require(state.Watching && state.TargetSlot == 5, "Death/disconnection did not advance automatically.");
            state.Synchronize(ArenaPhase.Running, true, true, 1 << 20);
            Require(state.Watching && state.TargetSlot == -1, "Unavailable role references must not be followed.");
            state.Next(); Require(state.TargetSlot == -1, "Empty target set must be safe to click.");
            state.Synchronize(ArenaPhase.Running, true, true, 1 << 7);
            Require(state.TargetSlot == 7, "Temporarily missing target did not recover.");
            state.Next(); Require(state.TargetSlot == 7, "Only remaining target must stay selected.");
            state.Stop(); Require(!state.Watching && state.TargetSlot == -1, "Returning to results did not stop spectating.");
            Require(state.Begin(), "Returning to results must allow watching again.");
            state.Synchronize(ArenaPhase.Finished, true, true, seats);
            Require(!state.Watching && !state.CanWatch && !state.Begin(), "Match finish must force final results.");
            state.Synchronize(ArenaPhase.Loading, false, false, 0);
            Require(!state.Watching && !state.CanWatch, "New match retained spectator state.");
            state.Synchronize(ArenaPhase.Running, true, false, seats);
            Require(!state.Begin(), "Winner or invalid result cannot enter spectating.");
            for (int slot = 0; slot < NeonArenaRules.PlayerSeats; slot++)
            {
                state.Synchronize(ArenaPhase.Running, true, true, 1 << slot);
                state.Begin();
                Require(state.TargetSlot == slot, "Seat cannot be observed: " + slot);
                state.Stop();
            }
            var input = new GameObject("Spectator input fixture");
            try
            {
                var click = input.AddComponent<AstralSpectatorClick>();
                int advances = 0; click.advance = () => advances++;
                click.OnPointerClick(new PointerEventData(null) { button = PointerEventData.InputButton.Right });
                click.OnPointerClick(new PointerEventData(null) { button = PointerEventData.InputButton.Middle });
                Require(advances == 0, "Only left clicks or primary touches may switch view.");
                click.OnPointerClick(new PointerEventData(null) { button = PointerEventData.InputButton.Left });
                Require(advances == 1, "Left click did not advance exactly once.");
            }
            finally { UnityEngine.Object.DestroyImmediate(input); }
            Debug.Log("NEON_ARENA_SPECTATOR_CHECKS_OK results/watch/finish transitions; all 16 seats; death/disconnect; empty and single target; resource-bot exclusion; pointer button filtering");
        }

        static void Require(bool ok, string message) { if (!ok) throw new InvalidOperationException(message); }
    }
}
