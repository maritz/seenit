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
  var id = req.param('userId');
  var user = new User();
  var load = function (id) {
    user.load(id, function (err) {
      if (err) {
        next(new UserError('Did not find user with id "'+id+'".\nerror: '+err, 404));
      } else {
        req.loaded_user = user;
        next();
      }
    });
  };
  
  if (!!id.match(/^[\d]*$/)) {
    load(id);
  } else {
    user.find({name:id}, function (err, ids) {
      if (err) {
        next(new UserError('Did not find user with name "'+id+'".\nerror: '+err, 404));
      } else if (ids.length === 0) {
        next(new UserError('Did not find user with name "'+id+'".', 404));
      } else if (ids.length > 1) {
        next(new UserError('Found multiple matches with name "'+id+'".', 500));
      } else {
        load(ids[0]);
      }
    });
  }
}

app.get('/', /*auth.isLoggedIn,*/ function (req, res, next) {
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

app.get('/show/:userId', auth.isLoggedIn, loadUser, function (req, res) {
  res.send(req.loaded_user.allProperties());
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

function sendOk (req, res) {
  res.ok();
}

function setSessionToLoadedUser (req, res) {
  if (req.loaded_user && req.loaded_user instanceof User && req.loaded_user.__inDB) {
    req.session.logged_in = true;
    var userdata = req.session.userdata = req.loaded_user.allProperties();
    res.ok({user: userdata});
  } else {
    next(new UserError('Can\'t set session to req.loaded_user because it\'s not a valid and loaded nohm model.'));
  }  
}

app.post('/', newUser, store, setSessionToLoadedUser);

app.all('/create', newUser, store, setSessionToLoadedUser);

app.put('/', loadUser, auth.isSelfOrAdmin, store, sendOk);

app.all('/update', loadUser, auth.isSelfOrAdmin, store, sendOk);

app.get('/checkName', function (req, res, next) {
  if (req.param('name')) {
    User.find({name: req.param('name')}, function (err, ids) {
      if (err) {
        next(new UserError('Database error: '+err, 500));
      } else if (ids.length > 0) {
        next(new UserError('Name taken.', 400));
      } else {
        res.ok();
      }
    });
  } else {
    next(new UserError('No name to check in parameters.'));
  }
});

app.get('/login', function (req, res, next) {
  // TODO: needs login-per-ip counter and ban.
  var user = new User();
  var name = req.param('name') || false;
  var password = req.param('password') || false;
  user.login(name, password, function (success) {
    if (success) {
      req.loaded_user = user;
      setSessionToLoadedUser(req, res, next);
    } else {
      setTimeout(function () { // artificial delay to make bruteforcing less practical
        logout(req);
        next(new UserError('Wrong authentication.', 400));
      }, 400);
    }
  });
});

function logout (req) {
  req.session.userdata = {};
  req.session.logged_in = false; 
}

app.get('/logout', function (req, res) {
  logout(req);
  res.ok();
});


app.mounted(function (parent){
  console.log('mounted User REST controller');
});

module.exports = app;