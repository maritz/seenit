_r(function (app) {
  if ( ! window.app.views.hasOwnProperty('user')) {
    app.views.user = {};
  }
  
  app.views.user.index = app.base.pageView.extend({
    
    init: function () {
      var self = this;
      
      var list = new app.collections.User();
      list.fetch(function (collection) {
        self.addLocals({
          users: collection
        });
        self.render();
      });
      
    }
    
  });
  
  app.views.user.register = app.base.formView.extend({
    
    auto_render: true,
    
    model: new app.models.User(),
    
    saved: function () {
      app.go('User/details/');
      this.model.unbind('saved', this.saved);
    }
    
  });
  
});