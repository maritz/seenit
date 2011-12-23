_r(function (app) {
  if ( ! window.app.views.hasOwnProperty('user')) {
    app.views.user = {};
  }
  
  /**
   * #/User/list
   */
  app.views.user.list = app.base.pageView.extend({
    
    init: function () {
      var self = this;
      
      var list = new app.collections.User();
      list.fetch({
        success: function (collection) {
          self.addLocals({
            users: collection
          });
          self.render();
        },
        error: function (collection, response) {
          var json = JSON.parse(response.responseText);
          if (json.data.error.msg === 'need_login') {
            app.overlay({view: 'login_needed'});
          } else {
            app.overlay();
          }
        }
      });
    }
    
  });
  
  /**
   * #/User/register
   */
  app.views.user.register = app.base.formView.extend({
    
    auto_render: true,
    
    model: new app.models.User(),
    
    saved: function () {
      app.go('User/details/');
      this.model.unbind('saved', this.saved);
    }
    
  });
  
  
  /**
   * #/User/login or manual call
   */
  app.views.user.login = app.base.formView.extend({
    
    auto_render: true,
    
    model: new app.models.Self(),
    
    /**
     * Login successful
     */
    saved: function () {
      app.closeOverlay();
      $.jGrowl('Login successful');
    }
    
  });
  
});