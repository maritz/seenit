_r(function (app) {

  app.models.User = app.base.model.extend({
    urlRoot: '/REST/User/',
    nohmName: 'User',
    pw_repeat_set_once: false,
    validations: {
      password: function () {
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
    urlRoot: '/REST/User/login'
  });
  
});