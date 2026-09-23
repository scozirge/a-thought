mergeInto(LibraryManager.library, {
  RivalsLookX: function() { var s=window.rivalsLook; if(!s)return 0;var value=s.x;s.x=0;return value; },
  RivalsLookY: function() { var s=window.rivalsLook; if(!s)return 0;var value=s.y;s.y=0;return value; },
  RivalsCanvasFocused: function() { return window.rivalsLook && window.rivalsLook.active ? 1 : 0; },
  RivalsResumeLook: function() { if(window.rivalsLook)window.rivalsLook.resume(); },
  RivalsReleaseLook: function() { if(window.rivalsLook)window.rivalsLook.release(); },
  RivalsLookEnabled: function(enabled) { var s=window.rivalsLook;if(s){s.enabled=!!enabled;if(!enabled){s.x=0;s.y=0;}} },
  RivalsDiagnosticsEnabled: function() { return window.rivalsDiagnostics ? 1 : 0; },
  RivalsReportLobby: function(json) { var state=JSON.parse(UTF8ToString(json));window.rivalsLobbyState=state;if(window.rivalsReceiveLobby)window.rivalsReceiveLobby(state); },
  RivalsReportState: function(json) { if(window.rivalsDiagnostics)window.rivalsDiagnostics=JSON.parse(UTF8ToString(json)); },
  RivalsClearDiagnostics: function() { if(window.rivalsDiagnostics)window.rivalsDiagnostics={};window.rivalsShotEvents=[]; },
  RivalsReportShot: function(count) {
    if(!window.rivalsDiagnostics)return;
    var events=window.rivalsShotEvents||(window.rivalsShotEvents=[]);
    events.push({count:count,time:performance.now()});if(events.length>128)events.shift();
  }
});
