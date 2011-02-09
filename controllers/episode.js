"use strict";

var express = require('express');

module.exports.init = function (global) {
  var Models = global.Models,
  app = express.createServer(),
  idGetter = function idGetter(req, res, loadSeason, callback) {
    var episode = new Models.Episode();
    episode.load(req.param('id'), function (err) {
      if (err) {
        res.render_locals.errors = err;
      } else {
        res.render_locals.id = episode.id;
        res.render_locals.values = episode.allProperties();
      }
      if (!err && loadSeason) {
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
      } else {
        callback(episode);
      }
    });
  };  
  app.set('view engine', 'jade');
  
  app.use('', function (req, res, next) {
    req.checkLogin();
    res.render_locals.page_name = 'Episode';
    next();
  });
  
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
  
  var renderForm = function (req, res, errors, values, form) {
    res.render_locals.errors = errors;
    res.render_locals.values = values;
    if (form === 'new') {
      res.render_locals.season_id = req.param('season_id');
    }
    res.render('episode/' + form, {
      locals: res.render_locals
    });
  };
  
  app.post('/new', function (req, res, next) {
    var episode = new Models.Episode(),
    season = new Models.Season(),
    errors = {};
    season.load(req.body.season_id, function (err) {
      if (err) {
        errors = err;
      } else {
        episode.p(req.body);
        
        episode.save(function (err) {
          if (!err) {
            season.link(episode, null, true, function (err) {
              if (err) {
                errors = err;
                episode.remove(function (err) {
                  renderForm(req, res, errors, req.body, 'new');
                });
              } else {
                res.redirect('/episode/details/' + episode.id);
              }
            });
          } else if (err === 'invalid') {
            errors = episode.errors;
            renderForm(req, res, errors, req.body, 'new');
          } else {
            errors.general = err.toString();
            renderForm(req, res, errors, req.body, 'new');
          }
        });
      }
    });
  });
  
  app.get('/seen_switch/:id/:seen?', function (req, res, next) {
    var seen = req.params.seen || null;
    idGetter(req, res, false, function (episode) {
      if (seen === null) {
        seen = ! episode.p('seen');
      } else if (seen === 'false') {
        console.log('yep, converting "false" string');
        seen = false;
      }
      episode.p('seen', !!seen);
      episode.save(function (err) {
        res.send({error: err || null,});
      });
    });
  });
  
  app.get('/edit/:id', function (req, res, next) {
    idGetter(req, res, false, function (episode) {
      res.render_locals.values = episode.allProperties();
      res.render('episode/edit', {
        locals: res.render_locals
      });
    });
  });
  
  app.post('/edit*', function (req, res, next) {
    values = {
      name: req.body.name,
      date: req.body.date,
      seen: req.body.seen || false
    },
    errors = {};
    idGetter(req, res, false, function (episode) {
      episode.p(values);
      episode.save(function (err) {
        if (!err) {
          res.redirect('/episode/details/' + episode.id);
        } else if (err === 'invalid') {
          errors = episode.errors;
        } else {
          errors.general = err.toString();
        }
        renderForm(req, res, errors, episode.allProperties(), 'edit');
      });
    });
  });
  
  app.get('/delete/:id', function (req, res, next) {
    idGetter(req, res, false, function (episode) {
      res.render('episode/delete', {
        locals: res.render_locals
      });
    });
  });
  
  app.post('/delete', function (req, res, next) {
    if (req.body.cancel) {
      res.redirect('/episode/details/' + req.body.id);
    } else {
      idGetter(req, res, true, function (episode, season) {
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
    idGetter(req, res, true, function (episode, season) {
      var show = new Models.Show();
      season.getShow(show, function (err) {
        res.render_locals.show = show.allProperties();
        res.render('episode/details', {
          locals: res.render_locals
        });  
      })
    });
  });
  
  return app;
};