var express = require('express');
var stylus = require('stylus');
var assetManager = require('connect-assetmanager');
var assetHandlers = require('connect-assetmanager-handlers');
var file_helper = require('./helpers/file.js');
var config = require('./config.js');
var Nohm = require('nohm').Nohm;
var i18n = require(__dirname+'/helpers/i18n.js');


var oneDay = 86400000;

var stylus_middleware = stylus.middleware({
  src: __dirname+'/static/',
  compile: function compile(str, path) {
    return stylus(str)
      .set('filename', path)
      .set('compress', true)
      .use(require('nib')());
  }
});
  
exports.init = function (server) {
  
  server.use(stylus_middleware);
  
  server.use(express['static'](__dirname + '/static', { 
    maxAge: server.set('env') === 'development' ? 1 : oneDay 
  }));
  
  var basedir = __dirname + '/static/js/';
  
  // reverse order of how it ends up in the merged files.
  var files = Array.prototype.concat(
    file_helper.getFiles(basedir, 'libs/', ['modernizr-2.0.6.custom.min.js', 'jquery-1.7.1.js']),
    file_helper.getFiles(basedir, 'libs/backbone/'),
    file_helper.getFiles(basedir, 'libs/bootstrap/'),
    file_helper.getFiles(basedir, 'utility/'),
    file_helper.getFiles(basedir, 'models/'),
    file_helper.getFiles(basedir, 'collections/'),
    file_helper.getFiles(basedir, 'views/'),
    file_helper.getFiles(basedir, 'sockets/'),
    file_helper.getFiles(basedir, '')
  );
  
  var assetManagerMiddleware = assetManager({
    'js': {
      'route': /\/js\/[0-9]+\/merged\.js/,
      'path': basedir,
      'dataType': 'javascript',
      'files': files,
      'preManipulate': {
        'MSIE': [],
        '^': false && server.set('env') !== 'development' ? [
            assetHandlers.uglifyJsOptimize
          ] : [] // only minify if in production mode
      },
      /**
       * Minification doesn't work and is completely disabled.
       */
      'debug': true || server.set('env') === 'development' // minification only in production mode
    }
  });
  server.use(assetManagerMiddleware);
  server.use(express.favicon());
  
  Nohm.setExtraValidations(__dirname+'/models/validations.js');
  
  server.use(Nohm.connect());
  
  
  server.get('/', function (req, res) { 
    res.render(__dirname+'/static/index.jade', {
      layout: false,
      colons: true,
      locals: {
        cache: true,
        cacheTimestamp: assetManagerMiddleware.cacheTimestamps || {js: 0},
        i18n_hashes: JSON.stringify(i18n.getHashes()),
        js_files: server.set('env') !== 'production' ? files : false
      }
    });
  });
};
