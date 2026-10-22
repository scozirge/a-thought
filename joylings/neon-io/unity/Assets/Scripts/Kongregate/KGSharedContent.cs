using UnityEngine;
using System.Collections;
using UnityEngine.Networking;
using System;
using Scoz.Func;
using System.Collections.Generic;

namespace Starbro.NeonIO
{
    public enum SharedContentType
    {
        MK,//MaxKill
    }

    public partial class KongregateAPIBehaviour
    {
        //玩家最高殺敵分數 key= KGName_MaxKill ex. starbrogamemaker__MaxKill

        public static void SaveSharedContent(SharedContentType _type, string _content)
        {
            string key = string.Format("{0}{1}", MyPlayer.KGID, _type.ToString());
            Debug.Log("SaveSharedContentKey=" + key);
            if(key.Length>12)
            {
                Debug.LogWarningFormat("SaveSharedContent的key值長度不能大於12:{0}", key);
                return;
            }
            Debug.LogFormat("SaveSharedContent Key:{0} Content:{1}", key, _content);
            //kongregate.sharedContent.save('Contraption', 'x1y3z10', onSaved,                         											 myContraptionEditor,'Level 3 Solution');
            LegacyBrowser.Evaluate(@"
          kongregate.sharedContent.save('" + key + @"','" + _content + @"', function(params) {
            var unityObject = kongregateUnitySupport.getUnityObject();
            var result = String(params.success);
            unityObject.SendMessage('GameManager', 'SaveSharedContent_CB' , result );
          });");
        }
       public  void SaveSharedContent_CB(string _result)
        {
            Debug.Log("SaveSharedContent_CB:" + _result);
            if (_result == "true")
            {
                Debug.Log("Save sharedContent success");
            }
            else
            {
                Debug.LogError("Save sharedContent fail");
            }
        }

        static void AddSharedContentListener(SharedContentType _type)
        {
            string key = string.Format("{0}{1}", MyPlayer.KGID, _type.ToString());
            Debug.Log("ContentListenerKey=" + key);
            if (key.Length > 12)
            {
                Debug.LogWarningFormat("SaveSharedContent的key值長度不能大於12:{0}", key);
                return;
            }
            LegacyBrowser.Evaluate(@"
      kongregate.sharedContent.addLoadListener('" + key + @"', function(params){
        var unityObject = kongregateUnitySupport.getUnityObject();
        var services = kongregate.services;
        var result = params.name+','+params.content;
        unityObject.SendMessage('GameManager', 'SharedContentReceive', result);
    });"
);
        }
        public void SharedContentReceive(string _result)
        {
            string[] results = _result.Split(',');
            string name = results[0];
            string content = results[1];
            Debug.LogFormat("Name:{0} Content:{1}", name, content);
        }

    }
}
