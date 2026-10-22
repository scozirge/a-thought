mergeInto(LibraryManager.library, {
  NeonWebAudioUnlock__deps: ['$WEBAudio'],
  NeonWebAudioUnlock: function () {
    if (WEBAudio.audioContext) WEBAudio.audioContext.resume();
  },
  NeonWebState__deps: ['$WEBAudio'],
  NeonWebState: function (json) {
    window.neonState = JSON.parse(UTF8ToString(json));
    window.neonState.audioContextState = WEBAudio.audioContext ? WEBAudio.audioContext.state : 'unavailable';
  }
});
