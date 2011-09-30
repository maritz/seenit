var livejs = io.connect('/Livejs');
console.log('connecting to sockets');
livejs.on('connect', function () {
  livejs.on('checkResources', function () {
    console.log('checking resources');
    Live.checkForChanges();
  });
});
