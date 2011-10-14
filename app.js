var config = require('./config.js');
var registry = require('./registry.js');
var express = require('express');

var nohm = require('nohm').Nohm;
var redisClient = require('redis').createClient(config.nohm.port || 6379);
nohm.setPrefix(config.nohm.prefix || 'game');

redisClient.select(config.nohm.db || 0, function (err) {
  if (err) {
    return console.log('Error: failed initialization while selecting the redis DB '+(config.nohm.db || 0));
  }
  
  nohm.setClient(redisClient);
  
  var server = express.createServer();
  
  require('./static_file_server.js').init(server);
  
  require('./socket_server.js').init(server);
  
  server.use('/REST', require(__dirname+'/rest_server.js'));
  
  server.listen(config['static'].port || 3000);
  
  console.log('server listening on '+config['static'].port || 3000);
});