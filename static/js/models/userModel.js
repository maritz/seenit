_r(function (app) {
  
  // because we handle the pw checks differently depending on whether the user exists or not, we can't use the built-in nohmValidations
  var pw_length = nohmValidations.models.User.password[1][1]['min'];
  delete nohmValidations.models.User.password;

  app.models.User = app.base.model.extend({
    urlRoot: '/REST/User/',
    nohmName: 'User',
    pw_repeat_set_once: false,
    validations: {
      password: function (value) {
        if ( ! this.id && !value) {
          return 'user.errors.notEmpty';
        }
        if (value && value.length < pw_length) {
          return 'user.errors.minLength';
        }
        var $password_repeat_el = this.view.$el.find('input[name="password_repeat"]');
        if ($password_repeat_el.length > 0 && this.pw_repeat_set_once) {
          var password_repeat = $password_repeat_el.val();
          this.set({password_repeat: password_repeat}, {validate: true});
        }
      },
      password_repeat: function (value) {
        this.pw_repeat_set_once = true;
        if (value !== this.view.$el.find('input[name="password"]').val()) {
          return 'user.errors.password_mismatch';
        }
      }
    },
    asyncValidations: {
      name: function (value, callback) {
        $.get(this.urlRoot+'checkName?name='+value, function () {
          callback(undefined, true);
        }).error(function () {
          callback('name_taken', true);
        });
      }
    }
  });
  
  app.models.Self = app.base.model.extend({
    urlRoot: '/REST/User/login',
    
    logout: function () {
      $.get('/REST/User/logout', function () {
        window.location = '/';
      });
    },
    
    load: function () {
      var self = this;
      $.getJSON('/REST/User/getLoginData')
        .success(function (result) {
          self.set(result.data);
          self.loaded = true;
          app.trigger('user_loaded', true);
        })
        .error(function () {
          self.loaded = true;
          app.trigger('user_loaded', false);
        });
    }
  });
  app.user_self = new app.models.Self();
  
});