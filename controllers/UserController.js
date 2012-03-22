var Registry = require(__dirname+'/../registry.js');
var User = Registry.Models.User;
var app = require('express').createServer();
var auth = require(__dirname+'/../helpers/auth');
var async = require('async');
var loadModel = require(__dirname+'/../helpers/loadModel');

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


function sendUserdata(req, res, next) {
  req.user.may('edit', 'User', req.loaded.User.id, function (err, may) {
    if (err) {
      next(new UserError('Checking permissions failed.'));
    } else {
      res.ok(req.loaded.User.allProperties(may));
    }
  });
}


app.get('/:id([0-9]+)', auth.isLoggedIn, auth.may('view', 'User'), loadModel('User'), sendUserdata);


function store (req, res, next) {
  var user = req.loaded.User;
  var data = {
    name: req.param('name'),
    password: req.param('password'),
    email: req.param('email')
  };
  user.store(data, function (err) {
    if ( ! err) {
      next();
    } else {
      setTimeout(function () { // brute force punishment
        next(new UserError({error: err, fields: user.errors}, 400));
      }, 300);
    }
  });
}

function newUser (req, res, next) {
  req.loaded = {
    User: new User()
  };
  next();
}

function updateSession (req, res, next) {
  if (req.loaded.User && req.loaded.User instanceof User && req.loaded.User.__inDB) {
    if ( ! req.user.id || req.user.id === req.loaded.User.id) {
      req.session.logged_in = true;
      req.session.userdata = req.loaded.User.allProperties(true);
      req.user = req.loaded.User;
    }
    next();
  } else {
    next(new UserError('Can\'t set session because the loaded model is not a valid and loaded user model.'));
  }  
}

app.post('/', auth.may('create', 'User'), newUser, store, updateSession, sendUserdata);

app.put('/:id([0-9]+)', auth.isLoggedIn, auth.may('edit', 'User'), loadModel('User'), store, updateSession, sendUserdata);

if (process.env.NODE_ENV !== 'production') {
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
}

app.put('/:allowOrDeny(allow|deny)/:id([0-9]+)', auth.isLoggedIn, auth.may('grant', 'User'), loadModel('User'), function (req, res, next) {
  var allowOrDeny = req.param('allowOrDeny');
  var action = req.param('action');
  var subject = req.param('subject');
  if (action && subject) {
    var new_acl = req.loaded.User[allowOrDeny](action, subject);
    req.loaded.User.save(function (err) {
      if (err) {
        next(new Error(err));
      } else {
        res.ok(new_acl);
      }
    });
  } else {
    next(new UserError('Invalid parameters'));
  }
});

app.put('/setAdmin/:id', auth.isAdmin, loadModel('User'), function (req, res, next) {
  var admin = req.param('admin') === "true";
  req.loaded.User.p('admin', admin);
  req.loaded.User.save(function (err) {
    if (err) {
      next(new Error(err));
    } else {
      res.ok(req.loaded.User.p('admin'));
    }
  });
});

app.get('/checkName', function (req, res, next) {
  var name = req.param('name');
  var id = req.param('id') || req.user.id;
  if (name) {
    setTimeout(function () { // brute force punishment
      User.find({name: name}, function (err, ids) {
        if (err) {
          next(new UserError('Database error: '+err, 500));
        } else if (ids.length > 0 && ids[0] !== id) {
          next(new UserError('Name taken.', 400));
        } else {
            res.ok();
        }
      });
    }, 200);
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
      req.loaded.User = user;
      next();
    } else {
      setTimeout(function () { // artificial delay to make bruteforcing less practical
        logout(req);
        next(new UserError({error: 'Wrong authentication.', fields: {general: ['wrong_login']}}, 400));
      }, 400);
    }
  });
}

app.post('/login', login, updateSession, sendUserdata);

app.get('/loginData', auth.isLoggedIn, function (req, res, next) {
  req.loaded.User = req.user;
  next();
}, updateSession, sendUserdata);

function logout (req) {
  req.session.userdata = {};
  req.session.logged_in = false; 
}

app.get('/logout', function (req, res) {
  logout(req);
  res.ok();
});

app.del('/:id([0-9]+)', auth.isLoggedIn, auth.may('delete', 'User'), loadModel('User'), function (req, res, next) {
  var doLogout = false;
  if (req.session.userdata.id === req.loaded.User.id) {
    doLogout = true;
  }
  req.loaded.User.remove(function (err) {
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


app.mounted(function (){
  console.log('mounted User REST controller');
});

module.exports = app;