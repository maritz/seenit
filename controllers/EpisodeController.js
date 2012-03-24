var Registry = require(__dirname+'/../registry');
var Episode = Registry.Models.Episode;
var app = require('express').createServer();
var auth = require(__dirname+'/../helpers/auth');
var async = require('async');
var loadModel = require(__dirname+'/../helpers/loadModel');
var nohm = require('nohm').Nohm;

function EpisodeError(msg, code){
  this.name = 'EpisodeError';
  if (typeof(msg) === 'string') {
    this.message = msg;
  } else {
    this.data = msg;
    this.message = 'custom';
  }
  this.code = code || 500;
  Error.call(this, msg);
}
EpisodeError.prototype.__proto__ = Error.prototype;


var profiler = require('v8-profiler');

app.get('/byShow/:id', auth.isLoggedIn, auth.may('list', 'Episode'), loadModel('Show'), function (req, res, next) {
  var season = req.param('season');
  console.time('getting ids');
  profiler.startProfiling('startup');
  var cb = function (err, ids) {
    console.timeEnd('getting ids');
    if (err) {
      next(new EpisodeError('Error while retreiving the episode ids.'));
    } else {
      console.time('loading all');
      async.map(ids, function (id, cb) {
        nohm.factory('Episode', id, function (err, data) {
          if (err) {
            cb(err);
          } else {
            req.user.belongsTo(this, 'seen', function (err, belongs) {
              if (err) {
                cb(err);
              }
              data.seen = belongs;
              data.id = id;
              cb(null, data);
            });
          }
        });
      }, function (err, episodes) {
        console.timeEnd('loading all');
        profiler.stopProfiling('startup');
        if (err) {
          console.log(err);
          next(new EpisodeError('Error while loading the episodes.'));
        } else {
          res.ok(episodes);
        }
      });
    }
  };
  if (season) {
    req.loaded.Show.getAll('Episode', 'season'+season, cb);
  } else {
    req.loaded.Show.getAll('Episode', cb);
  }
});

app.get('/season_seen/:id', auth.isLoggedIn, auth.may('view', 'Episode'), loadModel('Episode'), function (req, res, next) {
  req.loaded.Episode.toggleSeasonSeen(req.user, function (err, seen) {
    if (err) {
      if ( ! err instanceof Error) {
        err = new EpisodeError(err);
      }
      next(err);
    } else {
      res.ok({seen: seen});
    }
  });
});

app.get('/seen/:id', auth.isLoggedIn, auth.may('view', 'Episode'), loadModel('Episode'), function (req, res, next) {
  var episode = req.loaded.Episode;
  
  var resultHandler = function (err, seen) {
    if (err) {
      if ( ! err instanceof Error) {
        err = new EpisodeError(err);
      }
      next(err);
    } else {
      res.ok(seen);
    }
  };
      
  req.user.belongsTo(episode, 'seen', function (err, seen) {
    if (err) {
      resultHandler('Failed to determine original seen relation.');
    } else {
      if (seen) {
        episode.setUnseen(req.user, resultHandler);
      } else {
        episode.setSeen(req.user, resultHandler);
      }
    }
  });
});

function store (req, res, next) {
  var show = req.loaded.Show;
  show.p("name", req.param('name'));
  
  show.save(function (err) {
    if (err === 'invalid') {
      next(new EpisodeError({error: err, fields: show.errors}, 400));
    } else if (err) {
      console.log('Uknown database error in /REST/Show/store.', err);
      next(new EpisodeError('Unknown database error', 500));
    } else {
      res.ok();
    }
  });
}

app.put('/:id([0-9]+)', auth.isLoggedIn, auth.may('edit', 'Episode'), loadModel('Episode'), store);

app.del('/:id([0-9]+)', auth.isLoggedIn, auth.may('delete', 'Episode'), loadModel('Episode'), function (req, res, next) {
  req.loaded['Show'].remove(function (err) {
    if (err) {
      next(new EpisodeError('Delete failed: '+err, 500));
    } else {
      res.ok();
    }
  });
});


app.mounted(function (){
  console.log('mounted Episode REST controller');
});

module.exports = app;