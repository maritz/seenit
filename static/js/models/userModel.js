_r(function (app) {
  if ( ! window.app.models.hasOwnProperty('user')) {
    app.models.user = {}
  }
  
  app.models.user = app.base.model.extend({
    urlRoot: '/REST/User/',
    validations: {
      password: function (value) {
        if (value.length < 6) {
          return 'user.errors.password_short';
        }
      },
      password_repeat: function (value) {
        if (value.length < 6) {
          return 'user.errors.password_short';
        }
        if (value !== this.get('password')) {
          return 'user.errors.password_mismatch';
        }
      }
    },
    asyncValidations: {
      name: function (value, callback) {
        $.get(this.urlRoot+'checkName?name='+value, function (result) {
          setTimeout(function () {
          if (result !== 'ok') {
            callback('user.errors.name_taken');
          } else {
            callback();
          }
          }, 1000);
        });
      }
    }
  });
  
});