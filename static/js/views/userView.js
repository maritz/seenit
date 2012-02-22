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
              list.fetch({success: success, error: function () {console.log('ERROR WHILE FETCHING LIST');}});
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
    }
    
  });
  
  
  /**
   * #/User/logout
   */
  app.views.user.logout = app.base.pageView.extend({    
    init: function () {
      if (app.user_self) {
        app.user_self.logout();
      }
    }
  });
  
  /**
   * Userbox
   */
  app.views.userbox = app.base.pageView.extend({
    
    model: app.user_self || app.models.Self,
    
    module: 'user',
    action: 'userbox',
    
    $el: $('#userbox'),
    
    auto_render: true,
      
    locals: {
      test: 'asd',
      user: app.user_self
    },
    
    init: function () {
      app.bind('login', this.render);
    },
    
    load: function (callback) {
      app.user_self = this.model;
      $.getJSON('/REST/User/getLoginData')
        .success(function (result, text, something) {
          app.user_self.set(result.data);
          callback(null, result.data);
        })
        .error(function (xhr, code, text) {
          callback(text);
        });
    },
    
  });
  
});