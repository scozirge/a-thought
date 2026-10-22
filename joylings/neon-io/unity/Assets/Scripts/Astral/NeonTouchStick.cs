using Neon.Networking;
using UnityEngine;
using UnityEngine.EventSystems;

namespace Neon.Astral
{
    // One captured finger owns the stick. Other fingers remain available to UI.
    public sealed class NeonTouchStick : MonoBehaviour, IPointerDownHandler, IDragHandler,
        IPointerUpHandler, IInitializePotentialDragHandler
    {
        public static NeonTouchStick Instance { get; private set; }
        public static Vector2 Direction => Instance ? Instance.direction : Vector2.zero;
        public bool Dragging => pointer.HasValue;
        public RectTransform knob;
        public float radius = 42, deadZone = .15f;
        int? pointer;
        Vector2 direction;
        void Awake() { Instance = this; }
        public static void Release() { if (Instance) Instance.ResetStick(); }
        public void OnInitializePotentialDrag(PointerEventData e) { e.useDragThreshold = false; }
        public void OnPointerDown(PointerEventData e)
        {
            if (!NeonWebBridge.TouchLayout || !NeonWebBridge.InputAvailable || pointer.HasValue ||
                e.button != PointerEventData.InputButton.Left || AstralPresentation.InputBlocked) return;
            pointer = e.pointerId;
            SetPosition(e);
        }
        public void OnDrag(PointerEventData e) { if (pointer == e.pointerId) SetPosition(e); }
        public void OnPointerUp(PointerEventData e) { if (pointer == e.pointerId) ResetStick(); }
        void SetPosition(PointerEventData e)
        {
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)transform,
                e.position, e.pressEventCamera, out var point)) return;
            var offset = Vector2.ClampMagnitude(point, radius);
            if (knob) knob.anchoredPosition = offset;
            direction = offset.sqrMagnitude <= radius * radius * deadZone * deadZone
                ? Vector2.zero : offset / radius;
        }
        void Update()
        {
            if (!NeonWebBridge.InputAvailable || AstralPresentation.InputBlocked) { ResetStick(); return; }
            if (!pointer.HasValue || pointer.Value < 0) return;
            // Handles touchcancel, a finger leaving the canvas, and browser interruptions.
            bool found = false;
            for (int i = 0; i < Input.touchCount; i++)
            {
                var touch = Input.GetTouch(i);
                if (touch.fingerId != pointer.Value) continue;
                found = touch.phase != TouchPhase.Ended && touch.phase != TouchPhase.Canceled;
                break;
            }
            if (!found) ResetStick();
        }
        void ResetStick() { pointer = null; direction = Vector2.zero; if (knob) knob.anchoredPosition = Vector2.zero; }
        void OnApplicationFocus(bool focused) { if (!focused) ResetStick(); }
        void OnApplicationPause(bool paused) { if (paused) ResetStick(); }
        void OnDisable() { ResetStick(); if (Instance == this) Instance = null; }
        void OnEnable() { Instance = this; }
        void OnDestroy() { if (Instance == this) Instance = null; }
    }
}
