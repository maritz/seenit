var exec = require('child_process').exec;
var fs = require('fs');
var EventEmitter = new require('events').EventEmitter;

var e = new EventEmitter();

var file_list;
exec('find static/', function(err, stdout, stderr) {
  file_list = stdout.split('\n');
  file_list.forEach(function (name) {
    fs.stat(name, function (err, stats) {
      if (!err && stats.isFile()) {
        fs.watchFile(name, function (curr, prev) {
          if (curr.mtime > prev.mtime) {
            console.log('File '+name+' changed, emitting check');
            e.emit('checkResources');
          }
        });
      }
    });
  });
});

exports.connectionHandler = function (socket) {
  console.log('Watching files for changes and sending changes to the client via websocket');
  
  e.on('checkResources', function () {
    socket.emit('checkResources');
  });
  
};