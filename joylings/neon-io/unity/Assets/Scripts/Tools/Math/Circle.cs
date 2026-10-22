using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Scoz.Func
{
    public class Circle
    {
        public static bool CheckIfPointInsiedTheCircle(float _r, Vector2 _circleCenter, Vector2 _point)
        {
            bool inside = true;
            float dist = GetDistFromCenter(_circleCenter, _point);
            if (dist <= _r)
                inside = true;
            else
                inside = false;
            return inside;
        }
        static float GetDistFromCenter(Vector2 _center, Vector2 _point)
        {
            float dist = Mathf.Sqrt(((_point.x - _center.x) * (_point.x - _center.x)) + ((_point.y - _center.y) * (_point.y - _center.y)));
            return dist;
        }
        public static Vector2 GetRandomPosInCircle(Vector2 _center, float _r)
        {
            Vector2 pos = Vector2.zero;
            pos = Random.insideUnitCircle * _r + _center;
            return pos;
        }
        public static bool CheckIfPosAwayFromCircumference(Vector2 _pos, Vector2 _circleCenter, int _radius, float _awayFromDist)
        {
            float dist = 0;
            dist = (Mathf.Sqrt((_pos.x - _circleCenter.x) * (_pos.x - _circleCenter.x) + (_pos.y - _circleCenter.y) * (_pos.y - _circleCenter.y)) - _radius);
            if (dist > 0)
                return false;
            else
                dist = Mathf.Abs(dist);
            if (dist - _awayFromDist < 0)
                return false;
            return true;
        }
    }
}
