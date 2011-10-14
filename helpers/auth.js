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