"use strict";

var express = require('express');

module.exports.init = function (global) {
  var Models = global.Models,
  app = express.createServer(),
  idGetter = function idGetter(req, res, callback) {
    var episode = new Models.Episode();
    episode.load(req.param('id'), function (err) {
      if (err) {
        res.render_locals.errors = err;
      } else {
        res.render_locals.id = episode.id;
        res.render_locals.values = episode.allProperties();
      }
      var season = new Models.Season();
      episode.getAll('Season', 'parent', function (err, ids) {
        if (!err) {
          res.render_locals.parent_id = ids[0];
          season.load(ids[0], function (err) {
            callback(episode, season);
          });
        } else {
          callback(episode, season);
        }
      });
    });
  };  
  app.set('view engine', 'jade');
  
  app.get('/new/:episode_id', function (req, res, next) {
    var id = parseInt(req.param('episode_id'), 10),
    season = new Models.Season();
    season.load(id, function (err) {
      if (err) {
        res.render_locals.errors.Season = err;
      }
      res.render_locals.season_id = id;
      season.numLinks('Episode', function (err, num_episodes) {
        res.render_locals.values = {
          number: num_episodes + 1
        };
        res.render('episode/new', {
          locals: res.render_locals
        });
      });
    });
  });
  
  app.post('/new', function (req, res, next) {
    var episode = new Models.Episode(),
    season = new Models.Season(),
    errors = {};
    season.load(req.body.season_id, function (err) {
      if (err) {
        errors = err;
      } else {
        episode.p(req.body);
        var renderForm = function () {
          res.render_locals.errors = errors;
          res.render_locals.values = req.body;
          res.render_locals.season_id = req.param('season_id');
          res.render('episode/new', {
            locals: res.render_locals
          });
        };
        
        episode.save(function (err) {
          if (!err) {
            season.link(episode, null, true, function (err) {
              if (err) {
                errors = err;
                episode.remove(function (err) {
                  renderForm();
                });
              } else {
                res.redirect('/episode/details/' + episode.id);
              }
            });
          } else if (err === 'invalid') {
            errors = episode.errors;
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
    idGetter(req, res, function (episode) {
      res.render('episode/delete', {
        locals: res.render_locals
      });
    });
  });
  
  app.post('/delete', function (req, res, next) {
    if (req.body.cancel) {
      res.redirect('/episode/details/' + req.body.id);
    } else {
      idGetter(req, res, function (episode, season) {
        episode.remove(function (err) {
          if (err) {
            res.render_locals.errors = err;
            res.render('episode/delete', {
              locals: res.render_locals
            });
          } else {
            res.redirect('/season/details/' + season.id);
          }
        });
      });
    }
  });
  
  app.get('/details/:id', function (req, res, next) {
    idGetter(req, res, function (episode) {
      episode.getAll('Episode', function (err, episodes) {
        res.render_locals.episodes = episodes;
        res.render('episode/details', {
          locals: res.render_locals
        });  
      });
    });
  });
  
  return app;
};