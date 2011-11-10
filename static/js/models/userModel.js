_r(function (app) {

  app.models.User = app.base.model.extend({
    urlRoot: '/REST/User/',
    validations: {
      name: function (value) {
        if (value.length < 6) {
          return 'user.errors.name_short';
        }
      },
      password: function (value) {
        var password_repeat = this.view.$el.find('input[name="password_repeat"]').val();
        if ((password_repeat+'').length > 0) {
          this.set({password_repeat: password_repeat});
        }
        if (value.length < 6) {
          return 'user.errors.password_short';
        }
      },
      password_repeat: function (value) {
        if (value !== this.view.$el.find('input[name="password"]').val()) {
          return 'user.errors.password_mismatch';
        }
      }
    },
    asyncValidations: {
      name: function (value, callback) {
        $.get(this.urlRoot+'checkName?name='+value, function (response) {
          if (response.result !== 'success') {
            callback('user.errors.name_taken');
          } else {
            callback();
          }
        });
      }
    }
  });
  
});