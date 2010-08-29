"use strict";

var express = require('express'),
conductor = require('conductor'),
jade = require('jade'),
nohm = require('nohm'),
MemoryStore = require('connect/middleware/session/memory');

// initialize the main app
var app = express.createServer();
app.set('view engine', 'jade');

if (app.set('env') !== 'production') {
  app.use(express.lint(app));
}

// static stuff
app.use(express.staticProvider('./public'));

// start main app pre-routing stuff
app.use(express.bodyDecoder());
app.use(express.cookieDecoder());
app.use(express.session({ store: new MemoryStore({ reapInterval: 60000 * 10 }) }));

app.use('', function (req, res, next) {
  var tmp_login = null;
  if (req.session.hasOwnProperty('flash') &&
      req.session.flash.hasOwnProperty('login')) {
    tmp_login = JSON.parse(req.flash('login')[0].replace(/&quot;/ig, '"'));
  }
  res.render_locals = {
    session: req.session,
    currentURL: req.url,
    login: tmp_login
  };
  next();
});

app.use('/user', require('./controllers/user'));

var index = function (req, res, next) {
  console.dir(req.session);
  res.render('index', {
    locals: res.render_locals
  });
};

app.get('/', index);
app.post('/', index);

app.get('*', function (req, res, next) {
  res.send('<html><head><title>404 - Not found.</title></head><body>Not found.</body></html>');
});

app.post('*', function (req, res, next) {
  console.dir(req.url);
  res.send('<html><head><title>404 - Not found.</title></head><body>Not found.</body></html>');
});

app.use(express.errorHandler({ showStack: true }));


app.listen(3000);
console.log('listening on 3000');