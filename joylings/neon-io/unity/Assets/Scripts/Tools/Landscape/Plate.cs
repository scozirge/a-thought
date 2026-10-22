using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class Plate : MonoBehaviour
    {
        public bool RandomFlipX = false;
        public bool RandomFlipY = false;

        public virtual void Init()
        {
            RanomFlip();
        }
        void RanomFlip()
        {
            if (RandomFlipX)//Horizontal Flip
            {
                int rnd = Random.Range(0, 2);
                if (rnd == 0)
                    transform.localScale = new Vector3(Mathf.Abs(transform.localScale.x), transform.localScale.y, transform.localScale.z);
                else
                    transform.localScale = new Vector3(Mathf.Abs(transform.localScale.x) * -1, transform.localScale.y, transform.localScale.z);
            }
            if (!RandomFlipX)//Vertical Flip
            {
                int rnd = Random.Range(0, 2);
                if (rnd == 0)
                    transform.localScale = new Vector3(transform.localScale.x, Mathf.Abs(transform.localScale.y), transform.localScale.z);
                else
                    transform.localScale = new Vector3(transform.localScale.x, Mathf.Abs(transform.localScale.y) * -1, transform.localScale.z);
            }
        }
    }
}
