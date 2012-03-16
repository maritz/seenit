var User = require(__dirname+'/../registry.js').Models.User;

function AuthError(msg, code){
  this.name = 'AuthError';
  this.message = msg;
  this.code = code || 401;
  Error.call(this, msg);
}

AuthError.prototype.__proto__ = Error.prototype;

exports.isLoggedIn = function (req, res, next) {
  if (req.session.logged_in) {
    next();
  } else {
    throw new AuthError('need_login');
  }
};

exports.isSelfOrAdmin = function (req, res, next) {
  console.log('DEPRECATED? auth.isSelfOrAdmin');
  if (req.session.logged_in && req.loaded_user) {
    if (req.session.userdata.id === +req.loaded_user.id) {
      // loaded user is session user
      next();
    } else if (req.session.admin === true) {
      // session user is admin
      next();
    } else {
      // TODO: check current admin/privilege status
      next(new AuthError('privileges_low'));
    }
  } else if ( ! req.session.logged_in) {
    next(new AuthError('need_login'));
  } else {
    next(new AuthError('Need to load user before checking for admin/self.', 500));
  }
};

var fail = new Error('Checking roles failed');
var may_not = new AuthError('privileges_low');

exports.may = function (action, subject, param_name) {
  param_name = param_name || 'id';
  return function (req, res, next) {
    var id = parseInt(req.param(param_name), 10);
    req.user.may(action, subject, id, function (err, may){
      if (err) {
        next(fail);
      } else if (may) {
        next();
      } else {
        next(may_not);
      }
    });
  };
};

