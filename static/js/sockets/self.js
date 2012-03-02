_r(function (app) {
  var s = io.connect();
  
  app.once('user_loaded', function () {
    
    s.emit('login');
    
    s.on('login_confirmed', function () {
      var self = io.connect('/Self');
      console.log('connecting /Self');
      
      self.on('connect', function () {
        console.log('/Self connection established');
        
        self.on('new_msg', function (data) {
          $.jGrowl('New message: "'+data.msg+'" received.');
        });
      });
      
    });
  });
});