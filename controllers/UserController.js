var Registry = require(__dirname+'/../registry.js');
var User = Registry.Models.User;
var app = require('express').createServer();
var auth = require(__dirname+'/../helpers/auth');

function UserError(msg){
  this.name = 'UserError';
  this.message = msg;
  Error.call(this, msg);
}

UserError.prototype.__proto__ = Error.prototype;

function loadUser (req, res, next){
  var id = req.param('userId');
  var user = new User();
  var load = function (id) {
    user.load(id, function (err) {
      if (err) {
        next(new UserError('Did not find user with id "'+id+'".\nerror: '+err));
      } else {
        req.loaded_user = user;
        next();
      }
    });
  }
  if (!!id.match(/^[\d]*$/)) {
    load(id);
  } else {
    user.find({name:id}, function (err, ids) {
      if (err) {
        next(new UserError('Did not find user with name "'+id+'".\nerror: '+err));
      } else if (ids.length === 0) {
        next(new UserError('Did not find user with name "'+id+'".'));
      } else if (ids.length > 1) {
        next(new UserError('Found multiple matches with name "'+id+'".'));
      } else {
        load(ids[0]);
      }
    });
  }
};

app.get('/', auth.isLoggedIn, function (req, res) {
  User.find(function (err, ids) {
    res.send('ids: '+JSON.stringify(ids));
  });
});

app.get('/show/:userId', auth.isLoggedIn, loadUser, function (req, res) {
  res.send(req.loaded_user.allProperties());
});


function store (req, res) {
  var user = req.loaded_user;
  var data = {
    name: req.param('name'),
    password: req.param('password'),
    email: req.param('email')
  };
  user.store(data, function (err) {
    var response = user.__inDB ? 'ok' : 'saving failed: ' + err +'\nvalidation errors: '+ JSON.stringify(user.errors);
    res.send(response);
  });
}

function newUser (req, res, next) {
  req.loaded_user = new User();
  next();
}

app.post('/', newUser, store);

app.all('/create', newUser, store);

app.put('/', loadUser, auth.isSelfOrAdmin, store);

app.all('/update', loadUser, auth.isSelfOrAdmin, store);

app.get('/checkName', function (req, res) {
  if (req.param('name')) {
    User.find({name: req.param('name')}, function (err, ids) {
      if (err) {
        res.send('Error: '+err);
      } else if (ids.length > 0) {
        res.send('name taken');
      } else {
        res.send('ok');
      }
    });
  } else {
    res.send('no user specified');
  }
});

app.get('/login', function (req, res) {
  // TODO: needs login-per-ip counter and ban.
  var user = new User();
  var name = req.param('name') || false;
  var password = req.param('password') || false;
  user.login(name, password, function (success) {
    if (success) {
      req.session.logged_in = true;
      req.session.userdata = user.allProperties();
      res.send('ok, hello '+user.p('name'));
    } else {
      setTimeout(function () { // artificial delay to make bruteforcing less practical
        logout(req);
        res.send('wrong authentication');
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
  res.send('ok');
});




app.mounted(function (parent){
  console.log('mounted User REST controller');
});


module.exports = app;