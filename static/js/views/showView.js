_r(function (app) {
  app.views.show = {};
  
  var isLoggedIn = function () {
    return app.user_self.get('name');
  }
  
  /**
   * #/show/index
   */
  app.views.show.index = app.base.listView.extend({
    
    collection: app.collections.Show,
    auto_render: true,
    reload_on_login: true,
    checkAllowed: isLoggedIn
    
  });
  
  /**
   * #/show/create
   */
  app.views.show.create = app.base.formView.extend({
    
    auto_render: true,
    model: app.models.Show,
    checkAllowed: isLoggedIn,
    reload_on_login: true,
    
    saved: function () {
      app.go('Show/details/'+this.model.id);
    }
    
  });
  
});