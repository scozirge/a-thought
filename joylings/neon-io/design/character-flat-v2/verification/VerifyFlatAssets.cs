using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.U2D;
using UnityEngine.Rendering;

public static class VerifyFlatAssets
{
    const string OriginalRoot = "Assets/Resources/Images/Role/";
    const string BaselineRoot = "E:/Projects/a-thought/joylings/neon-io/unity/Assets/Resources/Images/Role/";
    const string CandidateRoot = "E:/Projects/a-thought/joylings/neon-io/design/character-flat-v2/replacement/Assets/Resources/Images/Role/";
    static readonly string[] Files = {"Head/knight.png","Body/knight.png","Back/featherWing.png","Head/anubis.png","Body/anubis.png","Back/discWing.png","Head/beetle.png","Body/beetle.png","Back/beetle.png","god.psb"};
    [Serializable] public class BoneState { public string name; public int parentId; public Vector3 position; public Quaternion rotation; public float length; }
    [Serializable] public class SpriteState
    {
        public string file, name, guid;
        public long fileId;
        public float pixelsPerUnit;
        public Vector2 pivot;
        public Rect rect;
        public Bounds bounds;
        public BoneState[] bones;
        public Vector2[] vertices;
        public ushort[] triangles;
        public BoneWeight[] weights;
        public Matrix4x4[] bindPoses;
    }
    [Serializable] public class Snapshot { public string unity; public List<SpriteState> sprites = new List<SpriteState>(); }
    [Serializable] public class Report { public bool passed; public string unity; public int assetFiles, importedSprites, godSprites, godBones; public string[] verifiedFields; public string[] errors; public bool liveGameModified; }
    static Snapshot Capture()
    {
        var snapshot = new Snapshot { unity = Application.unityVersion };
        foreach(var file in Files)
        {
            AssetDatabase.ImportAsset(OriginalRoot+file,ImportAssetOptions.ForceSynchronousImport|ImportAssetOptions.ForceUpdate);
            var sprites = AssetDatabase.LoadAllAssetsAtPath(OriginalRoot+file).OfType<Sprite>().OrderBy(s=>s.name).ToArray();
            if(sprites.Length == 0) throw new Exception("No sprites imported: "+file);
            foreach(var sprite in sprites)
            {
                AssetDatabase.TryGetGUIDAndLocalFileIdentifier(sprite,out string guid,out long id);
                var state = new SpriteState {file=file,name=sprite.name,guid=guid,fileId=id,pixelsPerUnit=sprite.pixelsPerUnit,pivot=sprite.pivot,rect=sprite.rect,bounds=sprite.bounds};
                if(file=="god.psb")
                {
                    state.bones=sprite.GetBones().Select(b=>new BoneState{name=b.name,parentId=b.parentId,position=b.position,rotation=b.rotation,length=b.length}).ToArray();
                    state.vertices=sprite.vertices;
                    state.triangles=sprite.triangles;
                    state.bindPoses=sprite.GetBindPoses().ToArray();
                    if(sprite.HasVertexAttribute(VertexAttribute.BlendWeight)) state.weights=sprite.GetVertexAttribute<BoneWeight>(VertexAttribute.BlendWeight).ToArray();
                }
                snapshot.sprites.Add(state);
            }
        }
        return snapshot;
    }
    public static void Run()
    {
        var errors=new List<string>();
        try
        {
            var allowedAssets=Path.GetFullPath("E:/Projects/Neon-flat-art-verify/Assets").TrimEnd('/','\\');
            if(!string.Equals(Path.GetFullPath(Application.dataPath).TrimEnd('/','\\'),allowedAssets,StringComparison.OrdinalIgnoreCase)) throw new Exception("Run only inside the isolated Neon-flat-art-verify project");
            foreach(var file in Files)
            {
                File.Copy(BaselineRoot+file,OriginalRoot+file,true);
                File.Copy(BaselineRoot+file+".meta",OriginalRoot+file+".meta",true);
            }
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            var before=Capture();
            File.WriteAllText("Reports/before.json",JsonUtility.ToJson(before,true));
            foreach(var file in Files)
            {
                File.Copy(CandidateRoot+file,OriginalRoot+file,true);
                File.Copy(CandidateRoot+file+".meta",OriginalRoot+file+".meta",true);
            }
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            var after=Capture();
            File.WriteAllText("Reports/after.json",JsonUtility.ToJson(after,true));
            if(before.sprites.Count!=after.sprites.Count) errors.Add("Sprite count changed");
            for(int i=0;i<Math.Min(before.sprites.Count,after.sprites.Count);i++)
                if(JsonUtility.ToJson(before.sprites[i])!=JsonUtility.ToJson(after.sprites[i])) errors.Add("Import contract changed: "+before.sprites[i].file+" / "+before.sprites[i].name);
            var report=new Report {passed=errors.Count==0,unity=Application.unityVersion,assetFiles=Files.Length,importedSprites=after.sprites.Count,godSprites=after.sprites.Count(s=>s.file=="god.psb"),godBones=after.sprites.Where(s=>s.file=="god.psb").Sum(s=>s.bones.Length),verifiedFields=new[]{"GUID","local file ID","sprite name","pixel rect","pivot","PPU","bounds","god vertex positions","god triangle indices","god bones","god bone weights","god bind poses"},errors=errors.ToArray(),liveGameModified=false};
            File.WriteAllText("Reports/result.json",JsonUtility.ToJson(report,true));
            Debug.Log("FLAT_ASSET_VERIFICATION "+JsonUtility.ToJson(report));
            EditorApplication.Exit(report.passed?0:1);
        }
        catch(Exception ex) { Debug.LogException(ex); File.WriteAllText("Reports/failure.txt",ex.ToString()); EditorApplication.Exit(2); }
    }
}
