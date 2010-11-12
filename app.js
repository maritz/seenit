"use strict";

var express = require('express'),
conductor = require('conductor'),
jade = require('jade'),
nohm = require('nohm'),
fs = require('fs'),
RedisStore = require('connect-redis');

// initialize the main app
var app = express.createServer();
app.set('view engine', 'jade');

if (app.set('env') !== 'production') {
  app.use(express.lint(app));
}

// static stuff
app.use(express.favicon());
app.use(express.staticProvider('./public'));

// start main app pre-routing stuff
app.use(express.bodyDecoder());
app.use(express.cookieDecoder());
app.use(express.session({ store: new RedisStore({ magAge: 60000 * 60 * 24 }) })); // one day

app.use('', function (req, res, next) {
  var tmp_login = null;
  if (req.session.hasOwnProperty('flash') &&
      req.session.flash.hasOwnProperty('login')) {
    tmp_login = JSON.parse(req.flash('login')[0].replace(/&quot;/ig, '"'));
  }
  res.render_locals = {
    session: req.session,
    currentURL: req.url,
    login: tmp_login,
    values: {},
    errors: {},
    input:  {
      date_parser: function (timestamp) {
        function pad (n) {
          return n < 10 ? '0' + n : n;
        }
        var date = new Date(timestamp);
        return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate());
      }
    }
  };
  req.checkLogin = function (do_redirect) {
    do_redirect = typeof(do_redirect) !== 'undefined' ? do_redirect : true;
    if (req.session.logged_in) {
      return req.session.user;
    }
    if (do_redirect) {
      var flashed = req.flash('page_accessed'),
      url = req.app.route !== '/access_denied' ?
              req.app.route :
              flashed[0];
      req.flash('page_accessed', url);
      res.redirect('/access_denied');
    }
    return false;
  };
  next();
});

var controllers = fs.readdirSync('controllers'),
controllerGlobals = {
  Models: {},
  redis: nohm.client
},
models = fs.readdirSync('models'),
node_daemon_reload_hack = function () {
  require('child_process').spawn('touch', ['app.js']);
};
for (var i = 0, len = models.length; i < len; i = i + 1) {
  if (models[i].match(/Model\.js$/i)) {
    var name = models[i].replace(/Model\.js$/i, '');
    controllerGlobals.Models[name] = require('./models/' + name + 'Model');
    // node-daemon hack follows
    fs.watchFile('./models/' + name + 'Model.js', node_daemon_reload_hack);
  }
}
for (var i = 0, len = controllers.length; i < len; i = i + 1) {
  if (controllers[i].match(/\.js$/i)) {
    var name = controllers[i].replace(/\.js$/i, '');
    app.use('/' + name, require('./controllers/' + name).init(controllerGlobals));
    // node-daemon hack follows
    fs.watchFile('./controllers/' + name + '.js', node_daemon_reload_hack);
  }
}

var index = function (req, res, next) {
  var episodes = new controllerGlobals.Models.Episode(),
  render = function () {
    res.render('index', {
      locals: res.render_locals
    });
  };
  res.render_locals.new_episodes = [];
  
  episodes.find({
    date: {
      max: (+ new Date())
    },
    seen: false
  }, function (err, ids) {
    if (err) {
      console.dir(err);
      render();
    } else if (Array.isArray(ids) && ids.length > 0) {
      var countdown = ids.length,
      counter = function () {
        countdown--;
        if (!countdown) {
          render();
        }
      };
      ids.forEach(function (id) {
        var episode = new controllerGlobals.Models.Episode(),
        season = new controllerGlobals.Models.Season(), // sadly we need the season to get to the show :(
        show = new controllerGlobals.Models.Show();
        episode.load(id, function  (err) {
          res.render_locals.new_episodes.push(episode.allProperties());
          var pos = res.render_locals.new_episodes.length - 1;
          episode.loadSeason(season, function (result) {
            if (result) {
              season.getShow(show, function (err) {
                res.render_locals.new_episodes[pos].showname = show.p('name');
                counter();
              });
            } else {
              counter();
            }
          });
        });
      });
    } else {
      render();
    }
  });
};

app.get('/', index);

app.get('/access_denied', function (req, res, next) {
  if (req.checkLogin(false) !== false) {
    res.redirect('/');
  }
  res.render('access_denied', {
    locals: res.render_locals
  });
});

app.get('*', function (req, res, next) {
  res.send('<html><head><title>404 - Not found.</title></head><body>Not found.</body></html>');
});

app.post('*', function (req, res, next) {
  res.send('<html><head><title>404 - Not found.</title></head><body>Not found.</body></html>');
});

app.use(express.errorHandler({ showStack: true }));


app.listen(3000);
console.log('listening on 3000');