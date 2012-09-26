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
    next(new AuthError('need_login'));
  }
};

var fail = new Error('Checking roles failed.');
var may_not = new AuthError('privileges_low');

exports.isAdmin = function (req, res, next) {
  exports.isLoggedIn(req, res, function (err) {
    if (!err && req.user.p('admin') === true) {
      next();
    } else {
      next(err || may_not);
    }
  });
};

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

