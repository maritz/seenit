var registry = require(__dirname+'/../registry.js');


exports.connectionHandler = function (socket) {
  console.log('A logged in user "'+socket.handshake.session.userdata.name+'" connected to the self socket.');
  
  socket.on('disconnect', function () {
    console.log('BYE BYE', socket.handshake.session.userdata.name);
  });
};

exports.authorization = function (data, callback) {
  if ( ! data.session || ! data.session.logged_in) {
    callback('Needs login', false);
  } else {
    callback(null, true);
  }
}