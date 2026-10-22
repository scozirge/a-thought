using System;
using System.Collections.Generic;

namespace Neon
{
    // Explicit automated runs use a process-local scratch profile. Normal games
    // retain the existing Unity PlayerPrefs keys, with no save-format migration.
    public static class ProfilePreferences
    {
        static readonly bool isolated=Array.Exists(Environment.GetCommandLineArgs(),a=>a=="-neonSmoke"||a=="-neonUiCheck");
        static readonly Dictionary<string,object> scratch=new Dictionary<string,object>();
        public static bool HasKey(string key)=>isolated?scratch.ContainsKey(key):UnityEngine.PlayerPrefs.HasKey(key);
        public static int GetInt(string key,int fallback=0)=>isolated?(scratch.TryGetValue(key,out var v)&&v is int n?n:fallback):UnityEngine.PlayerPrefs.GetInt(key,fallback);
        public static float GetFloat(string key,float fallback=0)=>isolated?(scratch.TryGetValue(key,out var v)&&v is float n?n:fallback):UnityEngine.PlayerPrefs.GetFloat(key,fallback);
        public static string GetString(string key,string fallback="")=>isolated?(scratch.TryGetValue(key,out var v)&&v is string s?s:fallback):UnityEngine.PlayerPrefs.GetString(key,fallback);
        public static void SetInt(string key,int value){if(isolated)scratch[key]=value;else UnityEngine.PlayerPrefs.SetInt(key,value);}
        public static void SetFloat(string key,float value){if(isolated)scratch[key]=value;else UnityEngine.PlayerPrefs.SetFloat(key,value);}
        public static void SetString(string key,string value){if(isolated)scratch[key]=value;else UnityEngine.PlayerPrefs.SetString(key,value);}
        public static void DeleteKey(string key){if(isolated)scratch.Remove(key);else UnityEngine.PlayerPrefs.DeleteKey(key);}
        public static void DeleteAll(){if(isolated)scratch.Clear();else UnityEngine.PlayerPrefs.DeleteAll();}
        public static void Save(){if(!isolated)UnityEngine.PlayerPrefs.Save();}
    }
}
