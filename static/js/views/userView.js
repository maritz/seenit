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
      var success = function (collection) {
        self.addLocals({
          users: collection
        });
        self.render();
      };
      
      var list = new app.collections.User();
      list.fetch({
        success: success,
        error: function (collection, response) {
          var json = JSON.parse(response.responseText);
          window.history.back();
          if (json.data.error.msg === 'need_login') {
            app.overlay({view: 'login_needed'});
      
            app.once('login', function () {
              list.fetch({success: success});
            });
          } else {
            app.overlay({locals: {error: json.data.error.msg}, view: 'error'});
            self.trigger('error');
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
    
    model: app.models.User,
    
    max_age: 1000*60*60,
    
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
    
    model: app.models.Self,
    
    /**
     * Login successful
     */
    saved: function () {
      app.closeOverlay();
      $.jGrowl('Login successful');
      app.trigger('login');
      app.selfUser = this.model;
    }
    
  });
  
  
  /**
   * #/User/logout
   */
  app.views.user.logout = app.base.pageView.extend({    
    init: function () {
      debugger;
      if (app.selfUser) {
        app.selfUser.logou();
      }
    }
  });
  
});