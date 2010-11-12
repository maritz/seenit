"use strict";

var express = require('express');

module.exports.init = function (global) {
  var Models = global.Models,
  app = express.createServer();  
  app.set('view engine', 'jade');
  
  app.use('', function (req, res, next) {
    req.checkLogin();
    res.render_locals.page_name = 'Shows';
    next();
  });
  
  app.get('/new', function (req, res, next) {
    res.render('show/new', {
      locals: res.render_locals
    });
  });
  
  app.post('/new', function (req, res, next) {
    var show = new Models.Show();
    show.p({
      name: req.body.name
    });
    show.save(function (err) {
      var errors = {};
      if (!err) {
        res.redirect('/show/details/' + show.id);
      } else if (err === 'invalid') {
        errors = show.errors;
      } else {
        errors.general = err.toString();
      }
      res.render_locals.errors = errors;
      res.render_locals.values = req.body;
      res.render('show/new', {
        locals: res.render_locals
      });
    });
  });
  
  app.get('/edit/:id', function (req, res, next) {
    var show = new Models.Show();
    show.load(req.param('id'), function (err) {
      if (err) {
        res.render_locals.errors = err;
      } else {
        res.render_locals.values = show.allProperties();
      }
      res.render('show/edit', {
        locals: res.render_locals
      });
    });
  });
  
  app.post('/edit', function (req, res, next) {
    var show = new Models.Show();
    show.load(req.body.id, function (err) {
      show.p({
        name: req.body.name
      });
      show.save(function (err) {
        var errors = {};
        if (!err) {
          res.redirect('/show/details/' + show.id);
        } else if (err === 'invalid') {
          errors = show.errors;
        } else {
          errors.general = err.toString();
        }
        res.render_locals.errors = errors;
        res.render_locals.values = req.body;
        res.render('show/edit', {
          locals: res.render_locals
        });
      });
    });
  });
  
  app.get('/details/:id', function (req, res, next) {
    var show = new Models.Show();
    show.load(req.param('id'), function (err) {
      if (err) {
        res.render_locals.errors = err;
      } else {
        res.render_locals.values = show.allProperties();
      }
      show.getAll('Season', function (err, seasons) {
        res.render_locals.seasons = seasons;
        res.render('show/details', {
          locals: res.render_locals
        });  
      });
    });
  });
  
  app.get('/list', function (req, res, next) {
    var show = new Models.Show();
    res.render_locals.shows = [];
    show.find(function (err, ids) {
      if (ids.length === 0) {
        res.redirect('/show/new');
      }
      var len = ids.length,
      lenFor = len, i = 0,
      setShow = function (err) {
        if (err) {
          console.log(err);
        }
        len = len - 1;
        if (len === 0) {
          res.render_locals.shows.sort(function (a, b) {
            var a = a.p('name')
            , b = b.p('name');
            if (a > b) {
              return 1;
            } else if (a < b) {
              return -1;
            }
            return 0;
          });
          res.render('show/list', {
            locals: res.render_locals
          });
        }
      };
      res.render_locals.shows = [];
      for (; i < lenFor; i = i + 1) {
        res.render_locals.shows[i] = new Models.Show();
        res.render_locals.shows[i].load(ids[i], setShow);
      }
    });
  });
  
  app.get('', function (req, res, next) {
    res.redirect('/show/list');
  });
  
  return app;
};