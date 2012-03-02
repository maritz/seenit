_r(function (app) {
  var s = io.connect();
  app.once('login', function () {
    s.emit('login');
    s.on('login_confirmed', function () {
      var self = io.connect('/Self');
      console.log('connecting /Self');
      self.on('connect', function () {
        console.log('/Self connection established');
      });
    });
  });
});