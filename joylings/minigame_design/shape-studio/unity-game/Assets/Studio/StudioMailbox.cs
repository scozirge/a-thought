using Fusion;

namespace ShapeStudio {
    // A targeted RPC retains the originating Fusion peer when relayed by Photon.
    // ReliableLargeData also preserves order between roster, mark and ink messages.
    public sealed class StudioMailbox : SimulationBehaviour {
        public StudioLink Link;

        [Rpc(Channel=RpcChannel.ReliableLargeData, TickAligned=false, InvokeLocal=false)]
        public static void Rpc_Paper(NetworkRunner runner,[RpcTarget] PlayerRef target,int actor,byte[] data,RpcInfo info=default){
            var mailbox=runner.GetComponent<StudioMailbox>();
            if(mailbox && mailbox.Link)mailbox.Link.ReceivePacket(actor,info.Source,data);
        }
    }
}
