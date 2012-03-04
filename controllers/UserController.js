var Registry = require(__dirname+'/../registry.js');
var User = Registry.Models.User;
var app = require('express').createServer();
var auth = require(__dirname+'/../helpers/auth');
var async = require('async');

function UserError(msg, code){
  this.name = 'UserError';
  if (typeof(msg) === 'string') {
    this.message = msg;
  } else {
    this.data = msg;
    this.message = 'custom';
  }
  this.code = code || 500;
  Error.call(this, msg);
}

UserError.prototype.__proto__ = Error.prototype;

function loadUser (req, res, next){
  var id = req.param('id');
  var user = new User();
  var load = function (id) {
    user.load(id, function (err) {
      if (err) {
        next(new UserError('not_found', 404));
      } else {
        req.loaded_user = user;
        next();
      }
    });
  };
  
  if (id && !!id.match(/^[\d]*$/)) {
    load(id);
  } else if (id) {
    user.find({name:id}, function (err, ids) {
      if (err || ids.length === 0) {
        next(new UserError('not_found', 404));
      } else if (ids.length > 1) {
        next(new UserError('multiple_matches', 500));
      } else {
        load(ids[0]);
      }
    });
  } else {
    next(new UserError('Called method that requires user id but none provided.'));
  }
}

app.get('/', auth.isLoggedIn, auth.may('list', 'User'), function (req, res, next) {
  User.find(function (err, ids) {
    if (err) {
      next(new UserError('Fetching the user ids failed: '+err));
    } else {
      async.map(ids, function loadById(id, callback) {
        var user = new User(id, function (err) {
          callback(err, user.allProperties());
        });
      }, function doneLoading(err, users) {
        if (err) {
          next(new UserError('Fetching the userlist failed: '+err));
        } else {
          res.ok(users);
        }
      });
    }
  });
});

app.get('/:id([0-9]+)', auth.isLoggedIn, loadUser, function (req, res) {
  var show_private = req.user.p('admin') === 'true' || req.user.id === req.loaded_user.id;
  res.ok(req.loaded_user.allProperties(show_private));
});


function store (req, res, next) {
  var user = req.loaded_user;
  var data = {
    name: req.param('name'),
    password: req.param('password'),
    email: req.param('email')
  };
  user.store(data, function (err) {
    if ( ! err) {
      next();
    } else {
      next(new UserError({error: err, fields: user.errors}, 400));
    }
  });
}

function newUser (req, res, next) {
  req.loaded_user = new User();
  next();
}

function sendSessionUserdata(req, res) {
  res.ok(req.session.userdata);
}

function updateSession (req, res, next) {
  if (req.loaded_user && req.loaded_user instanceof User && req.loaded_user.__inDB) {
    req.session.logged_in = true;
    req.session.userdata = req.loaded_user.allProperties();
    next();
  } else {
    next(new UserError('Can\'t set session to req.loaded_user because it\'s not a valid and loaded nohm model.'));
  }  
}

app.post('/', auth.may('create', 'User'), newUser, store, updateSession, sendSessionUserdata);

app.put('/:id([0-9]+)', auth.isLoggedIn, auth.may('edit', 'User'), loadUser, store, updateSession, sendSessionUserdata);

app.get('/:takeOrGive(take|give)/me/admin', auth.isLoggedIn, function (req, res, next) {
  var admin = req.param('takeOrGive') === 'give';
  req.user.p('admin', admin);
  req.user.save(function (err) {
    if (err) {
      next(new Error(err));
    } else {
      res.ok(req.user.allProperties());
    }
  });
});

app.get('/send_msg/:id', function (req, res, next) {
  var id = req.param('id');
  var msg = req.param('msg')+' '+Math.random();
  Registry.redis.rpush('messages:'+id, msg, function (err, amount) {
    if (err) {
      next(new Error(err));
    } else {
      Registry.redis_pub.publish('messages:'+id, amount);
      res.ok(amount);
    }
  });
});

app.put('/:allowOrDeny(allow|deny)/:id([0-9]+)', auth.isLoggedIn, auth.may('allow', 'User'), loadUser, function (req, res, next) {
  var allowOrDeny = req.param('allowOrDeny');
  var action = req.param('action');
  var subject = req.param('subject');
  if (action && subject) {
    var new_acl = req.loaded_user[allowOrDeny](action, subject);
    req.loaded_user.save(function (err) {
      if (err) {
        next(new Error(err));
      } else {
        res.ok(new_acl);
      };
    });
  } else {
    next(new UserError('Invalid parameters'));
  }
});

app.get('/checkName', function (req, res, next) {
  var name = req.param('name');
  if (name) {
    if (name === req.user.p('name')) {
      res.ok('That is your name.');
    } else {
      setTimeout(function () {
        User.find({name: name}, function (err, ids) {
          if (err) {
            next(new UserError('Database error: '+err, 500));
          } else if (ids.length > 0) {
            next(new UserError('Name taken.', 400));
          } else {
              res.ok();
          }
        });
      }, 800);
    }
  } else {
    next(new UserError('No name to check in parameters.'));
  }
});

function login (req, res, next) {
  // TODO: needs login-per-ip counter and ban.

  var user = new User();
  var name = req.param('name') || false;
  var password = req.param('password') || false;
  user.login(name, password, function (success) {
    if (success) {
      req.loaded_user = user;
      next();
    } else {
      setTimeout(function () { // artificial delay to make bruteforcing less practical
        logout(req);
        next(new UserError({error: 'Wrong authentication.', fields: {general: ['wrong_login']}}, 400));
      }, 400);
    }
  });
}

app.post('/login', login, updateSession, sendSessionUserdata);

app.get('/getLoginData', auth.isLoggedIn, sendSessionUserdata);

function logout (req) {
  req.session.userdata = {};
  req.session.logged_in = false; 
}

app.get('/logout', function (req, res) {
  logout(req);
  res.ok();
});

app.del('/:id([0-9]+)', auth.isLoggedIn, auth.may('delete', 'User'), loadUser, function (req, res, next) {
  var doLogout = false;
  if (req.session.userdata.id === req.loaded_user.id) {
    doLogout = true;
  }
  req.loaded_user.remove(function (err) {
    if (err) {
      next(new UserError('Delete failed: '+err, 500));
    } else {
      if (doLogout) {
        logout(req, res);
      } else {
        res.ok();
      }
    }
  });
});


app.mounted(function (parent){
  console.log('mounted User REST controller');
});

module.exports = app;