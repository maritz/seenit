var registry = require(__dirname+'/../registry.js');


var checkMessages = function (socket, id, amount) {
  registry.redis.lpop('messages:'+id, function (err, msg) {
    if (err) {
      console.log('Error in SelfSocketChannel', err);
    } else {
      if (msg !== null) {
        console.log('emitting', id, socket.handshake.session.userdata.name, socket.handshake.session_id);
        socket.emit('new_msg', {
          msg: msg
        });
        if (--amount > 0) {
          checkMessages(socket, id, amount);
        }
      }
    }
  });
}

registry.redis_sub.psubscribe('messages:*');

var sockets = {};

registry.redis_sub.on('pmessage', function (pattern, channel, amount) {
  var id = channel.substr(channel.lastIndexOf(':')+1);
  console.log(channel, amount, id, sockets);
  if (sockets.hasOwnProperty(id)) {
    checkMessages(sockets[id], id, amount);
  }
});

exports.connectionHandlerDiabled = function (socket) {
  console.log('A logged in user "'+socket.handshake.session.userdata.name+'" connected to the self socket.');

  var id = socket.handshake.session.userdata.id;
  sockets[id] = socket;
  
  socket.on('disconnect', function () {
    console.log('BYE BYE', id);
    delete sockets[id];
  });
};

exports.authorizationDisabled = function (data, callback) {
  if ( ! data.session || ! data.session.logged_in) {
    callback('Needs login', false);
  } else {
    callback(null, true);
  }
}