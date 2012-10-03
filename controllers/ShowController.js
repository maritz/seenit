var Registry = require(__dirname+'/../registry');
var Show = Registry.Models.Show;
var app = require('express').createServer();
var auth = require(__dirname+'/../helpers/auth');
var async = require('async');
var loadModel = require(__dirname+'/../helpers/loadModel');
var nohm = require('nohm').Nohm;

var tvdb = nohm.factory('tvdb', 1, function (err) {
  if (err) {
    console.log('error while initializing tvdb model:', err);
  }
});

function ShowError(msg, code, err){
  this.name = 'ShowError';
  if (typeof(msg) === 'string') {
    this.message = msg;
  } else {
    this.data = msg;
    this.message = 'custom';
  }
  this.code = code || 500;
  Error.call(this, msg);
  console.log(this, err);
}
ShowError.prototype.__proto__ = Error.prototype;


app.get('/', auth.isLoggedIn, auth.may('list', 'Show'), function (req, res, next) {
  Show.sort({
    field: 'name'
  }, function (err, ids) {
    if (err) {
      next(new ShowError('Fetching the ids failed.', 500, err));
    } else {
      async.map(ids, function loadById(id, callback) {
        async.auto({
          show: function (done) {
            nohm.factory('Show', id, function () {
              done(null, this);
            });
          },
          popularity: ['show', function (done, loaded) {
            loaded.show.getPopularity(done);
          }],
          following: ['show', function (done, loaded) {
            loaded.show.getUserIsFollowing(req.user, done);
          }]
        }, function doneLoading(err, result) {
          var props = result.show.allProperties();
          props.popularity = result.popularity;
          props.following = result.following;
          callback(err, props);
        });
      }, function doneMapping (err, shows) {
        if (err) {
          next(new ShowError('Fetching the list failed.', 500, err));
        } else {
          res.ok({
            total: shows.length,
            per_page: 10,
            collection: shows.sort(function (a, b) {
              if (a.popularity > b.popularity) {
                return -1;
              } else if (a.popularity < b.popularity) {
                return 1;
              } else {
                return a.name.toLowerCase() > b.name.toLowercase ? 1 : -1;
              }
            })
          });
        }
      });
    }
  });
});


app.get('/view/:id', auth.isLoggedIn, auth.may('view', 'Show'), loadModel('Show'), function (req, res, next) {
  req.loaded.Show.getUserIsFollowing(req.user, function (err, is_following) {
    if (err) {
      next(new ShowError('Failed to determine if user is following show', 500, err));
    } else {
      var props = req.loaded.Show.allProperties();
      props.following = is_following;
      res.ok(props);
    }
  });
});


app.put('/follow/:id', auth.isLoggedIn, auth.may('view', 'Show'), loadModel('Show'), function (req, res, next) {
  req.loaded.Show.setFollow(req.user, true, function (err, following) {
    if (err) {
      next(new ShowError('Failed to follow the show.', 500, err));
    } else {
      res.ok(following);
    }
  });
});


app.put('/unfollow/:id', auth.isLoggedIn, auth.may('view', 'Show'), loadModel('Show'), function (req, res, next) {
  req.loaded.Show.setFollow(req.user, false, function (err, following) {
    if (err) {
      next(new ShowError('Failed to unfollow the show.', 500, err));
    } else {
      res.ok(following);
    }
  });
});


app.get('/search/:name', function (req, res, next) {
  var name = req.param('name');
  var show = new Show();
  
  show.search(name, function (err, shows) {
    if (err) {
      next(new ShowError('Search failed.', 500, err));
    } else {
      res.ok(shows);
    }
  });
});


app.get('/searchTVDB/:name', function (req, res, next) {
  var name = req.param('name');
  tvdb.searchSeries(name, function (err, result) {
    if (err) {
      next(new ShowError('TheTVDB query failed.', 502, err));
    } else {
      res.ok(result);
    }
  });
});


app.get('/import/:id', function (req, res, next) {
  var id = req.param('id');
  async.waterfall([
    function (cb) {
      tvdb.importSeries(id, 'en', cb);
    },
    function (show, cb) {
      show.link(req.user, 'imported_by');
      show.save(function (err) {
        cb(err, show);
      });
    }
  ], function (err, show) {
    if (err) {
      next(new ShowError('Importing the show failed.', 502, err));
    } else {
      res.ok(show.id);
    }
  });
});


app.get('/del/:id', auth.isLoggedIn, auth.may('delete', 'Show'), loadModel('Show'), function (req, res, next) {
  req.loaded.Show.getAll('Episode', function (err, ids) {
    if (err) {
      next(new ShowError('Error getting all episodes', 500, err));
    } else {
      ids.forEach(function (id) {
        var ep = nohm.factory('Episode');
        ep.id = id;
        ep.remove(id, function (err) {
          if (err) {
            console.log('There was an error while trying to remove an episode form a /Show/del/'+req.param('id'), err);
          }
        });
      });
      req.loaded.Show.remove(function (err) {
        if (err) {
          next(new ShowError('Delete failed.', 500, err));
        } else {
          res.ok();
        }
      });
    }
  });
});


app.mounted(function (){
  console.log('mounted Show REST controller');
});

module.exports = app;