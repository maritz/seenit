var express = require('express');
var stylus = require('stylus');
var file_helper = require('./helpers/file.js');
var Nohm = require('nohm').Nohm;
var i18n = require(__dirname+'/helpers/i18n.js');
var uglify = require('uglify-js2');
var fs = require('fs');


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
    file_helper.getFiles(basedir, 'libs/', ['modernizr-2.0.6.custom.min.js', 'jquery-1.7.1.js', 'jade-0.27.6.min.js']),
    file_helper.getFiles(basedir, 'libs/backbone/'),
    file_helper.getFiles(basedir, 'libs/bootstrap/'),
    file_helper.getFiles(basedir, 'utility/'),
    file_helper.getFiles(basedir, 'models/'),
    file_helper.getFiles(basedir, 'collections/'),
    file_helper.getFiles(basedir, 'views/'),
    file_helper.getFiles(basedir, 'sockets/'),
    file_helper.getFiles(basedir, '', ['merged.min.js', 'merged.min.js.map'])
  );
  
  if (server.set('env') !== 'development') {
    var start = +new Date();
    var files_full_path = files.map(function (file) {
      return 'static/js/'+file;
    });
    var source_map_name = "merged.min.js.map";
    var merged_js = uglify.minify(files_full_path, {
      outSourceMap: source_map_name
    });
    fs.writeFile(basedir+'merged.min.js', merged_js.code+'\n//@ sourceMappingURL='+source_map_name, function (err) {
      if (err) throw err;
      
      fs.writeFile(basedir+'merged.min.js.map', merged_js.map.replace(/static\/js\//gmi, ''), function (err) {
        if (err) throw err;
        console.log('uglifying js files done. ('+(+ new Date()-start)+'ms)');
      });
    });
  }
  
  Nohm.setExtraValidations(__dirname+'/models/validations.js');
  
  server.use(Nohm.connect());
  
  
  server.get('/', function (req, res) { 
    res.render(__dirname+'/static/index.jade', {
      layout: false,
      colons: true,
      locals: {
        cache: true,
        i18n_hashes: JSON.stringify(i18n.getHashes()),
        js_files: server.set('env') === 'development' ? files : false
      }
    });
  });
};
