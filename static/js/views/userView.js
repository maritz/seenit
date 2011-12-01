_r(function (app) {
  if ( ! window.app.views.hasOwnProperty('user')) {
    app.views.user = {};
  }
  
  app.views.user.register = app.base.formView.extend({
    
    init: function () {
      var self = this;
      
      var model = this.model = new app.models.User();
      model.view = this;
      
      this.i18n = ['user', 'register'];
      
      this.addLocals({
        model: model,
        view: this
      });
      
      model.bind('saved', this.saved);
    },
    
    saved: function () {
      app.navigate('#/User/details/', true);
      model.unbind('saved', this.saved);
    }
    
  });
  
});