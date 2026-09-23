using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Fusion;
using Fusion.Sockets;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace RivalsPrototype {
  public partial class DuelSession {
    const int ConnectionTimeoutSeconds=30;
    const float LobbyRetrySeconds=5;

    // A Fusion runner is single-use. All async operations keep their own runner
    // reference so a late completion cannot mutate a newer connection.
    async Task DisposeRunner(NetworkRunner runner) {
      if(!runner)return;
      runner.RemoveCallbacks(this);
      try { await runner.Shutdown(); }
      catch(Exception e) { Debug.LogWarning("RIVALS_CLEANUP "+e.Message); }
      finally { if(runner)Destroy(runner.gameObject); }
    }

    void ResetGameSession() {
      started=false;paused=false;showSettings=false;showCredits=false;hadControls=false;
      Runner=null;Match=null;Local=null;
      registeredPlayers.Clear();Players=Array.Empty<DuelPlayer>();loggedRoster=null;lastRoster=null;
      pending=default;weapon=-1;firePress=0;lastFirePressFrame=-1;Look=default;
      aimTarget=null;lastHitTarget=null;seenPickups=seenRound=lastHits=0;
      hitUntil=targetUntil=pickupUntil=nextTargetScan=0;pickupMessage=null;
      Array.Clear(nameVisible,0,nameVisible.Length);
      DuelWebInput.SetActive(false);DuelWebInput.Release();SetLobbyCamera(true);
      Room=RoomTitle(PlayerName);nextLobbyReport=0;lobbyHiddenReported=false;
      ClearDiagnostics();
    }

    async Task Connect(GameMode mode) {
      if(busy||Runner||lobbyConnecting)return;
      if(mode!=GameMode.Single&&(string.IsNullOrWhiteSpace(Room)||Room.Length>32)) {
        Message="請老師檢查房間設定。";return;
      }
      busy=true;Message="等一下，馬上就好！";nextLobbyReport=0;
      PlayerName=DuelNames.Clean(PlayerName);
      NetworkRunner attempt=null;
      bool connected=false;
      try {
        await CloseLobby();
        if(!this)return;
        var go=new GameObject("Fusion Runner");attempt=go.AddComponent<NetworkRunner>();Runner=attempt;
        attempt.ProvideInput=true;attempt.AddCallbacks(this);
        var scenes=go.AddComponent<NetworkSceneManagerDefault>();
        var networkConfig=NetworkProjectConfig.Global;
#if UNITY_EDITOR || DEVELOPMENT_BUILD
        var testArgs=Environment.GetCommandLineArgs();
        if(float.TryParse(Arg(testArgs,"-networkDelayMs","0"),out float delay)&&delay>0) {
          var conditions=networkConfig.NetworkConditions;conditions.Enabled=true;
          conditions.DelayMin=conditions.DelayMax=delay/1000;
          conditions.AdditionalJitter=.02;conditions.LossChanceMin=conditions.LossChanceMax=.02;
          Debug.Log($"RIVALS_NETWORK_SIM delayMs={delay} jitterMs=20 loss=0.02");
        }
#endif
        using(var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(ConnectionTimeoutSeconds))) {
          var result=await attempt.StartGame(new StartGameArgs {
            GameMode=mode,SessionName=mode==GameMode.Host&&!smoke?Guid.NewGuid().ToString("N"):Room.Trim(),
            PlayerCount=MaxPlayers,IsVisible=true,
            SessionProperties=mode==GameMode.Host?new Dictionary<string,SessionProperty>{{"host",PlayerName}}:null,
            ConnectionToken=System.Text.Encoding.UTF8.GetBytes(PlayerName),
            Scene=SceneRef.FromIndex(SceneManager.GetActiveScene().buildIndex),SceneManager=scenes,
            Config=networkConfig,CustomPhotonAppSettings=AppSettings(),EnableClientSessionCreation=mode!=GameMode.Client,
            StartGameCancellationToken=timeout.Token
          });
          if(!this)return;
          if(!result.Ok) {
            Message=ConnectionMessage(result.ShutdownReason);Debug.LogWarning("RIVALS_CONNECT_FAILED "+result);return;
          }
        }
        if(attempt!=Runner||!attempt||!attempt.IsRunning)return;
        connected=true;started=true;Message="";showSettings=false;showCredits=false;paused=false;
        Debug.Log($"RIVALS_START server={attempt.IsServer} sceneBusy={scenes.IsBusy} players={attempt.ActivePlayers.Count()}");
        Debug.Log("RIVALS_CONNECTED "+mode);
#if !UNITY_WEBGL || UNITY_EDITOR
        if(!smoke)DuelWebInput.Resume();
#endif
      } catch(OperationCanceledException) {
        if(this)Message="連線逾時，請檢查網路後再試一次。";
      } catch(Exception e) {
        Debug.LogWarning("RIVALS_CONNECT_EXCEPTION "+e.Message);
        if(this)Message="現在連不上，請稍後再試一次。";
      } finally {
        if(!connected) {
          await DisposeRunner(attempt);
          if(this&&(Runner==attempt||!Runner)){ResetGameSession();nextLobbyRetry=Time.unscaledTime+1;}
        }
        if(this){busy=false;nextLobbyReport=0;}
      }
    }

    async void Leave() {
      if(busy)return;
      busy=true;paused=true;DuelWebInput.SetActive(false);DuelWebInput.Release();
      try {
        await DisposeRunner(Runner);
        if(!this)return;
        ResetGameSession();Message="已離開房間。";
      } finally {
        if(this){busy=false;nextLobbyRetry=Time.unscaledTime;nextLobbyReport=0;}
      }
    }

    public void OnShutdown(NetworkRunner runner,ShutdownReason reason) {
      if(runner==lobbyRunner) {
        lobbyRunner=null;lobbyReady=false;rooms.Clear();
        lobbyStatus="房間清單連線中斷，正在重新連線…";
        nextLobbyRetry=Time.unscaledTime+LobbyRetrySeconds;nextLobbyReport=0;
        if(runner)Destroy(runner.gameObject);
        return;
      }
      if(runner!=Runner)return;
      Debug.Log("RIVALS_SHUTDOWN "+reason);
      ResetGameSession();Message=ConnectionMessage(reason);nextLobbyRetry=Time.unscaledTime+1;
      if(runner)Destroy(runner.gameObject);
    }

    public void OnDisconnectedFromServer(NetworkRunner runner,NetDisconnectReason reason) {
      if(runner==Runner)Message="房間斷線了，請再加入一次。";
    }
    public void OnConnectFailed(NetworkRunner runner,NetAddress address,NetConnectFailedReason reason) {
      if(runner==Runner)Message="現在連不上，請再試一次。";
    }
    static string ConnectionMessage(ShutdownReason reason) {
      switch(reason) {
        case ShutdownReason.GameNotFound:return "這個房間已結束，請選擇其他房間或自己建立。";
        case ShutdownReason.GameIsFull:return "房間滿了，最多 8 人喔。";
        case ShutdownReason.GameIdAlreadyExists:
        case ShutdownReason.ServerInRoom:return "朋友已經開房了，按「加入房間」吧！";
        case ShutdownReason.GameClosed:return "這個房間關閉了，請重新選擇。";
        case ShutdownReason.OperationCanceled:
        case ShutdownReason.OperationTimeout:
        case ShutdownReason.ConnectionTimeout:
        case ShutdownReason.PhotonCloudTimeout:return "連線逾時，請檢查網路後再試一次。";
        case ShutdownReason.Ok:return "已離開房間。";
        default:return "房間連線已中斷，請重新加入或建立房間。";
      }
    }
  }
}
