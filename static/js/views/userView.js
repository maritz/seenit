_r(function (app) {
  if ( ! window.app.views.hasOwnProperty('user')) {
    app.views.user = {};
  }
  
  var isNotLoggedIn = function () {
    return ! isLoggedIn();
  }
  
  var isLoggedIn = function () {
    return app.user_self.get('name');
  }
  
  /**
   * #/user/list
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
          app.back();
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
   * #/user/register
   */
  app.views.user.register = app.base.formView.extend({
    
    auto_render: true,
    model: app.models.User,
    max_age: 0,
    checkAllowed: isNotLoggedIn,
    wait_for_user_loaded: false,
    reload_on_login: true,
    
    render: function () {
      if (app.user_self.get('name')) {
        app.back();
      } else {
        app.base.formView.prototype.render.apply(this, _.toArray(arguments));
      }
    },
    
    saved: function () {
      app.go('User/details/');
      app.user_self.set(this.model.toJSON());
      app.trigger('login');
    }
    
  });
  
  /**
   * #/user/profile
   */
  app.views.user.profile = app.base.pageView.extend({
    
    auto_render: true,
    model: app.models.User,
    checkAllowed: isLoggedIn,
    
    load: function (callback) {
      this.model.set({'id': app.user_self.id});
      this.model.fetch({
        success: function (user, response) {
          callback(null, user);
        },
        error: function (user, response) {
          app.overlay({locals: {error: response.data}, view: 'error'});
        }
      });
    }
    
  });
  
  /**
   * #/user/edit_profile
   */
  app.views.user.edit_profile = app.base.formView.extend({
    
    auto_render: true,
    model: app.models.User,
    max_age: 0,
    
    checkAllowed: isLoggedIn,
    
    load: function (callback) {
      this.model.id = app.user_self.id;
      this.model.fetch({
        success: function (user, response) {
          callback(null, user);
        },
        error: function (user, response) {
          app.overlay({locals: {error: response.data}, view: 'error'});
        }
      });
    },
    
    saved: function () {
      app.go('User/details/');
      this.model.unbind('saved', this.saved);
    }
    
  });
  
  
  /**
   * #/user/login or manual call
   */
  app.views.user.login = app.base.formView.extend({
    
    model: app.models.Self,
    
    auto_render: true,
    max_age: 0,
    checkAllowed: isNotLoggedIn,
    wait_for_user_loaded: false,
    
    /**
     * Login successful
     */
    saved: function (arg1, arg2, arg3) {
      $.jGrowl('Login successful');
      app.user_self.set(this.model.toJSON());
      this.closeAndBack();
      app.trigger('login');
    }
    
  });
  
  
  /**
   * #/user/logout
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
    
    model: app.user_self,
    
    module: 'user',
    action: 'userbox',
    
    $el: $('#userbox'),
    auto_render: true,
    reload_on_login: true,
    
    load: function (callback) {
      callback(null, app.user_self);
    }
  });
  
});