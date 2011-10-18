$(function () {
  window.app = new App();
  
  _r(function () {
    Backbone.history.start();
  });
  
  _r(true);
});