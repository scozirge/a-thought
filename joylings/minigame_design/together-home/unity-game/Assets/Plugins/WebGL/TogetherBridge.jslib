mergeInto(LibraryManager.library, {
 TogetherPublish: function(json){const state=JSON.parse(UTF8ToString(json));window.togetherUnityState=state;if(window.renderTogether)window.renderTogether(state);},
 TogetherReady: function(){window.togetherEngineReady=true;if(window.configureTogether)window.configureTogether();}
});
