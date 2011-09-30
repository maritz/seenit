var Registry = require('../registry.js');

exports.connectionHandler = function (socket) {
  console.log('test');
  socket.emit('hio', 'test');
  socket.on('test', function (data) {
    console.dir(arguments);
  });
};