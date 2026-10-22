using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using Scoz.Func;
using Neon.Networking;
using UnityEngine.UI;

namespace Starbro.NeonIO
{
    [RequireComponent(typeof(PlayerRole))]
    class NetworkPlayerMove : MonoBehaviourPunCallbacks, IPunObservable
    {
        protected PlayerRole MyPlayer;
        protected Vector3 RemotePlayerPosition;

        void Awake()
        {
            MyPlayer = GetComponent<PlayerRole>();
        }
        // Kept for prefab compatibility. FusionEntity renders network transforms.
        public void OnPhotonSerializeView(PhotonStream stream, PhotonMessageInfo info)
        {
            if(stream.IsWriting)
            {
                stream.SendNext(transform.position);
            }
            else
            {
                RemotePlayerPosition = (Vector3)stream.ReceiveNext();
            }
        }
    }
}
