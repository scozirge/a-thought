mergeInto(LibraryManager.library, {
  NeonLegacyEvaluate: function (javascript) {
    try {
      (0, eval)(UTF8ToString(javascript));
    } catch (error) {
      console.warn('Neon legacy host integration is unavailable:', error.message);
    }
  }
});
