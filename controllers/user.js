"use strict";

var express = require('express');
var nohm = require('nohm');


var app = module.exports = express.createServer();
app.set('view engine', 'jade');

var redis = nohm.redis.createClient();
var hashing = require('hashlib');
var seed = 'pAUFBPIBAPSONkplanfpoinf0938fp93noNNFW)§(NWP)NPognOISNMPG=)WNGPOASNGMPA)§NMNp98n3wnnPN9nf89wP()fnWP)NFWfn9';
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
    pw = pw.substr(pw.length / 2 + 1, pw.length) + seed + pw.substr(0, pw.length / 2);
    return hashing.sha512(pw);
  }
});

app.post('/login', function (req, res, next) {
  if (req.body.login_name) {
    var user = new User(),
    password = user.passwordHash(req.body.login_password),
    wrongAttempt = function () {
      console.log('wrong login attempt from: ' + req.socket.remoteAddress +
                    ' with name: "' + req.body.login_name + '"');
      req.flash('login', JSON.stringify({name: req.body.login_name, error: true}));
      res.redirect(req.body.pre_login_url || '/');
    };
    req.body.login_password = ''; // better safe than sorry.
    user.find({name: req.body.login_name}, function (err, values) {
      if (!err && values.length === 1) {
        user.load(values[0], function (err) {
          if (user.p('password') === password) {
            req.session.user = user;
            req.session.logged_in = true;
            res.redirect(req.body.pre_login_url || '/');
          } else {
            wrongAttempt();
          }
        });
      } else {
        wrongAttempt();
      }
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
