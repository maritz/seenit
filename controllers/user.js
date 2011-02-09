"use strict";

var express = require('express');

module.exports.init = function (global) {
  var Models = global.Models,
  app = express.createServer(),
  redis = global.redis;  
  app.set('view engine', 'jade');
  
  app.use('', function (req, res, next) {
    if (req.url === '/login' || req.checkLogin(false)) {
      next();
    } else {
      // if there is no user yet, creating a new user does not require a login
      redis.scard('nohm:idsets:User', function (err, value) {
        if (err !== null || value > 0) {
          req.checkLogin();
        }
        res.render_locals.page_name = 'User';
        next();
      });
    }
  });
  
  app.post('/login', function (req, res, next) {
    if (req.body.login_name) {
      var user = new Models.User(),
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
              var oldUrl = req.flash('page_accessed');
              req.session.regenerate(function () {
                req.session.user = user.allProperties();
                req.session.logged_in = true;
                var redirectUrl = req.body.pre_login_url || '/';
                if (oldUrl.length > 0 && oldUrl[0] !== '') {
                  redirectUrl = oldUrl;
                }
                res.redirect(redirectUrl);
              });
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
  
  app.get('/logout', function (req, res, next) {
    req.session.regenerate(function () {
      res.redirect('/');
    });
  });
  
  app.get('/new', function (req, res, next) {
    res.render_locals.nologin = true;
    res.render('user/new', {
      locals: res.render_locals
    });
  });
  
  app.post('/new', function (req, res, next) {
    var user = new Models.User();
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
    var user = new Models.User();
    user.load(req.param('id'), function (err) {
      if (err && err === 'not found') {
        res.send('user not found');
      } else {
        res.send('username: ' + user.p('name'));
      }
    });
  });
  
  app.get('/', function (req, res) {
    res.redirect('/user/new');
  });
  
  return app;
};