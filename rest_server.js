var file_helper = require('./helpers/file');
var express = require('express');
var server = express();
var nohm = require('nohm').Nohm;
var registry = require(__dirname+'/registry');
var RedisSessionStore = require('connect-redis')(express);
var cp = require('child_process');
var fs = require('fs');

// load the tvdb model for global use via the registry
var tvdb = nohm.factory('tvdb', 1, function (err, model) {
  registry.tvdb = tvdb;
  tvdb.getMirrors(function () {
    
    
    var timedUpdate = function () {
      
      process.stdout.write('Updating... ');
      
      var update_log = fs.createWriteStream('update.log', {
        flags: 'a'
      });
      
      var update_process = cp.spawn('node', ['update_shows.js'], {
        env: process.env
      });
      
      update_process.stdout.pipe(update_log);
      
      update_process.on('exit', function () {
        console.log('Done.')
        setTimeout(function () {
          timedUpdate();
        }, registry.config.thetvdb.refresh_timers.data);
      });
    };
    
    timedUpdate();
    
  });
});

module.exports = server;

if (server.set('env') === 'production' || server.set('env') === 'staging') {
  server.use(express.logger({ immediate: true }));
} else {
  server.use(express.logger({ format: 'dev' }));
  server.use(express.responseTime());
}


server.use(express.bodyParser());
server.use(express.methodOverride());
server.use(express.cookieParser());
server.use(express.session({
  store: new RedisSessionStore({
    client: registry.redis_sessions
  }),
  secret: registry.config.sessions.secret
}));

server.use(express.csrf());

server.use(function (req, res, next) {
  res.ok = function (data) {
    data = data || {};
    res.json({result: 'success', data: data});
  };
  
  //console.log(req.method, req.url);
  req.loaded = {};
  req.user = nohm.factory('User');
  if ( req.session.userdata && ! isNaN(req.session.userdata.id)) {
    req.user.load(req.session.userdata.id, function (err) {
      if (err) {
        req.session.logged_in = false;
        req.session.userdata = undefined;
      }
      next();
    });
  } else {
    next();
  }
});

  
var controller_files = file_helper.getFiles(__dirname, '/controllers/');

controller_files.forEach(function (val) {
  var name = val.match(/^\/controllers\/([\w]*)Controller.js$/)[1];
  
  server.use('/'+name, require(__dirname+val));
});

server.all('*', function (req, res, next) {
  var notFoundError = new Error('Resource not available with given METHOD and URL.');
  console.log(req.method, req.url);
  notFoundError.code = 404;
  next(notFoundError);
});

server.use(function (err, req, res, next) {
  if (err && err instanceof Error) {
    console.log('responding with error: '+err.name);
    console.dir(err.message);
    var code = err.code || 500;
    var data = err.data || {error: {name: err.name, msg: err.message}};
    res.json({result: 'error', data: data}, code);
    if (['ReferenceError', 'TypeError', 'SyntaxError'].indexOf(err.name) >= 0) {
      console.log(err.stack);
    }
  } else {
    console.log('uncaught error');
    console.dir(err);
    next(err);
  }
});

server.on('mount', function (parent){
  console.log('mounted REST server');
});
