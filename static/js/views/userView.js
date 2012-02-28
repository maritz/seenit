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
   * #/User/register
   */
  app.views.user.register = app.base.formView.extend({
    
    auto_render: true,
    
    model: app.models.User,
    
    max_age: 0,
    
    checkAllowed: isNotLoggedIn,
    
    saved: function () {
      app.go('User/details/');
      this.model.unbind('saved', this.saved);
    }
    
  });
  
  /**
   * #/User/profile
   */
  app.views.user.profile = app.base.formView.extend({
    
    auto_render: true,
    
    model: app.models.User,
    
    max_age: 0,
    
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
   * #/User/edit_profile
   */
  app.views.user.edit_profile = app.base.formView.extend({
    
    auto_render: true,
    
    model: app.models.User,
    
    max_age: 0,
    
    checkAllowed: isLoggedIn,
    
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
    
    max_age: 0,
    
    model: app.models.Self,
    
    checkAllowed: isNotLoggedIn,
    
    /**
     * Login successful
     */
    saved: function () {
      $.jGrowl('Login successful');
      app.once('login', function () {
        app.back();
      });
      app.trigger('logging_in');
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
      app.bind('logging_in', this.render);
    },
    
    load: function (callback) {
      app.user_self = this.model;
      $.getJSON('/REST/User/getLoginData')
        .success(function (result, text, something) {
          app.user_self.set(result.data);
          callback(null, result.data);
          app.trigger('login');
        })
        .error(function (xhr, code, text) {
          callback(text);
        });
    },
    
  });
  
});