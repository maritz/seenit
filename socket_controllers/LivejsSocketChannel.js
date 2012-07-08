var exec = require('child_process').exec;
var fs = require('fs');
var EventEmitter = new require('events').EventEmitter;

var e = new EventEmitter();
e.setMaxListeners(100);

var file_list;
exec('find static/', function(err, stdout, stderr) {
  file_list = stdout.split('\n');
  file_list.forEach(function (name) {
    fs.stat(name, function (err, stats) {
      if (!err && stats.isFile()) {
        fs.watchFile(name, {persistent: false, interval: 1500}, function (curr, prev) {
          if (curr.mtime > prev.mtime) {
            console.log('File '+name+' changed, emitting check');
            var file_name = name.replace(/^static/, '');
            var ext = file_name.substr(file_name.lastIndexOf('.'));
            if (ext === '.styl') {
              file_name = '/css/style.css';
              ext = '.css';
            }
            e.emit('checkResources', {
              file_name: file_name, 
              ext: ext
            });
          }
        });
      }
    });
  });
});

exports.connectionHandler = function (socket) {
  console.log('Watching files for changes and sending changes to the client via websocket');
  var checkResources = function (filename) {
    console.log('sending checkResources');
    socket.emit('checkResources', filename);
  }
  
  e.on('checkResources', checkResources);
  
  socket.on('disconnect', function () {
    e.removeListener('checkResources', checkResources);
  });
};