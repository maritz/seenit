var config = require(__dirname+'/config.js');
var express = require('express');

var nohm = require('nohm').Nohm;
var redis = require('redis');
var redisClient = redis.createClient(config.nohm.port || 6379);

require(__dirname+'/registry.js');

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