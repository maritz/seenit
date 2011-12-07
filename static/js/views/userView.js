_r(function (app) {
  if ( ! window.app.views.hasOwnProperty('user')) {
    app.views.user = {};
  }
  
  app.views.user.index = app.base.pageView.extend({
    
    init: function () {
      var self = this;
      
      var list = new app.collections.User();
      list.fetch({
        success: function (collection, response) {
          console.log(JSON.stringify(collection));
          self.addLocals({
            users: collection
          });
          self.render();
        },
        error: function (collection, response) {
          console.log('fetching error');
          debugger;
        }
      });
      
    }
    
  });
  
  app.views.user.register = app.base.formView.extend({
    
    auto_render: true,
    
    model: new app.models.User(),
    
    saved: function () {
      debugger;
      app.go('User/details/');
      model.unbind('saved', this.saved);
    }
    
  });
  
});