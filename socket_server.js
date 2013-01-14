var io = require('socket.io');
var file_helper = require('./helpers/file.js');
var config = require('./config.js');
var channels = {};
var express = require('express');
var registry = require(__dirname+'/registry.js');
var RedisSessionStore = require('connect-redis')(express);

var cookieParser = express.cookieParser(registry.config.sessions.secret);
var SessionSockets = require('session.socket.io');

exports.init = function (server) {
  io = io.listen(server, config.socket.options);
  
  var redisStore = new RedisSessionStore({
    client: registry.redis_sessions
  });
  
  var sessionSockets = new SessionSockets(io, redisStore, cookieParser);
    
  sessionSockets.on('connection', function (err, socket, session) {
    if (err) {
      return console.log('sessionsocket connection error', err);
    }
    socket.on('login', function () {
      redisStore.get(socket.handshake.session_id, function (err, session) {
        if (err) {
          socket.emit('error', err);
        } else {
          if ( ! socket.handshake) {
            console.log(socket, err, session)
          }
          socket.handshake.session = session;
          socket.emit('login_confirmed');
        }
      });
    });
  });

  var controller_files = file_helper.getFiles(__dirname, '/socket_controllers/');
  
  controller_files.forEach(function (val) {
    var name = val.match(/^\/socket_controllers\/([\w]*)SocketChannel.js$/)[1];
    var controller = require('.'+val);
    var connectionHandler = controller.connectionHandler;
    if (typeof (connectionHandler) === "function" ) {
      channels[name] = sessionSockets.of('/'+name);
      if (typeof(controller.authorization) === 'function') {
        channels[name].authorization(controller.authorization);
      }
      channels[name].on('connection', function (err, socket) {
        if (err) {
          return console.log('sessionsocket connection error', err);
        }
        connectionHandler(socket);
      });
    } else {
      console.log('Warning: Found socket controller without connection Handler export:', name);
    }
  });
};