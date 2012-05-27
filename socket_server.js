var io = require('socket.io');
var file_helper = require('./helpers/file.js');
var config = require('./config.js');
var channels = {};
var express = require('express');
var nohm = require('nohm').Nohm;
var registry = require(__dirname+'/registry.js');
var RedisSessionStore = require('connect-redis')(express);
var parseCookie = require('express/node_modules/connect').utils.parseCookie;

exports.init = function (server) {
  io = io.listen(server, config.socket.options);
  
  var redisStore = new RedisSessionStore({
    client: registry.redis_sessions
  });
  
  io.configure(function (){
    io.set('authorization', function (data, callback) {
      if (data.headers.cookie) {
        var cookie = parseCookie(data.headers.cookie);
        data.session_id = cookie["connect.sid"]
        redisStore.get(data.session_id, function (err, session) {
          if (err) {
            callback(err);
          } else {
            data.session = session;
            callback(null, true);
          }
        });
      } else {
        callback('Need cookie.', false);
      }
    });
  });
  
  io.sockets.on('connection', function (socket) {
    socket.on('login', function () {
      redisStore.get(socket.handshake.session_id, function (err, session) {
        if (err) {
          socket.emit('error', err);
        } else {
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
    var connectionHandler = controller.connectionHandler
    if (typeof (connectionHandler) === "function" ) {
      channels[name] = io.of('/'+name);
      if (typeof(controller.authorization) === 'function') {
        channels[name].authorization(controller.authorization);
      }
      channels[name].on('connection', connectionHandler);
    } else {
      console.log('Warning: Found socket controller without connection Handler export:', name);
    }
  });
};