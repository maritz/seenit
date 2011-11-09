var User = require(__dirname+'/../registry.js').Models.User;

function AuthError(msg){
  this.name = 'AuthError: '+msg;
  Error.call(this, msg);
}

AuthError.prototype.__proto__ = Error.prototype;


exports.isLoggedIn = function (req, res, next) {
  if (req.session.logged_in) {
    next();
  } else {
    next(new AuthError('need login'));
  }
};

exports.isSelfOrAdmin = function (req, res, next) {
  if (req.session.logged_in && req.loaded_user) {
    if (req.session.userdata.id === req.loaded_user.id) {
      // loaded user is session user
      next();
    } else if (req.session.admin === true) {
      // session user is admin
      next();
    } else {
      // TODO: check current admin/privilege status
      next(new AuthError('neither self nor admin'));
    }
  } else if ( ! req.session.logged_in) {
    next(new AuthError('need login'));
  } else {
    next(new AuthError('need to load user first'));
  }
};