using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Scoz.Func
{
    public class Landscaper : MonoBehaviour
    {
        public Vector2 SpawnPlatePos = Vector2.zero;
        public int HorizontalPlateNum = 10;
        public int VerticalPlateNum = 10;
        public Transform ParentTrans;
        public Vector2 PlateSize = new Vector2(0, 0);
        public Vector2 Spacing = new Vector2(0, 0);
        public Plate PlatePrefab;
        static Landscaper Myself;

        public static Dictionary<int, Plate> PlateDic = new Dictionary<int, Plate>();

        // Start is called before the first frame update
        void Start()
        {
            Myself = this;
            BuildPlates();
        }

        public void BuildPlates()
        {
            PlateDic = new Dictionary<int, Plate>();
            for (int j = 0; j < VerticalPlateNum; j++)
            {
                for (int i = 0; i < HorizontalPlateNum; i++)
                {
                    Plate p = Instantiate(PlatePrefab);
                    PlateDic.Add(i + HorizontalPlateNum * j, p);
                    if (ParentTrans)
                        p.transform.SetParent(ParentTrans);
                    p.transform.localPosition = new Vector3(SpawnPlatePos.x + (PlateSize.x * i + i * Spacing.x), SpawnPlatePos.y + (-PlateSize.y * j - j * Spacing.y), 0);
                }
            }
        }
    }
}
