mergeInto(LibraryManager.library, {
  PuzzleSnapshot: function (json) { window.puzzleUnityState = JSON.parse(UTF8ToString(json)); },
  PuzzleOpenRoom: function () { if(window.puzzleOpenRoom)window.puzzleOpenRoom(); },
  PuzzleRoomStatus: function (json) { window.puzzleRoomState=JSON.parse(UTF8ToString(json));if(window.puzzleRenderRoom)window.puzzleRenderRoom(window.puzzleRoomState); }
});
