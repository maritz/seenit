var nohm = require('nohm').Nohm;
var crypto = require('crypto');
var redis = require('../registry').redis;
var async = require('async');
var _ = require('underscore');

var hasher = function hasher (password, salt) {
  var hash = crypto.createHash('sha512');
  hash.update(password);
  hash.update(salt);
  return hash.digest('base64');
};

// thanks to senchalabs for this uid snippet
var uid = function uid () {
  return ((Date.now() & 0x7fff).toString(32) + (0x100000000 * Math.random()).toString(32));
};

var password_minlength = 6;
var default_acl = ['view', 'list', 'create', 'edit', 'delete'];

module.exports = nohm.model('User', {
  idGenerator: 'increment',
  properties: {
    name: {
      type: 'string',
      unique: true,
      validations: [
        'notEmpty',
        ['length', {
          min: 3
        }]
      ]
    },
    email: {
      type: 'string',
      unique: true,
      validations: [
        ['email', {
          optional: true
        }]
      ]
    },
    password: {
      load_pure: true, // this ensures that there is no typecasting when loading from the db.
      type: function (value) {
        var salt,
            valueDefined = value && typeof(value.length) !== 'undefined';
        if ( valueDefined && value.length >= password_minlength) {
          salt = uid();
          this.p('salt', salt);
          return hasher(value, salt);
        } else {
          return value;
        }
      },
      validations: [
        'notEmpty',
        ['length', {
          min: password_minlength
        }]
      ]
    },
    salt: {
      // DO NOT CHANGE THE SALTING METHOD, IT WILL INVALIDATE STORED PASSWORDS!
    },
    acl: {
      type: 'json',
      defaultValue: {
        User: ['self', 'create'],
        Show: ['view', 'list'],
        Episode: ['view', 'list']
      }
    },
    admin: {
      type: 'bool',
      defaultValue: false
    },
    
    searches: {
      type: 'string',
      defaultValue: 'https://www.google.com/search?q=%name Season %season Episode %episode'
      // need validations
    }
  },
  methods: {
    
    allow: function (action, subject) {
      var testInstance = nohm.factory(subject);
      if (!testInstance) {
        return false;
      } else {
        var acl = this.p('acl');
        if ( ! acl.hasOwnProperty(subject) || ! Array.isArray(acl[subject])) {
          acl[subject] = [];
        }
        if (Array.isArray(action)) {
          acl[subject] = action;
        } else {
          if (action === '*') {
            acl[subject] = default_acl;
          } else if (acl[subject].indexOf(action) === -1) {
            acl[subject].push(action);
          }
        }
        this.p('acl', acl);
        return acl;
      }
    },
    
    may: function (action, subject, id, callback) {
      if (this.p('admin') === true) {
        return callback(undefined, true);
      }
      var acl = this.p('acl');
      if (acl.hasOwnProperty(subject) && Array.isArray(acl[subject])) {
        if (action !== 'self' && acl[subject].indexOf(action) !== -1) {
          return callback(undefined, true);
        } else if (action !== 'grant' && acl[subject].indexOf('self') !== -1) {
          var subject_instance = nohm.factory(subject);
          
          if (subject_instance.hasOwnProperty('isSelf') && typeof(subject_instance.isSelf) === 'function') {
            return subject_instance.isSelf(this, id, callback);
          }
        }
      }
      
      // did not find the proper role
      callback(undefined, false);
    },
    
    deny: function (action, subject) {
      var self = this;
      var testInstance = nohm.factory(subject);
      if (!testInstance) {
        return false;
      } else {
        var acl = this.p('acl');
        if ( ! acl.hasOwnProperty(subject)) {
          return acl;
        }
        if (Array.isArray(action)) {
          return action.forEach(function (item) {
            self.deny(item, subject);
          });
        } else {
          if (action === '*') {
            delete acl[subject];
          } else {
            var index = acl[subject].indexOf(action);
            if (index !== -1) {
              acl[subject].splice(index, 1);
            }
          }
        }
        this.p('acl', acl);
        return acl;
      }
    },
    
    isSelf: function (selfUser, id, callback) {
      callback(undefined, parseInt(id, 10) === parseInt(selfUser.id, 10));
    },
    
    
    login: function (name, password, callback) {
      var self = this;
      if (!name || name === '' || !password || password === '') {
        callback(false);
        return;
      }
      this.find({name: name}, function (err, ids) {
        if (err || ids.length === 0) {
          callback(false);
        } else {
          self.load(ids[0], function (err) {
            if (!err && self.p('password') === hasher(password, self.p('salt'))) {
              callback(true);
            } else {
              callback(false);
            }
          });
        }
      });
    },
    
    fill: function (data, fieldCheck) {
      var props = {},
          self = this,
          doFieldCheck = typeof(fieldCheck) === 'function',
          fields = Object.keys(data);
      
      fields.forEach(function (i) {
        var fieldCheckResult;
        
        if (! self.properties.hasOwnProperty(i))
          return;
          
        if (doFieldCheck)
          fieldCheckResult = fieldCheck(i, data[i]);
          
        if (doFieldCheck && fieldCheckResult === false)
          return;
        else if (doFieldCheck && typeof (fieldCheckResult) !== 'undefined' &&
                fieldCheckResult !== true)
          return (props[i] = fieldCheckResult);
          
        
        props[i] = data[i];
      });
     
      this.p(props);
      return props;
    },
    
    store: function (data, callback) {
      var self = this;
      
      this.fill(data, function (field, data) {
        switch (field) {
          case 'salt':
          case 'admin':
          case 'acl':
            return false; // make sure these aren't set via store. use the special methods or .p() directly.
          case 'password':
            if( self.id && ! data) {
              return false; // creating a user without a password is not allowed
            }
        }
      });
      this.save(function () {
        delete self.errors.salt;
        callback.apply(self, Array.prototype.slice.call(arguments, 0));
      });
    },
    
    // makes sure there is no accidental exposure of the password/salt through allProperties
    allProperties: function (show_privates, stringify) {
      var props = this._super_allProperties.call(this);
      if ( ! show_privates) {
        delete props.email;
        delete props.acl;
      }
      delete props.password;
      delete props.salt;
      return stringify ? JSON.stringify(props) : props;
    },
    
    /**
     * Get the id of the next up episode for a given show.
     * This is precached for every user to reduce computation time.
     * Returns null if no nextup episode is set or all episodes have been marked as seen.
     */
    getNextUp: function (show, callback) {
      var self = this;
      var key = 'seenit:nextUp:'+self.id+':'+show.id;
      redis.get(key, function (err, id) {
        if (id === 'done' || id === null) {
          callback(err, null, id === 'done');
        } else {
          callback(null, id, null);
        }
      });
    },
    
    /**
     * Checks if setting an episode to seen/unseen changes the next up episode and if so changes nextup
     */
    checkSeenChangesNextUp: function (seen, id, callback) {
      var self = this;
      var checkEpisode = nohm.factory('Episode');
      var nextUpEpisode;
      var show;
      
      async.waterfall([
        function (cb_waterfall) {
          checkEpisode.load(id, cb_waterfall);
        },
        function (unused_props, cb_waterfall) {
          if (checkEpisode.prop('season') === 0) {
            cb_waterfall('nothing to be done'); // we ignore specials
          } else {
            checkEpisode.getShow(cb_waterfall);
          }
        }, 
        function (loaded_show, cb_waterfall) {
          // load the next up show
          show = loaded_show;
          self.getNextUp(show, cb_waterfall);
        },
        function (nextUpEpisode_id, showCompletelySeen, cb_waterfall) {
          // check if we can decide just by looking at the ids
          if (nextUpEpisode_id === null) {
            cb_waterfall('increment');
          } else if (showCompletelySeen) {
            cb_waterfall('nothing to be done');
          } else if (nextUpEpisode_id === id) {
            if (seen) {
              cb_waterfall('increment');
            } else {
              cb_waterfall('nothing to be done');
              console.log('WARNING', 'An episode was marked as unseen even though it was also the nextUp.', self.id, id, nextUpEpisode_id);
            }
          } else {
            cb_waterfall(null, nextUpEpisode_id);
          }
        },
        function (nextUpEpisode_id, cb_waterfall) {
          // load the nextUpEpisode
          nextUpEpisode = nohm.factory('Episode', nextUpEpisode_id, cb_waterfall);
        },
        function (unused_props, cb_waterfall) {
          var nextUpSeason = nextUpEpisode.p('season');
          var checkSeason = checkEpisode.p('season');
          if (nextUpSeason > checkSeason) {
            cb_waterfall('set to id');
          } else if (nextUpSeason < checkSeason) {
            cb_waterfall('nothing to be done');
          } else {
            // compare episodes
            var nextUpNumber = nextUpEpisode.p('number');
            var checkNumber = checkEpisode.p('number');
            if (nextUpNumber < checkNumber) {
              cb_waterfall('nothing to be done');
            } else {
              cb_waterfall('set to id');
            }
          }
        }
      ], function (err) {
        if (err === 'increment') {
          self.setNextUp(show, callback);
        } else if (err === 'set to id') {
          self.setNextUp(show, id, callback);
        } else {
          if (err === 'nothing to be done') {
            err = null;
          }
          callback(err);
        }
      });
    },
    
    /**
     * Sets the nextUp episode to the given id
     */
    setNextUp: function (show, id, callback) {
      var self = this;
      if (id === null || typeof id === 'function') {
        // TODO: This should be optimized. first check the next episode by getEpisodeByNumbering and then do computeNextUp.
        if (typeof id === 'function') {
          callback = id;
        }
        this.computeNextUp(show, function (err, id) {
          if (err) {
            callback(err);
          } else if (id) {
            self.setNextUp(show, id, callback);
          } else {
            callback(null);
          }
        });
      } else {
        redis.set('seenit:nextUp:'+this.id+':'+show.id, id, callback);
      }
    },
    
    /**
     * Setup the next up episode for a given show.
     * This automatically computes the next one in line and chaches it in the property nextUp.
     */
    computeNextUp: function (show, callback) {
      // this can be computationally heavy and should thus be called as few times as possible.
      var self = this;
      var seasons = _.range(1, show.p('num_seasons'));
      if (show.p('seasons')[0] === "1") {
        seasons.push(show.p('num_seasons')); // no special seasons, since range is exclusive we need to add one here
      }
      
      async.waterfall([
        
        function (cb_waterfall) {
          // get an episode of each season
          async.map(seasons, function (season, cb_map) {
            show.getEpisodeByNumbering(season, 1, function (err, episode) {
              if (err === 'not found') {
                cb_map(null, null);
              } else {
                cb_map(err, episode);
              }
            });
          }, cb_waterfall);
        },
        
        function (seasonEpisodes, cb_waterfall) {
          // get the first season that isn't marked as seen
          var error = null;
          async.detectSeries(seasonEpisodes, function (episode, cb_detect) {
            if (episode === null) {
              cb_detect(false);
            } else {
              episode.getSeasonSeen(self, function (err, seen) {
                if (err) {
                  error = err;
                }
                cb_detect(!seen);
              });
            }
          }, function (season) {
            if (!error && !season) {
              cb_waterfall('nothing to be done');
            } else {
              cb_waterfall(error, season);
            }
          });
        },
        
        function (seasonEpisode, cb_waterfall) {
          // get all episode ids of the season
          seasonEpisode.getSeasonEpisodes(cb_waterfall);
        },
        
        function (episode_ids, unused_show, cb_waterfall) {
          // sort ids by number in season
          nohm.factory('Episode').sort({
            field: 'number',
            amount: episode_ids.length,
          }, episode_ids, cb_waterfall);
        },
        
        function (episode_ids, cb_waterfall) {
          var first_unseen = null;
          // get the first episode that isn't marked as seen
          async.forEachSeries(episode_ids, function (id, cb_forEach) {
            var episode = nohm.factory('Episode', id, function (err) {
              if (err) {
                cb_forEach(err);
              } else {
                episode.getSeen(self, function (err, seen) {
                  if (err) {
                    cb_forEach(err);
                  } else {
                    if (!seen) {
                      first_unseen = episode.id;
                      cb_forEach('found one');
                    } else {
                      cb_forEach();
                    }
                  }
                });
              }
            });
          }, function (err) {
            if (err === 'found one') {
              err = null;
            }
            cb_waterfall(err, first_unseen);
          });
        },
      ], function (err, id) {
        if (err === 'nothing to be done') {
          err = null;
          id = null;
        }
        callback(err, id);
      });
      
    }
  }
});
