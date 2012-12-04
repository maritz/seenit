var nohm = require('nohm').Nohm;
var reds = require('reds');
var async = require('async');
var _ = require('underscore');

reds.client = require('../registry.js').redis;
var search = reds.createSearch('reds:show');

module.exports = nohm.model('Show', {
  properties: {
    name: {
      type: 'string',
      index: true,
      validations: [
        'notEmpty'
      ]
    },
    tvdb_id: {
      type: 'string',
      unique: true
    },
    imdb_id: {
      type: 'string',
      unique: true
    },
    genre: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    num_seasons: {
      type: 'integer'
    },
    seasons: {
      type: 'json',
      defaultValue: []
    },
    banner: {
      type: 'string'
    },
    language: {
      type: 'string',
      defaultValue: 'en'
    }
  },
  methods: {
    
    isSelf: function (selfUser, id, callback) {
      callback(undefined, id === selfUser.id);
    },
    
    /**
     * Search for a show in our database by exact name and fulltext.
     */
    search: function (str, callback) {
      var self = this;
      var searches = ['Name', 'Fulltext'];
      async.waterfall([
        function searchFn (next) {
          async.map(searches, function (search, cb) {
            self['searchBy'+search](str, cb);
          }, next);
        }, 
        function loadFn (ids, next) {
          ids = _.union.apply(null, ids);
          async.map(ids, function (id, cb) {
            nohm.factory('Show', id, function (err, data) {
              if (err === 'not found') {
                cb(null);
              } else {
                data.id = id;
                cb(err, data);
              }
            });
          }, next);
        },
        function filterEmpty (shows, next) {
          next(null, shows.filter(function (item) {
            return item !== undefined;
          }));
        }
      ], callback);
    },
    
    /**
     * Seach by nohm name.
     */
    searchByName: function (name, callback) {
      this.find({
        name: name
      }, callback);
    },
    
    /**
     * Search by reds fulltext query.
     */
    searchByFulltext: function (name, callback) {
      search.query(name).end(callback);
    },
    
    
    /**
     * Proxy save to index the name for fulltext search
     */
    save: function (options, callback) {
      var self = this;
      
      if (typeof(options) === 'function') {
        callback = options;
        options = {};
      }
      
      this._super_save(options, function (err) {
        if (err) {
          callback.apply(self, arguments);
        } else {
          search.index(self.p('name'), self.id, callback);
        }
      });
    },
    
    
    /**
     * Proxy remove to remove the index from fulltext search
     */
    remove: function (options, callback) {
      var self = this;
      var tmp_id = this.id;
      if (typeof(options) === 'function') {
        callback = options;
        options = {};
      }
      this._super_remove(options, function (err) {
        if (err) {
          callback.apply(self, arguments);
        } else {
          search.remove(tmp_id, callback);
        }
      });
    },
    
    /**
     * Check if a user is following a show.
     */
    getUserIsFollowing: function (user, callback) {
      user.belongsTo(this, 'following', callback);
    },
    
    /**
     *  Set whether a user follows this show or not
     */
    setFollow: function (user, following, callback) {
      var self = this;
      var link_options = {
        name: 'following', 
        error: function (err, errors, obj) {
          console.log('Failed to toggle the following status of a show', err, errors, obj);
        }
      };
      if (following) {
        user.link(self, link_options);
      } else {
        user.unlink(self, link_options);
      }
      user.save(function (err) {
        if (err) {
          callback(err);
        } else if (following) {
          user.computeNextUp(self, function (err, id) {
            if (err) {
              callback(err);
            } else {
              user.setNextUp(self, id, function (err) {
                callback(err, following);
              });
            }
          });
        } else {
          callback(null, following);
        }
      });
    },
    
    /**
     * Get the number of how many people are following a show.
     */
    getPopularity: function (callback) {
      this.getAll('User', 'followingForeign', function (err, ids) {
        callback(err, ids.length);
      });
    },
    
    /**
     * Adds a season to a show
     */
    addSeason: function (season) {
      if (this.p('num_seasons') < +season) {
        this.p('num_seasons', season);
        var seasons = this.p('seasons');
        seasons.push(season);
        this.p('seasons', seasons);
      }
    },
    
    /**
     * Gets an episode based on season and numeric index of that season.
     * 
     * TODO: Make season an index so this can be solved by a simple find
     */
    getEpisodeByNumbering: function (season, number, callback) {
      var self = this;
      async.waterfall([
        function (cb_waterfall) {
          self.getAll('Episode', 'season'+season, cb_waterfall);
        },
        function (episode_ids, cb_waterfall) {
          async.map(episode_ids, function (id, cb_map) {
            var episode = nohm.factory('Episode', id, function (err) {
              cb_map(err, episode);
            });
          }, cb_waterfall);
        },
        function (episodes, cb_waterfall) {
          var episode = episodes.filter(function (episode) {
            return episode.p('number')  === number;
          });
          if (episode.length > 0) {
            cb_waterfall(null, episode[0]);
          } else {
            cb_waterfall('not found');
          }
        }
      ], callback);
    }
    
  }
});