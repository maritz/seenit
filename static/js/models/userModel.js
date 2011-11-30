_r(function (app) {

  app.models.User = app.base.model.extend({
    urlRoot: '/REST/User/',
    nohmName: 'User',
    pw_repeat_set_once: false,
    validations: {
      password: function (value) {
        var $password_repeat_el = this.view.$el.find('input[name="password_repeat"]');
        console.log('rechecking pw_repeat', ($password_repeat_el.length > 0 && this.pw_repeat_set_once));
        if ($password_repeat_el.length > 0 && this.pw_repeat_set_once) {
          var password_repeat = $password_repeat_el.val();
          this.set({password_repeat: password_repeat});
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
        console.log('hi!');
        $.get(this.urlRoot+'checkName?name='+value, function (response) {
          if (response.result !== 'success') {
            callback('user.errors.name_taken', true);
          } else {
            callback(undefined, true);
          }
        });
      }
    }
  });
  
});