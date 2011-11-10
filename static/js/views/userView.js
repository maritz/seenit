_r(function (app) {
  if ( ! window.app.views.hasOwnProperty('user')) {
    app.views.user = {}
  }
  
  app.views.user.register = app.base.formView.extend({
    
    init: function () {
      this.model = new app.models.user();
      this.locals = {
        model: this.model,
        view: this
      };
    }
    
    
  });
  
});