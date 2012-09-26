_r(function (app) {
  
  // because we handle the pw checks differently depending on whether the user exists or not, we can't use the built-in nohmValidations
  var pw_length = nohmValidations.models.User.password[1][1]['min'];
  delete nohmValidations.models.User.password;

  app.models.User = app.base.model.extend({
    urlRoot: '/REST/User/',
    nohmName: 'User',
    
    initialize: function () {
      this.pw_repeat_set_once = false;
      app.base.model.prototype.initialize.call(this);
    },
    
    validations: {
      password: function (value) {
        if ( ! this.id && !value) {
          return 'notEmpty';
        }
        if (value && value.length < pw_length) {
          return 'minLength';
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
          return 'password_mismatch';
        }
      }
    },
    asyncValidations: {
      name: function (value, callback) {
        $.get(this.urlRoot+'checkName', {
          name: value,
          id: this.id
        }, function () {
          callback(undefined, true);
        }).error(function (xhr) {
          xhr.handled = true;
          callback('name_taken', true);
        });
      }
    },
    
    putProp: function (action, data, cb) {
      var self = this;
      app.getCsrf(function (csrf) {
        data._csrf = csrf;
        $.ajax({
          type: 'PUT',
          url: '/REST/User/'+action+'/'+self.id,
          data: data,
          error: function () { cb('unknown error'); },
          success: function (json) {
            cb(null, json); 
          }
        });
      });
    },
    
    changeAcl: function (allow_or_deny, action, subject, cb) {
      var self = this;
      this.putProp(allow_or_deny, {
          action: action,
          subject: subject
        }, function (err, json) {
          if ( ! err) {
            self.set({
              acl: json.data
            });
          }
          cb(err);
        }
      );
    },
    
    changeAdmin: function (admin, cb) {
      var self = this;
      this.putProp('setAdmin', {
          admin: admin
        }, function (err, json) {
          if ( ! err) {
            self.set({
              admin: admin
            });
          }
          cb(err);
        }
      );
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
      $.getJSON('/REST/User/loginData')
        .success(function (result) {
          self.set(result.data);
          self.loaded = true;
          app.trigger('user_loaded', true);
        })
        .error(function (jqXHR) {
          jqXHR.handled = true;
          self.loaded = true;
          app.trigger('user_loaded', false);
        });
    },
    
    may: function (action, subject) {
      if (this.get('admin')) {
        return true;
      }
      var acl = this.get('acl');
      if (acl && acl.hasOwnProperty(subject) && Array.isArray(acl[subject])) {
        if (acl[subject].indexOf(action) !== -1) {
          return true;
        }
      }
      return false;
    }
  });
  app.user_self = new app.models.Self();
  
});