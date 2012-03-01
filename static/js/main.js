var start_time = +new Date();
$(function () {
  window.app = new App();
  _.bindAll(window.app);
  _r(function () {
    
    $('#reload_page').live('click', app.reload);
    $('a.open_login').live('click', function (e) {
      e.preventDefault();
      app.overlay({view: 'login_needed'});
    });
    
    app.once('user_loaded', function () {
      app.userbox = new app.views.userbox();
      
      Backbone.history.start();
      var time = +new Date() - start_time;
      console.log('startup time', time);
    });
    app.user_self.load();
  });
  
  _r(true);
});