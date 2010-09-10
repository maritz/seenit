"use strict";

var express = require('express');

module.exports.init = function (global) {
  var Models = global.Models,
  app = express.createServer();  
  app.set('view engine', 'jade');
  
  app.use('', function (req, res, next) {
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
  
  return app;
};