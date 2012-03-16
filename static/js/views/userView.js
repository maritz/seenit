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
   * #/user/index
   */
  app.views.user.index = app.base.listView.extend({
    
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
      this.reload_on_login = false; // we only want to reload if the login is not from here.
      app.once('user_loaded', function () {
        app.go('user/profile/');
        app.trigger('login');
      });
      app.user_self.load();
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
   * #/user/edit_profile(/:id)
   */
  app.views.user.edit_profile = app.base.formView.extend({
    
    auto_render: true,
    model: app.models.User,
    max_age: 0,
    
    checkAllowed: isLoggedIn,
    edit_is_self: false,
    
    events: {
      'click form.acl label a': 'markAclInputs',
      'change :checkbox': 'changeAcl'
    },
    
    init: function () {
      var default_acl = ['view', 'list', 'create', 'edit', 'delete'];
      this.addLocals({
        acl: {
          'User': ['self'].concat(default_acl.concat(['grant'])),
          'Show': default_acl,
          'Episode': default_acl
        }
      });
    },
    
    load: function (callback) {
      if (this.params[0] && app.user_self.may('edit', 'User')) {
        this.model.id = this.params[0];
      } else {
        this.model.id = app.user_self.id;
        this.edit_is_self = true;
      }
      this.model.fetch(function (user, response) {
        callback(null, user);
      });
    },
    
    saved: function () {
      app.go('user/profile/');
      if (this.edit_is_self) {
        app.user_self.set(this.model.toJSON());
      }
    },
    
    markAclInputs: function (e) {
      var $target = $(e.target);
      var boxes = $target.closest('.control-group').find(':checkbox');
      if ($target.hasClass('setRead')) {
        boxes
          .filter('[data-action="view"], [data-action="list"]')
          .click();
      }
      if ($target.hasClass('setWrite')) {
        boxes
          .filter('[data-action="create"], [data-action="edit"], [data-action="delete"]')
          .click();
      }
    },
    
    changeAcl: function (e) {
      var $target = $(e.target);
      var checked = $target.prop('checked');
      var allow_or_deny = checked ? 'allow' : 'deny';
      $target.attr('disabled', true);
      this.model.changeAcl(allow_or_deny, $target.data('action'), $target.data('subject'), function (err) {
        var class_name = 'success_blink';
        if (err) {
          class_name = 'error_blink';
          $target.prop('checked', !checked);
        }
        var $parent = $target.parent().addClass(class_name);
        setTimeout(function () {
          $target.attr('disabled', false);
          $parent.removeClass(class_name);
        }, 500);
      });
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
    
    init: function () {
      this.model.bind('change:name', this.render);
    },
    
    load: function (callback) {
      callback(null, app.user_self);
    }
  });
  
});