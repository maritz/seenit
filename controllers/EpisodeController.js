var Registry = require(__dirname+'/../registry');
var Episode = Registry.Models.Episode;
var app = require('express')();
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


app.get('/byShow/:id/:season', auth.isLoggedIn, auth.may('list', 'Episode'), loadModel('Show'), function (req, res, next) {
  var season = req.param('season');
  var start = parseInt(req.param('offset'), 10) || 0;
  var max = 30;
  var none_found_error = 'no ids found'
  
  var data = {
    total: 0,
    per_page: max,
    collection: []
  };
  
  async.auto({
    all_ids: function(done) {
      req.loaded.Show.getAll('Episode', 'season'+season, function (err, ids) {
        if (ids.length === 0) {
          done(none_found_error);
        } else {
          done(err, ids);
        }
      });
    },
    first_episode: ['all_ids', function (done, results) {
      nohm.factory('Episode', results.all_ids[0], function () {
        done(null, this);
      });
    }],
    season_seen: ['first_episode', function (done, results) {
      results.first_episode.getSeasonSeen(req.user, done);
    }],
    sort_all_ids: ['all_ids', function (done, results) {
      Episode.sort({
        field: 'number',
        limit: [start, max]
      }, results.all_ids, done);
    }],
    load_all_episodes: ['sort_all_ids', function (done, results) {
      async.map(results.sort_all_ids, function (id, cb) {
        nohm.factory('Episode', id, function (err) {
          cb(err, this);
        });
      }, done);
    }],
    load_episodes_seen: ['season_seen', 'load_all_episodes', function (done, results) {
      async.map(results.load_all_episodes, function (episode, callback) {
        if (results.season_seen) {
          episode.seen = true;
          callback(null, episode);
        } else {
          episode.getSeen(req.user, function (err, seen) {
            episode.seen = seen;
            callback(err, episode);
          });
        }
      }, done);
    }],
    get_properties: ['load_episodes_seen', function (done, results) {
      async.map(results.load_episodes_seen, function (episode, callback) {
        var props = episode.allProperties();
        props.seen = episode.seen;
        callback(null, props);
      }, done);
    }]
  }, function (err, results) {
    if (err && err !== none_found_error) {
      console.log('Error in Episode /byShow/'+req.param('id')+'/'+req.param('season'), err, results);
      next(new EpisodeError('Failed to get episode list.'));
    } else if (err !== none_found_error) {
      data.total = results.all_ids.length;
      data.collection = results.get_properties
    }
    res.ok(data);
  });
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


app.get('/today', auth.isLoggedIn, auth.may('view', 'Episode'), function (req, res, next) {
  
  var buffer_time = 16*60*60*1000;
  
  var start = +new Date()-buffer_time;
  
  var end = +new Date()+buffer_time;
  
  async.waterfall([
    async.apply(Episode.find, {
      first_aired: {
        min: +start,
        max: +end
      }
    }),
    function (ids, cb) {
      if (ids.length > 0) {
        async.map(ids, function (id, callback) {
          var episode = nohm.factory('Episode', id, function (err) {
            callback(err, episode);
          });
        }, cb);
      } else {
        cb('none');
      }
    },
    function (episodes, cb) {
      async.filter(episodes, function (episode, callback) {
        episode.getShow(function (err, show) {
          if (err) {
            console.log('ERROR in EpisodeController/today following filter (1):', err, show.id, episode.id);
            callback(false);
          } else {
            show.getUserIsFollowing(req.user, function (err, following) {
              if (err) {
                console.log('ERROR in EpisodeController/today following filter (2):', err, show.id, episode.id);
                callback(false);
              } else {
                episode.show = show;
                callback(following);
              }
            });
          }
        });
      }, function (filtered) {
        cb(null, filtered);
      });
    }
  ], function (err, episodes) {
    if (err && err !== 'none') {
      next(err);
    } else {
      if (err === 'none') {
        episodes = [];
        err = null;
      }
      
      var properties = episodes.map(function (episode) {
        var props = episode.allProperties();
        props.show = episode.show.p('name');
        return props;
      });
      res.ok({
        collection: properties
      });
    }
  });
});


app.get('/nextUp', auth.isLoggedIn, auth.may('view', 'Episode'), function (req, res, next) {
  
  var max_future = 14*24*60*60*1000; // 14 days
    
  var end = +new Date()+max_future;
  
  async.waterfall([
    function (cb_waterfall) {
      // get shows user is following
      req.user.getAll('Show', 'following', cb_waterfall);
    },
    function (show_ids, cb_waterfall) {
      // load shows
      if (show_ids.length === 0) {
        cb_waterfall('none');
      } else {
        async.map(show_ids, function (id, cb_map) {
          var show = nohm.factory('Show', id, function (err) {
            cb_map(err, show);
          });
        }, cb_waterfall);
      }
    },
    function (shows, cb_waterfall) {
      // get the next episode_ids of the shows
      async.map(shows, function (show, cb_map) {
        req.user.getNextUp(show, function (err, id) {
          if (id === null) {
            cb_map(err, null);
          } else {
            cb_map(err, {
              show: show,
              episode_id: id
            });
          }
        });
      }, cb_waterfall);
    },
    function (results, cb_waterfall) {
      // load episodes
      results = results.filter(function (result) {
        return result !== null;
      });
      if (results.length === 0) {
        cb_waterfall('none');
      } else {
        async.map(results, function (result, cb_map) {
          nohm.factory('Episode', result.episode_id, function (err, props) {
            result.episode = props;
            cb_map(err, result);
          });
        }, cb_waterfall);
      }
    },
    function (results, cb_waterfall) {
      // filter far future and blend it!
      var episodes = results.map(function (result) {
        var episode = result.episode;
        episode.id = result.episode_id;
        episode.show = result.show.p('name');
        return episode;
      });
      episodes = episodes.filter(function (episode) {
        return +new Date(episode.first_aired) < end;
      });
      cb_waterfall(null, episodes);
    }
  ], function (err, episodes) {
    if (err && err !== 'none') {
      next(err);
    } else {
      if (err === 'none') {
        episodes = [];
        err = null;
      }
      res.ok({
        collection: episodes
      });
    }
  });
});


app.on('mount', function (){
  console.log('mounted Episode REST controller');
});

module.exports = app;