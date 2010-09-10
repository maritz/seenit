"use strict";

var express = require('express');


module.exports.init = function (global) {
  var Models = global.Models,
  app = express.createServer(),
  idGetter = function idGetter(req, res, callback) {
    var season = new Models.Season();
    season.load(req.param('id'), function (err) {
      if (err) {
        res.render_locals.errors = err;
      } else {
        res.render_locals.id = season.id;
        res.render_locals.values = season.allProperties();
      }
      var show = new Models.Show();
      season.getAll('Show', 'parent', function (err, ids) {
        if (!err) {
          res.render_locals.parent_id = ids[0];
          show.load(ids[0], function (err) {
            callback(season, show);
          });
        } else {
          callback(season, show);
        }
      });
    });
  };  
  app.set('view engine', 'jade');
  
  app.get('/new/:show_id', function (req, res, next) {
    var id = parseInt(req.param('show_id'), 10),
    show = new Models.Show();
    show.load(id, function (err) {
      if (err) {
        res.render_locals.errors.Show = err;
      }
      res.render_locals.show_id = id;
      show.numLinks('Season', function (err, num_seasons) {
        res.render_locals.values = {
          number: num_seasons + 1
        };
        res.render('season/new', {
          locals: res.render_locals
        });
      });
    });
  });
  
  app.post('/new', function (req, res, next) {
    var season = new Models.Season(),
    show = new Models.Show(),
    errors = {};
    show.load(req.body.show_id, function (err) {
      if (err) {
        errors = err;
      } else {
        season.p(req.body);
        console.dir(season.allProperties());
        var renderForm = function () {
          res.render_locals.errors = errors;
          res.render_locals.values = req.body;
          res.render_locals.show_id = req.param('show_id');
          res.render('season/new', {
            locals: res.render_locals
          });
        };
        
        season.save(function (err) {
          if (!err) {
            show.link(season, null, true, function (err) {
              if (err) {
                errors = err;
                season.remove(function () {
                  renderForm();
                });
              } else {
                res.redirect('/season/details/' + season.id);
              }
            });
          } else if (err === 'invalid') {
            errors = season.errors;
            renderForm();
          } else {
            errors.general = err.toString();
            renderForm();
          }
        });
      }
    });
  });
  
  app.get('/delete/:id', function (req, res, next) {
    idGetter(req, res, function (season) {
      res.render('season/delete', {
        locals: res.render_locals
      });
    });
  });
  
  app.post('/delete', function (req, res, next) {
    if (req.body.cancel) {
      res.redirect('/season/details/' + req.body.id);
    } else {
      idGetter(req, res, function (season) {
        season.getAll('Episode', function (err, episodes) {
          var i = 0, len = episodes.length, episode = [];
          for (; i < len; i = i + 1) {
            episode[i] = new Models.Episode();
            episode[i].id = episodes[i];
            episode[i].remove();
          }
          season.remove(function (err) {
            if (err) {
              res.render_locals.errors = err;
              res.render('season/delete', {
                locals: res.render_locals
              });
            } else {
              res.redirect('/');
            }
          });
        });
      });
    }
  });
  
  app.get('/details/:id', function (req, res, next) {
    idGetter(req, res, function (season) {
      season.getAll('Episode', function (err, episodes) {
        res.render_locals.episodes = episodes;
        res.render('season/details', {
          locals: res.render_locals
        });  
      });
    });
  });
  
  return app;
};