var nohm = require('nohm').Nohm;
var search = require('reds').createSearch('reds:show');
var async = require('async');
var _ = require('underscore');

search.client = require('../registry.js').redis;

module.exports = nohm.model('Show', {
  properties: {
    name: {
      type: 'string',
      unique: true,
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
        console.log('save proxy', err);
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
        callback(err, following);
      });
    },
    
    /**
     * Get the number of how many people are following a show.
     */
    getPopularity: function (callback) {
      this.getAll('User', 'followingForeign', function (err, ids) {
        callback(err, ids.length);
      });
    }
    
  }
});


var show = nohm.factory('Show');
show.find(function (err, ids) {
  console.log('reindexing shows');
  ids.forEach(function (id) {
    nohm.factory('Show', id, function () {
      console.log('indexing', this.p('name'));
      search.index(this.p('name'), this.id);
    });
  });
});