var nohm = require('nohm').Nohm;
var registry = require(__dirname+'/registry');
var file_helper = require('./helpers/file.js');

var connector = require('./helpers/redisConnector');

connector.connect(function () {
  
  var model_files = file_helper.getFiles(__dirname, '/models/', ['validations.js']);
    
  model_files.forEach(function (val) {
    var name = val.match(/^\/models\/([\w]*)Model.js$/)[1];
    registry.Models[name] = require('.'+val);
  });
  
  // load the tvdb model for global use via the registry
  var tvdb = nohm.factory('tvdb', 1, function () {
    registry.tvdb = tvdb;
    tvdb.refreshData(function (err) {
      if (err) {
        throw err;
      }
      connector.quit(function () {
        console.log('Done.');
      });
    });
  });
  
});