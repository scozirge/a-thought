mergeInto(LibraryManager.library,{
    StudioView:function(json){window.paperStudio.view(JSON.parse(UTF8ToString(json)));},
    StudioNotice:function(message){window.paperStudio.toast(UTF8ToString(message));},
    StudioPicture:function(round,id,revision,ink){window.paperStudio.picture(round,id,revision,UTF8ToString(ink));}
});
