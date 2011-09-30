var fs = require('fs');

exports.getFiles = function getFiles (basedir, path, exceptions) {
  exceptions = exceptions || [];
  var files = [];
  try {
    var things = fs.readdirSync(basedir+path);
    if (Array.isArray(things)) {
      things.sort();
      things.forEach(function (value, i) {
        if (value.lastIndexOf('.js') === value.length - 3
            && exceptions.indexOf(value) === -1) {
          files.push(path + value);
        }
      });
    }
    return files;
  } catch (e) {
    console.dir(e);
    return [];
  }
}