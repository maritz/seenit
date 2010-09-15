"use strict";

var express = require('express');


module.exports.init = function (global) {
  var Models = global.Models,
  app = express.createServer(),
  redis = global.redis,
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
    show = new Models.Show(),
    season = new Models.Season();
    show.load(id, function (err) {
      if (err) {
        res.render_locals.errors.Show = err;
      }
      res.render_locals.show_id = id;
      res.render_locals.values = season.allProperties();
      show.numLinks('Season', function (err, num_seasons) {
        res.render_locals.values.number = num_seasons + 1;
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
        var renderForm = function () {
          res.render_locals.errors = errors;
          res.render_locals.values = season.allProperties();
          res.render_locals.show_id = req.param('show_id');
          res.render('season/new', {
            locals: res.render_locals
          });
        },
        episodes = season.p('num_episodes'),
        i = 0,
        time = season.p('start'),
        interval = season.p('interval') * 86400, // interval is saved/enterd as days
        episode,
        seen = season.p('seen'),
        season_num = season.p('number');
        if (season_num < 10) {
          season_num = '0' + season_num;
        }
        
        for (; i < episodes; i = i + 1, time = time + interval) {
          episode = new Models.Episode();
          episode.p({
            number: i + 1,
            name: 'S' + season_num + 'E' + (i < 9 ? '0' : '') + (i + 1),
            date: time,
            seen: seen
          });
          season.link(episode);
        }
        
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
      var key = season.relationKey('Episode', 'child'),
      episode = new Models.Episode(),
      hashWeightKey = episode.getHashKey('') + '*->number',
      episodes = [],
      episodeProps = [];
      redis.sort(key, 'BY', hashWeightKey, function (err, ids) {
        if (err) {
          console.dir(err);
        }
        var i = 0,
        len = ids.length,
        countdown = len,
        loadCallback = function (err) {
          if (err) {
            console.dir(err);
          }
          countdown = countdown - 1;
          if (countdown === 0) {
            for (i = 0; i < len; i = i + 1) {
              episodeProps[i] = episodes[i].allProperties();
            }
            res.render_locals.episodes = episodeProps;
            res.render('season/details', {
              locals: res.render_locals
            });
          }
        };
        for (; i < len; i = i + 1) {
          episodes[i] = new Models.Episode();
          episodes[i].load(ids[i], loadCallback);
        }  
      });
    });
  });
  
  app.get(/\/([\d])/, function (req, res, next) {
    res.redirect('/season/details/' + req.params[0]);
  });
  
  app.get('', function (req, res, next) {
    res.redirect('/show/list');
  });
  
  return app;
};