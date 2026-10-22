using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using System.Reflection;
namespace Scoz.Func
{
    public static class ComponentManage
    {
        public static T GetCopyOf<T>(this Component comp, T other) where T : Component
        {
            Type type = comp.GetType();
            if (type != other.GetType()) return null; // type mis-match
            BindingFlags flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Default | BindingFlags.DeclaredOnly;//BindingFlags.DeclaredOnly
            PropertyInfo[] pinfos = type.GetProperties(flags);
            foreach (var pinfo in pinfos)
            {
                if (pinfo.CanWrite)
                {
                    try
                    {
                        //Debug.Log(pinfo.Name);
                        pinfo.SetValue(comp, pinfo.GetValue(other, null), null);
                    }
                    catch { } // In case of NotImplementedException being thrown. For some reason specifying that exception didn't seem to catch it, so I didn't catch anything specific.
                }
            }
            FieldInfo[] finfos = type.GetFields(flags);
            foreach (var finfo in finfos)
            {
                //Debug.Log(finfo.Name);
                finfo.SetValue(comp, finfo.GetValue(other));
            }
            return comp as T;
        }
        public static T AddComponent<T>(this GameObject go, T toAdd) where T : Component
        {
            return go.AddComponent<T>().GetCopyOf(toAdd) as T;
        }


        static string[] ExcludeSkillProperties = new string[] { "useGUILayout", "runInEditMode", "enabled", "tag", "name", "hideFlags" };
        static string[] ExcluedSkillFields = new string[] { "Detcor" };

        public static T CopySkill<T>(this Component comp, T other) where T : Component
        {
            Type type = comp.GetType();
            if (type != other.GetType()) return null; // type mis-match
            BindingFlags flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Default;//BindingFlags.DeclaredOnly
            PropertyInfo[] pinfos = type.GetProperties(flags);
            foreach (var pinfo in pinfos)
            {
                if (Array.Exists<string>(ExcludeSkillProperties, element => element == pinfo.Name))
                    continue;
                if (!pinfo.CanWrite)
                    continue;
                try
                {
                    //Debug.Log(pinfo.Name);
                    pinfo.SetValue(comp, pinfo.GetValue(other, null), null);
                }
                catch { } // In case of NotImplementedException being thrown. For some reason specifying that exception didn't seem to catch it, so I didn't catch anything specific.
            }
            FieldInfo[] finfos = type.GetFields(flags);
            foreach (var finfo in finfos)
            {
                if (Array.Exists<string>(ExcluedSkillFields, element => element == finfo.Name))
                    continue;
                finfo.SetValue(comp, finfo.GetValue(other));
                //Debug.Log(finfo.GetValue(comp));
            }
            return comp as T;
        }
        public static T GetComponentInChildrenExcludeSelf<T>(this Component comp) where T : Component
        {
            if (comp == null)
                return null;
            T[] comList = comp.GetComponentsInChildren<T>();
            foreach (T c in comList)
            {
                if (!GameObject.ReferenceEquals(c.gameObject, comp.gameObject))
                {
                    return c;
                }
            }
            return null;
        }
        public static T[] GetComponentsInChildrenExcludeSelf<T>(this Component comp) where T : Component
        {
            if (comp == null)
                return null;
            T[] comList = comp.GetComponentsInChildren<T>();
            List<T> list = new List<T>();
            foreach (T c in comList)
            {
                if (!GameObject.ReferenceEquals(c.gameObject, comp.gameObject))
                {
                    list.Add(c);
                }
            }
            if (list.Count != 0)
                return list.ToArray();
            return null;
        }
        public static T[] GetInheritedComponents<T>(this Component comp) where T : Component
        {
            if (comp == null)
                return null;
            T[] comList = comp.GetComponentsInChildren<T>();
            List<T> list = new List<T>();
            foreach (T c in comList)
            {
                if (!GameObject.ReferenceEquals(c.gameObject, comp.gameObject))
                {
                    list.Add(c);
                }
            }
            if (list.Count != 0)
                return list.ToArray();
            return null;
        }
    }
}
