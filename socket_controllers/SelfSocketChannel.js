var registry = require(__dirname+'/../registry.js');


var checkMessages = function (socket, name, amount) {
  registry.redis.lpop('messages:'+name, function (err, msg) {
    if (err) {
      console.log('Error in SelfSocketChannel', err);
    } else {
      if (msg !== null) {
        socket.emit('new_msg', {
          msg: msg
        });
        if (--amount > 0) {
          checkMessages(socket, name, amount);
        }
      }
    }
  });
}

exports.connectionHandler = function (socket) {
  console.log('A logged in user "'+socket.handshake.session.userdata.name+'" connected to the self socket.');

  var name = socket.handshake.session.userdata.name;

  registry.redis_sub.subscribe('messages:'+name);
  
  registry.redis_sub.on('message', function (channel, amount) {
    checkMessages(socket, name, amount);
  });
  
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