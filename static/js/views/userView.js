_r(function (app) {
  if ( ! window.app.views.hasOwnProperty('user')) {
    app.views.user = {};
  }
  
  app.views.user.register = app.base.formView.extend({
    
    init: function () {
      var self = this;
      var model = this.model = new app.models.User();
      this.model.view = this;
      this.locals = {
        model: this.model,
        view: this
      };
    }
    
  });
  
});