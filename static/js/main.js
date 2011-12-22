$(function () {
  window.app = new App();
  _.bindAll(window.app);
  _r(function () {
    Backbone.history.start();
    
    $('#reload_page').live('click', app.reload);
  });
  
  _r(true);
});