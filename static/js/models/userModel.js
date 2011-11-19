_r(function (app) {

  app.models.User = app.base.model.extend({
    urlRoot: '/REST/User/',
    nohmName: 'User',
    validations: {
      password: function (value) {
        var password_repeat = this.view.$el.find('input[name="password_repeat"]').val();
        this.set({password_repeat: password_repeat});
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