var Registry = require(__dirname+'/../registry.js');
var Show = Registry.Models.Show;
var app = require('express').createServer();
var auth = require(__dirname+'/../helpers/auth');
var async = require('async');
var loadModel = require(__dirname+'/../helpers/loadModel');

function ShowError(msg, code){
  this.name = 'ShowError';
  if (typeof(msg) === 'string') {
    this.message = msg;
  } else {
    this.data = msg;
    this.message = 'custom';
  }
  this.code = code || 500;
  Error.call(this, msg);
}
ShowError.prototype.__proto__ = Error.prototype;


app.get('/', auth.isLoggedIn, auth.may('list', 'Show'), function (req, res, next) {
  Show.find(function (err, ids) {
    if (err) {
      next(new ShowError('Fetching the user ids failed: '+err));
    } else {
      async.map(ids, function loadById(id, callback) {
        var show = new Show(id, function (err) {
          callback(err, show.allProperties());
        });
      }, function doneLoading(err, users) {
        if (err) {
          next(new ShowError('Fetching the userlist failed: '+err));
        } else {
          res.ok(users);
        }
      });
    }
  });
});

app.get('/:id([0-9]+)', auth.isLoggedIn, loadModel('Show'), function (req, res) {
  res.ok(req.loaded['Show'].allProperties());
});


function store (req, res, next) {
  var user = req.loaded['Show'];
  var data = {
    name: req.param('name'),
    password: req.param('password'),
    email: req.param('email')
  };
  user.store(data, function (err) {
    if ( ! err) {
      next();
    } else {
      next(new ShowError({error: err, fields: user.errors}, 400));
    }
  });
}

function newUser (req, res, next) {
  req.loaded = {
    Show: new Show()
  };
  next();
}

function sendSessionUserdata(req, res) {
  res.ok(req.session.userdata);
}

function updateSession (req, res, next) {
  if (req.loaded['Show'] && req.loaded['Show'] instanceof User && req.loaded['Show'].__inDB) {
    req.session.logged_in = true;
    req.session.userdata = req.loaded['Show'].allProperties();
    next();
  } else {
    next(new ShowError('Can\'t set session to req.loaded_user because it\'s not a valid and loaded nohm model.'));
  }  
}

app.post('/', auth.may('create', 'User'), newUser, store, updateSession, sendSessionUserdata);

app.put('/:id([0-9]+)', auth.isLoggedIn, auth.may('edit', 'User'), loadShow, store, updateSession, sendSessionUserdata);

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

app.put('/:allowOrDeny(allow|deny)/:id([0-9]+)', auth.isLoggedIn, auth.may('allow', 'User'), loadShow, function (req, res, next) {
  var allowOrDeny = req.param('allowOrDeny');
  var action = req.param('action');
  var subject = req.param('subject');
  if (action && subject) {
    var new_acl = req.loaded['Show'][allowOrDeny](action, subject);
    req.loaded['Show'].save(function (err) {
      if (err) {
        next(new Error(err));
      } else {
        res.ok(new_acl);
      };
    });
  } else {
    next(new ShowError('Invalid parameters'));
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
            next(new ShowError('Database error: '+err, 500));
          } else if (ids.length > 0) {
            next(new ShowError('Name taken.', 400));
          } else {
              res.ok();
          }
        });
      }, 800);
    }
  } else {
    next(new ShowError('No name to check in parameters.'));
  }
});

function login (req, res, next) {
  // TODO: needs login-per-ip counter and ban.

  var user = new User();
  var name = req.param('name') || false;
  var password = req.param('password') || false;
  user.login(name, password, function (success) {
    if (success) {
      req.loaded['Show'] = user;
      next();
    } else {
      setTimeout(function () { // artificial delay to make bruteforcing less practical
        logout(req);
        next(new ShowError({error: 'Wrong authentication.', fields: {general: ['wrong_login']}}, 400));
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

app.del('/:id([0-9]+)', auth.isLoggedIn, auth.may('delete', 'User'), loadShow, function (req, res, next) {
  var doLogout = false;
  if (req.session.userdata.id === req.loaded['Show'].id) {
    doLogout = true;
  }
  req.loaded['Show'].remove(function (err) {
    if (err) {
      next(new ShowError('Delete failed: '+err, 500));
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