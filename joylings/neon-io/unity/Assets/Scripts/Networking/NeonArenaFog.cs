using UnityEngine;

namespace Neon.Networking
{
    // Two world-space triangles; procedural mist has no particle pool or texture download.
    // Draws over the world while leaving the screen-space HUD readable.
    public sealed class NeonArenaFog : MonoBehaviour
    {
        Mesh mesh;
        Material material;
        MeshRenderer fogRenderer;
        public bool Ready => fogRenderer && fogRenderer.enabled && material && material.shader.isSupported;
        public float Radius { get; private set; }
        public void SetRadius(float radius)
        {
            if (!fogRenderer)
            {
                var shader = Resources.Load<Shader>("Astral/ArenaFog");
                if (!shader) { Debug.LogError("Missing arena fog shader."); return; }
                material = new Material(shader);
                float extent = NeonArenaRules.InitialRadius * 8;
                mesh = new Mesh { name = "Arena fog plane", vertices = new[] { new Vector3(-extent,-extent,0),new Vector3(-extent,extent,0),new Vector3(extent,extent,0),new Vector3(extent,-extent,0) }, triangles = new[] {0,1,2,0,2,3} };
                mesh.RecalculateBounds();
                var plane = new GameObject("Arena black mist", typeof(MeshFilter), typeof(MeshRenderer));
                plane.transform.SetParent(transform,false); plane.GetComponent<MeshFilter>().sharedMesh = mesh;
                fogRenderer = plane.GetComponent<MeshRenderer>(); fogRenderer.sharedMaterial = material;
                // The original art uses Background/Main sorting layers above Default.
                // Foreground covers that art; the UI layers and overlay HUD remain readable.
                fogRenderer.sortingLayerName = "Foreground"; fogRenderer.sortingOrder = 32000;
                fogRenderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                fogRenderer.receiveShadows = false;
            }
            Radius = Mathf.Max(0,radius);
            material.SetFloat("_Radius", Radius);
        }
        void OnDestroy()
        {
            if (fogRenderer) Destroy(fogRenderer.gameObject);
            if (material) Destroy(material);
            if (mesh) Destroy(mesh);
        }
    }
}
