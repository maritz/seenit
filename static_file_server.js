var express = require('express');
var stylus = require('stylus');
var assetManager = require('connect-assetmanager');
var assetHandlers = require('connect-assetmanager-handlers');
var file_helper = require('./helpers/file.js');
var config = require('./config.js');


var oneDay = 86400000;
var server = express.createServer();

var stylus = stylus.middleware({
    src: __dirname+'/static/'
  });
server.use(stylus);

server.use(express['static'](__dirname + '/static', { maxAge: oneDay }));

var basedir = __dirname + '/static/js/';

// reverse order of how it ends up in the merged files.
var files = Array.prototype.concat(
  file_helper.getFiles(basedir, 'libs/'),
  file_helper.getFiles(basedir, 'controllers/'),
  file_helper.getFiles(basedir, 'models/'),
  file_helper.getFiles(basedir, 'views/'),
  file_helper.getFiles(basedir, '', ['modernizr-2.0.6.custom.min.js']));

assetManagerMiddleware = assetManager({
  'js': {
    'route': /\/js\/[0-9]+\/merged\.js/,
    'path': __dirname + '/static/js/',
    'dataType': 'javascript',
    'files': files,
    'preManipulate': {
      'MSIE': [],
      '^': server.set('env') === 'production' ? [
          assetHandlers.uglifyJsOptimize
        ] : [] // only minify if in production mode
    },
    'debug': server.set('env') !== 'production' // minification only in production mode
  }
});
server.use(assetManagerMiddleware);
server.use(express.favicon());

server.get('/', function (req, res, next) { 
  res.render(__dirname+'/static/index.jade', {
    layout: false,
    colons: true,
    locals: {
      cache: true,
      cacheTimestamp: assetManagerMiddleware.cacheTimestamps || {js: 0},
      js_files: server.set('env') === 'development' ? files : false,
      socket_url: config.socket.url
    }
  });
});

module.exports = server