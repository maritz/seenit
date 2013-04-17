var nohm = require('nohm').Nohm;
var async = require('async');
var _ = require("underscore");

module.exports = nohm.model('Episode', {
  properties: {
    name: {
      type: 'string'
    },
    tvdb_id: {
      type: 'integer',
      unique: true
    },
    imdb_id: {
      type: 'string',
      unique: true
    },
    season: {
      type: 'integer'
    },
    number: {
      type: 'integer',
      index: true
    },
    first_aired: {
      type: 'timestamp',
      index: true
    },
    plot: {
      type: 'string'
    }
  },
  methods: {
    
    isSelf: function (selfUser, id, callback) {
      callback(undefined, id === selfUser.id);
    },
    
    getShow: function (callback) {
      this.getAll('Show', 'defaultForeign', function  (err, ids) {
        if (err) {
          callback(err);
        } else {
          var show = nohm.factory('Show', ids[0], function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, show);
            }
          });
        }
      });
    },
    
    getSeen: function (user, callback) {
      user.belongsTo(this, 'seen', callback);
    },
    
    setUnseen: function (user, callback) {
      var self = this;
      this.getShow(function (err, show) {
        if (err) {
          callback('Failed to load the show of the episode.');
        } else {
          user.unlink(self, 'seen');
          user.unlink(show, 'seen_season_'+self.p('season'));
          user.save(function (err) {
            if (err) {
              callback('Failed to set Episode as unseen.');
            } else {
              user.checkSeenChangesNextUp(false, self.id, function (err) {
                callback(err, {episode: false, season: false});
              });
            }
          });
        }
      });
    },
    
    setSeen: function (user, callback) {
      var self = this;
      this.getSeasonEpisodes(function (err, ids, show) {
        if (err) {
          callback('Failed to get season episodes.');
        } else {
          async.every(ids, function (id, next) {
            if (id === self.id) {
              next(true);
            } else {
              var episode = nohm.factory('Episode');
              episode.id = id;
              episode.getSeen(user, function (err, seen) {
                next(!err && seen);
              });
            }
          }, function (result) {
            user.link(self, 'seen');
            if (result) {
              user.link(show, 'seen_season_'+self.p('season'));
            }
            user.save(function (err) {
              if (err) {
                callback('Failed to set Episode as unseen.');
              } else {
                user.checkSeenChangesNextUp(true, self.id, function (err) {
                  callback(err, {episode: true, season: result});
                });
              }
            });
          });
        }
      });
    },
    
    getSeasonEpisodes: function (callback) {
      var season = this.p('season');
      this.getShow(function (err, show) {
        if (err) {
          callback(err);
        } else {
          show.getAll('Episode', 'season'+season, function(err, ids) {
            callback(err, ids, show);
          });
        }
      });
    },
    
    toggleSeasonSeen: function (user, callback) {
      var season_rel = 'seen_season_'+this.p('season');
      this.getSeasonEpisodes(function (err, ids, show) {
        if (err) {
          callback(err);
        } else {
          user.belongsTo(show, season_rel, function (err, seen) {
            if (err) {
              callback('Failed to toggle Season seen/unseen.');
            } else {
              var action = seen ? 'unlink' : 'link';
              ids.forEach(function (id) {
                var episode = nohm.factory('Episode');
                episode.id = id;
                user[action](episode, 'seen');
              });
              user[action](show, season_rel);
              user.save(function (err) {
                if (err) {
                  callback('Failed to set Season as '+(seen?'':'un')+'seen.');
                } else {
                  user.computeNextUp(show, function (err, id) {
                    if (err) {
                      callback(err, !seen);
                    } else {
                      user.setNextUp(show, id, function (err) {
                        callback(err, !seen);
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    },
    
    
    getSeasonSeen: function (user, callback) {
      var season_rel = 'seen_season_'+this.p('season');
      async.waterfall([
        async.apply(this.getShow),
        function (show, done) {
          user.belongsTo(show, season_rel, done);
        }
      ], function (err, seen) {
        if (err) {
          callback('Failed to get Season seen/unseen.');
        } else {
          callback(null, seen);
        }
      });
    },
    
    
    setSeenUpTo: function (user, callback) {
      var self = this;
      
      async.auto({
        "show": self.getShow,
        
        "previous_seasons_episode_ids": ["show", function (cb_auto, auto) {
          // set previous seasons
          var seasons = auto.show.p("seasons");
          seasons = seasons.filter(function (season) {
            return season !== "0" && season < self.p("season");
          });
          
          async.concat(seasons, function (season, cb_forEach) {
            auto.show.getAll("Episode", "season"+season, cb_forEach);
          }, cb_auto);
        }],
        
        "previous_seasons_episodes": ["show", "previous_seasons_episode_ids", function (cb_auto, auto) {
          // set previous seasons
          async.map(auto.previous_seasons_episode_ids, function (episode_id, cb_map) {
            var episode = nohm.factory("Episode", episode_id, function (err) {
              cb_map(err, episode);
            });
          }, cb_auto);
        }],
        
        "this_seasons_episode_ids": ["show", function (cb_auto, auto) {
          auto.show.getAll("Episode", "season"+self.p("season"), cb_auto);
        }],
        
        "this_seasons_episodes": ["this_seasons_episode_ids", function (cb_auto, auto) {
          async.map(auto.this_seasons_episode_ids, function (episode_id, cb_map) {
            var episode = nohm.factory("Episode", episode_id, function (err) {
              cb_map(err, episode);
            });
          }, cb_auto);
        }],
        
        "previous_episodes_this_season": ["this_seasons_episodes", function (cb_auto, auto) {
          cb_auto(null, auto.this_seasons_episodes.filter(function (episode) {
            return episode.p("number") <= self.p("number");
          }));
        }],
        
        "link": ["previous_seasons_episodes", "previous_episodes_this_season", function (cb_auto, auto) {
          
          var all_episodes = auto.previous_episodes_this_season.concat(auto.previous_seasons_episodes);
          
          all_episodes.forEach(function (episode) {
            user.link(episode, {
              name: "seen",
              error: function (err, err_type, obj) {
                console.log("EpisodeModel.setSeenUpTo() link error", err, err_type, obj);
              }
            });
          });
          cb_auto(null, all_episodes);
        }]
      }, function (err, results) {
        if (err) {
          callback(err);
        } else {
          user.save(function (err) {
            callback(err, _.pluck(results.link, "id"));
          });
        }
      });
    }
  }
});
