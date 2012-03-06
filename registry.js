var file_helper = require('./helpers/file.js');
Registry = {
  Models: {}
};

var model_files = file_helper.getFiles(__dirname, '/models/', ['validations.js']);
  
model_files.forEach(function (val) {
  var name = val.match(/^\/models\/([\w]*)Model.js$/)[1];
  Registry.Models[name] = require('.'+val);
});

module.exports = Registry;