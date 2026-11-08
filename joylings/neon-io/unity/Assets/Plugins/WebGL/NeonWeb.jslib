mergeInto(LibraryManager.library, {
  NeonWebConnectionReport: function (json) {
    try {
      var report = JSON.parse(UTF8ToString(json));
      var build = document.querySelector('meta[name="neon-build"]');
      report.webBuild = build ? build.content : 'local-build';
      report.browser = navigator.userAgent;
      window.neonLastConnectionReport = report;
      try { localStorage.setItem('neon.lastConnectionReport', JSON.stringify(report)); } catch (_) {}
      window.dispatchEvent(new Event('neon-connection-report'));
    } catch (_) { console.warn('NEON_REPORT_EXPORT_FAILED'); }
  },
  NeonWebAudioUnlock__deps: ['$WEBAudio'],
  NeonWebAudioUnlock: function () {
    var context=WEBAudio.audioContext;
    if(!context)return;
    var report=function(){window.neonAudioState=context.state;window.dispatchEvent(new Event('neon-audio-state'));};
    if(!context.neonListening){context.neonListening=true;context.addEventListener('statechange',report);}
    report();
    if(context.state!=='running')context.resume().then(report).catch(report);
  },
  NeonWebState__deps: ['$WEBAudio'],
  NeonWebState: function (json) {
    window.neonState = JSON.parse(UTF8ToString(json));
    window.neonState.audioContextState = WEBAudio.audioContext ? WEBAudio.audioContext.state : 'unavailable';
  }
});
