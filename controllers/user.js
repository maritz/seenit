"use strict";

var express = require('express');
var nohm = require('nohm');


var app = module.exports = express.createServer();
app.set('view engine', 'jade');

var redis = nohm.redis.createClient();
var hashing = require('hashlib');
var User = nohm.Model.extend({
  constructor: function () {
    this.modelName = 'User';
    this.properties = {
      name: {
        type: 'string',
        unique: true,
        validations: [
          'notEmpty'
        ]
      },
      password: {
        type: 'string',
        index: true,
        validations: [
          'notEmpty'
        ]
      }
    };
    nohm.Model.call(this);
  },
  passwordHash: function (pw) {
    return hashing.sha512(pw);
  }
});

app.post('/login', function (req, res, next) {
  console.log('login process started');
  console.dir(req.body);
  if (req.body.login_name) {
    console.log('login process has everything');
    var user = new User(),
    password = user.passwordHash(req.body.login_password),
    userid = user.find({name: req.body.login_name}, function (err, values) {
      if (!err) {
        console.log('values found:');
        console.dir(values);
        //req.session.user = user;
        //req.session.logged_in = true;
      } else {
        console.log('wrong login attempt from: ' + req.socket.remoteAddress +
                    ' with name: "' + req.body.login_name + '"');
        req.flash('login', JSON.stringify({name: req.body.login_name, error: true}));
      }
      res.redirect(req.body.pre_login_url || '/');
    });
  }
});

app.get('/new', function (req, res, next) {
  res.render_locals.errors = null;
  res.render('user/new', {
    locals: res.render_locals
  });
});

app.post('/new', function (req, res, next) {
  var user = new User();
  user.p({
    name: req.body.name,
    password: req.body.password !== '' ?
                user.passwordHash(req.body.password) :
                null
  });
  user.save(function (err) {
    var errors = {};
    if (!err) {
      if (!req.session.logged_in) {
        req.session.user = user.allProperties();
        req.session.logged_in = true;
        res.redirect('/');
      } else {
        res.redirect('/');
      }
    } else if (err === 'invalid') {
      errors = user.errors;
    } else {
      errors.general = err.toString();
    }
    res.render_locals.nologin = true;
    res.render_locals.errors = errors;
    res.render_locals.values = req.body;
    res.render('user/new', {
      locals: res.render_locals
    });
  });
});

app.get('/details/:id', function (req, res, next) {
  res.send('useer ' + req.param('id'));
});
