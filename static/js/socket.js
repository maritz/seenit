var livejs = io.connect('/livejs');

livejs.on('connect', function () {
  livejs.on('message', function () {
    Live.checkForChanges();
  });
});
