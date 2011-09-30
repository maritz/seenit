var file_helper = require('./helpers/file.js');
module.exports = Registry = {};

var model_files = file_helper.getFiles(__dirname, '/models/');
  
model_files.forEach(function (val) {
  var name = val.match(/^\/models\/([\w]*)Model.js$/);
  Registry[name] = require('.'+val);
});