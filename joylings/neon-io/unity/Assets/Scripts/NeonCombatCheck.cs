using System;
using System.Collections;
using System.Linq;
using Neon.Networking;
using Starbro.NeonIO;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Neon.Validation
{
    // Only attached by the explicit -neonCombatCheck test command.
    public sealed class NeonCombatCheck : MonoBehaviour
    {
        [Serializable] public sealed class Result
        {
            public bool passed, damage, lifeSteal, immortal, death, singleKill, challengeResult, lateDeathDidNotFlipResult;
            public int damagedHealth, attackerAfterHealing, protectedHealth, finalVictimHealth, kills, observedPlayers;
            public string failure;
        }
        public readonly Result result = new Result();
        PlayerRole local, attacker, victim;
        bool active;
        IEnumerator At(double moment) { while (PhotonNetwork.Time < moment) yield return null; }
        public IEnumerator Run()
        {
            float timeout = Time.realtimeSinceStartup + 25;
            PlayerRole[] players;
            do
            {
                players = Object.FindObjectsByType<PlayerRole>(FindObjectsSortMode.None);
                if (players.Length >= 2 && players.All(p => p.IsInitialized)) break;
                yield return null;
            } while (Time.realtimeSinceStartup < timeout);
            if (players.Length != 2) { result.failure = "Combat check requires exactly two initialized players."; yield break; }
            result.observedPlayers = players.Length;
            local = players.Single(p => p.photonView.IsMine);
            attacker = players.Single(p => p.photonView.Owner.ActorNumber == PhotonNetwork.MasterClient.ActorNumber);
            victim = players.Single(p => p != attacker);
            active = true;
            bool challenge = PhotonLauncher.SelectGameType == GameType.Challenge;
            if (!challenge) BattleManager.BM.enabled = false;
            local.RemoveSkill(); local.RemoveFeature(); local.RemoveAllBuffer();
            local.BaseMoveSpeed = 0;
            local.Health = local == attacker ? 500 : 1000;
            local.transform.position = local == attacker ? new Vector3(-200, 0, 0) : new Vector3(200, 0, 0);
            PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable { ["validationReady"] = true });
            timeout = Time.realtimeSinceStartup + 15;
            while (PhotonNetwork.PlayerList.Any(p => !Equals(p.CustomProperties["validationReady"], true)) && Time.realtimeSinceStartup < timeout) yield return null;
            if (PhotonNetwork.PlayerList.Any(p => !Equals(p.CustomProperties["validationReady"], true))) { result.failure = "Combat setup timed out."; yield break; }
            if (PhotonNetwork.IsMasterClient) PhotonNetwork.LocalPlayer.SetCustomProperties(new Neon.Networking.Hashtable { ["validationStart"] = PhotonNetwork.Time + 3 });
            while (!PhotonNetwork.MasterClient.CustomProperties.ContainsKey("validationStart") && Time.realtimeSinceStartup < timeout) yield return null;
            if (!PhotonNetwork.MasterClient.CustomProperties.ContainsKey("validationStart")) { result.failure = "Combat clock timed out."; yield break; }
            double epoch = Convert.ToDouble(PhotonNetwork.MasterClient.CustomProperties["validationStart"]);
            yield return At(epoch);
            if (attacker == local) victim.SendNetworkHit(attacker, 50, Vector2.zero, "", victim.transform.position, null, 0, .5f);
            yield return At(epoch + 1.5);
            result.damagedHealth = victim.Health;
            result.attackerAfterHealing = attacker.Health;
            result.damage = victim.Health == 950;
            result.lifeSteal = attacker.Health == 525;
            yield return At(epoch + 2);
            if (victim == local) victim.AddBuffer(RoleBuffer.Immortal, 10);
            yield return At(epoch + 3);
            if (attacker == local) victim.SendNetworkHit(attacker, 50, Vector2.zero, "", victim.transform.position, null, 0, .5f);
            yield return At(epoch + 4.5);
            result.protectedHealth = victim.Health;
            result.immortal = victim.Health == 950 && victim.IsAlive && attacker.Health == 525;
            yield return At(epoch + 5);
            if (victim == local) victim.RemoveBufferByTypes(RoleBuffer.Immortal);
            yield return At(epoch + 6);
            if (attacker == local) victim.SendNetworkHit(attacker, 2000, Vector2.zero, "", victim.transform.position, null, 0, .5f);
            if (challenge)
            {
                yield return At(epoch + 6.75);
                result.challengeResult = BattleManager.BM.MatchEnded && BattleManager.BM.IsWin == (attacker == local);
                // A second confirmed death arrives inside the original 1.5 second settlement delay.
                // It must never reverse the already published master result.
                if (attacker == local) attacker.Health = 0;
            }
            yield return At(epoch + 8);
            result.finalVictimHealth = victim.Health;
            result.death = !victim.IsAlive && victim.Health == 0;
            result.kills = Convert.ToInt32(attacker.photonView.Owner.CustomProperties[PunCustomProp.Kills.ToString()]);
            result.singleKill = result.kills == 1;
            result.passed = result.damage && result.lifeSteal && result.immortal && result.death && result.singleKill;
            if (challenge)
            {
                result.lateDeathDidNotFlipResult = BattleManager.BM.MatchEnded && BattleManager.BM.IsWin == (attacker == local);
                result.passed &= result.challengeResult && result.lateDeathDidNotFlipResult;
            }
            result.failure = result.passed ? "" : "Damage, life-steal, immunity, death or single-kill assertion failed.";
        }
        void FixedUpdate()
        {
            if (!active) return;
            foreach (var role in Object.FindObjectsByType<Role>(FindObjectsSortMode.None))
            {
                foreach (var collider in role.GetComponentsInChildren<Collider2D>()) collider.enabled = false;
                if (role.MyRigi != null) role.MyRigi.linearVelocity = Vector2.zero;
                if (role is NeutralRole) role.enabled = false;
            }
        }
    }
}
