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
  app.views.user.list = app.base.listView.extend({
    
    collection: app.collections.User,
    auto_render: true,
    reload_on_login: true
    
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
    
    load: function (callback) {
      var self = this;
      this.model.set({'id': app.user_self.id});
      this.model.fetch()
        .always(function (res) {
          callback(res.status >= 400, self.model);
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
      this.model.fetch(function (user, response) {
        callback(null, user);
      });
    },
    
    saved: function () {
      app.go('User/profile/');
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