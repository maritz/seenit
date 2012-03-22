var nohm = require('nohm').Nohm;
var async = require('async');

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
      type: 'integer'
    },
    first_aired: {
      type: 'timestamp'
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
          nohm.factory('Show', ids[0], function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, this);
            }
          });
        }
      });
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
            }
            callback(null, {episode: false, season: false});
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
              user.belongsTo(episode, 'seen', function (err, seen) {
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
                callback(null, {episode: true, season: result});
              }
            });
          });
        }
      });
    },
    
    getSeasonEpisodes: function (callback) {
      var self = this;
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
    }
  }
});
