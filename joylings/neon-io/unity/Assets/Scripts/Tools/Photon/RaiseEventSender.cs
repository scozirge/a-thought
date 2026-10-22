using System.Collections.Generic;
using UnityEngine;
using Neon.Networking;
using Starbro.NeonIO;
using Soze.Func;
using System.Linq;

namespace Scoz.Func
{
    public partial class PhotonTools
    {
        public enum EventCode//只能0~199，但不要用0(忘了就查官網https://doc.photonengine.com/en-us/pun/current/gameplay/rpcsandraiseevent)
        {
            GodState = 1,
            Clamor,
            ChallengeSelectFeature,
        }
        public static void SendGodStateEvent(int _state, float _time)
        {
            object[] datas = new object[2] { _state, _time};
            RaiseEventOptions raiseEventOptions = new RaiseEventOptions { Receivers = ReceiverGroup.All }; // You would have to set the Receivers to All in order to receive this event on the local client as well
            SendOptions sendOptions = new SendOptions { Reliability = true };
            PhotonNetwork.RaiseEvent((byte)EventCode.GodState, datas, raiseEventOptions, sendOptions);
        }
        public static void SendClamorEvent( string _acK, string _clamor)
        {
            string[] datas = new string[2] { _acK, _clamor };
            RaiseEventOptions raiseEventOptions = new RaiseEventOptions { Receivers = ReceiverGroup.Others };
            SendOptions sendOptions = new SendOptions { Reliability = true };
            PhotonNetwork.RaiseEvent((byte)EventCode.Clamor, datas, raiseEventOptions, sendOptions);
        }
        public static void SendPlayerSelectFeaturesEvent(int[] _ids)
        {
            RaiseEventOptions raiseEventOptions = new RaiseEventOptions { Receivers = ReceiverGroup.Others };
            SendOptions sendOptions = new SendOptions { Reliability = true };
            PhotonNetwork.RaiseEvent((byte)EventCode.ChallengeSelectFeature, _ids, raiseEventOptions, sendOptions);
        }
    }
}
