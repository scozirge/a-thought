mergeInto(LibraryManager.library, {
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
