var file_helper = require('./helpers/file.js');
var express = require('express');
var server = express.createServer();

module.exports = server;

server.use(express.bodyParser());
server.use(express.methodOverride());
server.use(express.cookieParser());
server.use(express.session({ secret: "some secret this is " }));

server.use(function (req, res, next) {
  res.ok = function (data) {
    data = data || {};
    res.json({result: 'success', data: data});
  };
  
  // csrf check
  if (['POST', 'PUT', 'DELETE'].indexOf(req.method) !== -1) {
    var tokens = req.session.csrf_tokens;
    if (typeof (tokens) === 'undefined') {
      return next(new Error('crsf failure (request token first)'));
    }
    var user_token = req.param('csrf-token');
    var index = tokens.indexOf(user_token);
    if (tokens.length === 0 ||  index=== -1) {
      return next(new Error('crsf failure'));
    } else {
      tokens.splice(index, 1);
    }
  }
  next();
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

server.mounted(function (parent){
  console.log('mounted REST server');
});