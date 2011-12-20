var config = require(__dirname+'/config.js');
var express = require('express');
var async = require('async');

var nohm = require('nohm').Nohm;
var redis = require('redis');
var nohm_redis_client = redis.createClient(config.nohm.port);

var registry = require(__dirname+'/registry.js');

registry.redis = redis.createClient(config.redis.port);

nohm.setPrefix(config.nohm.prefix);

async.series([
  function (cb) {
    registry.redis.select(config.redis.db || 0, cb);
  },
  function (cb) {
    nohm_redis_client.select(config.nohm.db || 0, cb);
  }], 
  function (err) {
    if (err) {
      return console.log('Error: failed initialization while selecting a redis DB ');
    }
    
    nohm.setClient(nohm_redis_client);
    
    var server = express.createServer();
    
    require('./static_file_server.js').init(server);
    
    require('./socket_server.js').init(server);
    
    server.use('/REST', require(__dirname+'/rest_server.js'));
    
    server.listen(config['static'].port || 3000);
    
    console.log('server listening on '+config['static'].port || 3000);
});