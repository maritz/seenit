$(function () {
  window.app = new App();
  _.bindAll(window.app);
  _r(function () {
    Backbone.history.start();
    
    $('#reload_page').live('click', app.reload);
    $('a.open_login').live('click', function (e) {
      e.preventDefault();
      app.overlay({view: 'login_needed'});
    });
    
    app.userbox = new app.views.userbox();
  });
  
  _r(true);
});