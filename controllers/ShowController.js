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
      next(new ShowError('Fetching the ids failed: '+err));
    } else {
      async.map(ids, function loadById(id, callback) {
        var show = new Show(id, function (err) {
          callback(err, show.allProperties());
        });
      }, function doneLoading(err, shows) {
        if (err) {
          next(new ShowError('Fetching the list failed: '+err));
        } else {
          res.ok(shows);
        }
      });
    }
  });
});

app.get('/:id([0-9]+)', auth.isLoggedIn, loadModel('Show'), function (req, res) {
  res.ok(req.loaded['Show'].allProperties());
});


function store (req, res, next) {
  var show = req.loaded['Show'];
  var data = {
    name: req.param('name')
  };
  show.p(data, function (err) {
    if ( ! err) {
      next();
    } else {
      next(new ShowError({error: err, fields: show.errors}, 400));
    }
  });
}

function newShow (req, res, next) {
  req.loaded = {
    Show: new Show()
  };
  next();
}

app.post('/', auth.may('create', 'Show'), newShow, store);

app.put('/:id([0-9]+)', auth.isLoggedIn, auth.may('edit', 'Show'), loadModel('Show'), store);

app.get('/checkName', function (req, res, next) {
  
});

app.del('/:id([0-9]+)', auth.isLoggedIn, auth.may('delete', 'Show'), loadModel('Show'), function (req, res, next) {
  req.loaded['Show'].remove(function (err) {
    if (err) {
      next(new ShowError('Delete failed: '+err, 500));
    } else {
      res.ok();
    }
  });
});


app.mounted(function (parent){
  console.log('mounted Show REST controller');
});

module.exports = app;