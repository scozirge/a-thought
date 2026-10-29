using System;
using System.Reflection;
using Neon.Networking;
using Scoz.Func;
using Starbro.NeonIO;
using UnityEditor;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Neon.Editor
{
    // Edit-mode fixtures only; this never starts a Photon runner or a match.
    public static class NeonLootCursorChecks
    {
        const BindingFlags Private = BindingFlags.Instance | BindingFlags.NonPublic;
        public static void Run()
        {
            NeonBuild.Validate();
            CheckLootReuse();
            CheckCursor();
            Debug.Log("NEON_LOOT_CURSOR_CHECKS_OK pooled particles cleared; inactive initial loot; pickup grace preserved; body-relative cursor; resolution-independent slowdown; knockback preserved; storm 75 seconds");
        }
        static void CheckLootReuse()
        {
            var prefab = Resources.Load<GameObject>("ExpLoot");
            var instance = Object.Instantiate(prefab);
            try
            {
                var loot = instance.GetComponent<ExpLoot>();
                var appearance = instance.transform.Find("Appearance");
                Require(!loot.IsActive && !appearance.gameObject.activeSelf, "New pooled loot must not flash before its network snapshot.");
                var visual = Object.Instantiate(Resources.Load<GameObject>("Particles/StarExp/StarExp"), appearance, false);
                var manager = visual.GetComponent<ParticleManager>();
                if (!manager) manager = visual.AddComponent<ParticleManager>();
                manager.Init();
                var particles = visual.GetComponentsInChildren<ParticleSystem>(true);
                Require(particles.Length > 1, "Missing original star particle hierarchy.");
                for (int reuse = 0; reuse < 5; reuse++)
                {
                    // Include an active-to-active revision, when an inactive snapshot was skipped.
                    var position = new Vector2(1300 * reuse, -500 * reuse);
                    loot.SetLoot(true, position, Vector2.right * 100);
                    Require(loot.IsActive && appearance.gameObject.activeSelf, "New star was not shown.");
                    Require((instance.GetComponent<Rigidbody2D>().position - position).sqrMagnitude < .001f, "Loot body retained its old spawn position.");
                    Require((instance.transform.position - (Vector3)position).sqrMagnitude < .001f, "Loot visual retained its old spawn position.");
                    Require(loot.PickupReadyAt > PhotonNetwork.Time + .9, "New star lost its pickup grace period.");
                    Require((float)typeof(ParticleManager).GetField("CurParticleTime", Private).GetValue(manager) == 0, "Reused star resumed its previous particle age.");
                    foreach (var particle in particles)
                    {
                        Require(particle.particleCount == 0, "Old particles leaked into a new star.");
                        particle.Simulate(.35f, false, true, true);
                        particle.Emit(2);
                    }
                    if (reuse % 2 == 0)
                    {
                        // Editor fixtures invoke the lifecycle callback explicitly.
                        visual.SendMessage("OnDisable");
                        loot.SetActive(false);
                        foreach (var particle in particles) Require(particle.particleCount == 0, "Hidden loot retained particles.");
                        Require(instance.GetComponent<Rigidbody2D>().linearVelocity == Vector2.zero, "Recycled loot retained its flight velocity.");
                    }
                }
            }
            finally { Object.DestroyImmediate(instance); }
        }
        static void CheckCursor()
        {
            var config = Resources.Load<GameObject>("PlayerRole").GetComponent<PlayerRole>();
            Require(config.CursorLimitDist == 25 && config.CursorFullSpeedDist == 150, "Player prefab did not adopt the new cursor distances.");
            foreach (float height in new[] { 390f, 720f, 1080f, 2160f })
            {
                float previous = -1;
                for (int distance = 0; distance <= 250; distance++)
                {
                    float speed = CursorMovement.SpeedScale(distance * height / 1080, height, 25, 150);
                    Require(speed >= previous && speed >= 0 && speed <= 1, "Cursor slowdown is not monotonic or bounded.");
                    if (distance <= 25) Require(speed == 0, "Cursor did not stop on the body.");
                    if (distance > 25 && distance < 150) Require(speed > 0 && speed < 1, "Cursor jumped directly to full speed.");
                    if (distance >= 150) Require(speed == 1, "Distant cursor did not reach full speed.");
                    previous = speed;
                }
                Require(Mathf.Abs(CursorMovement.SpeedScale(87.5f * height / 1080, height, 25, 150) - .5f) < .0001f,
                    "Cursor speed changed with viewport resolution.");
            }
            var cameraObject = new GameObject("Cursor camera fixture");
            var playerObject = new GameObject("Cursor movement fixture");
            var viewport = new RenderTexture(1920, 1080, 0);
            try
            {
                var camera = cameraObject.AddComponent<Camera>();
                camera.targetTexture = viewport;
                camera.enabled = false; camera.orthographic = true; camera.orthographicSize = 540;
                camera.pixelRect = new Rect(0, 0, 1920, 1080);
                camera.aspect = 1920f / 1080;
                camera.transform.position = new Vector3(150, 0, -10);
                var origin = CursorMovement.ScreenOrigin(camera, Vector3.zero);
                Require(Mathf.Abs(origin.x - 810) < .01f && Mathf.Abs(origin.y - 540) < .01f,
                    $"Stopping origin {origin} does not match the player; viewport {camera.pixelRect}.");
                var body = playerObject.AddComponent<Rigidbody2D>();
                body.gravityScale = 0;
                var player = playerObject.AddComponent<PlayerRole>();
                player.MyRigi = body; player.BaseMoveSpeed = 400;
                typeof(Role).GetField("IsInit", Private).SetValue(player, true);
                typeof(Role).GetProperty("IsAlive").GetSetMethod(true).Invoke(player, new object[] { true });
                typeof(PlayerRole).GetMethod("Move", Private, null, new[] { typeof(Vector3), typeof(float) }, null)
                    .Invoke(player, new object[] { Vector3.right, .5f });
                Require(Mathf.Abs(body.linearVelocity.x - 200) < .01f, "Player movement ignored cursor speed.");
                player.Move(Vector3.up);
                Require(Mathf.Abs(body.linearVelocity.y - 400) < .01f, "Joystick/keyboard movement lost full speed.");
                var timer = new MyTimer(1, () => { }, true, false);
                typeof(Role).GetField("DragTimer", Private).SetValue(player, timer);
                var stop = typeof(PlayerRole).GetMethod("StopControlledMovement", Private);
                stop.Invoke(player, null);
                Require(body.linearVelocity.y == 400, "Stopping cursor cancelled knockback.");
                timer.StartRunTimer = false;
                stop.Invoke(player, null);
                Require(body.linearVelocity == Vector2.zero, "Stopping cursor left voluntary drift.");
            }
            finally { Object.DestroyImmediate(playerObject); Object.DestroyImmediate(cameraObject); Object.DestroyImmediate(viewport); }
        }
        static void Require(bool ok, string message) { if (!ok) throw new InvalidOperationException(message); }
    }
}
