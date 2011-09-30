var Registry = require('../registry.js');
var helpers = require('../helpers/file.js');

var files = helpers.getFiles('', __dirname + '/static/');
console.dir(files);

exports.connectionHandler = function (socket) {
  console.log('test');
  socket.emit('hio', 'test');
  socket.on('test', function (data) {
    console.dir(arguments);
  });
};