var config = require(__dirname+'/config.js');
var express = require('express');
var async = require('async');
var registry = require(__dirname+'/registry.js');

var nohm = require('nohm').Nohm;
var redis = require('redis');
var nohm_redis_client = redis.createClient(config.nohm.port, config.nohm.host, { no_ready_check: true });
nohm_redis_client.on('error', function () {
  console.log('nohm redis error: ', arguments);
});


registry.redis = redis.createClient(config.redis.port, config.redis.host, { no_ready_check: true });
registry.redis.on('error', function () {
  console.log('redis error: ', arguments);
});

nohm.setPrefix(config.nohm.prefix);

var noop = function () {};

async.series([
  function (cb) {
    if (config.redis.pw) {
      registry.redis.auth(config.redis.pw, function (err) {
        if (err) {
          cb(err)
        } else {
          registry.redis.select(config.redis.cb || 0, cb);
        }
        cb = noop;
      });
    } else {
      registry.redis.select(config.redis.cb || 0, cb);
      cb = noop;
    }
  },
  function (cb) {
    if (config.nohm.pw) {
      nohm_redis_client.auth(config.nohm.pw, function (err) {
        if (err) {
          cb(err)
        } else {
          nohm_redis_client.select(config.nohm.db || 0, cb);
          cb = noop;
        }
      });
    } else {
      nohm_redis_client.select(config.nohm.db || 0, cb);
      cb = noop;
    }
  }], 
  function (err) {
    if (err) {
      return console.log('Error: failed initialization while authing/selecting a redis DB ', err);
    }
    
    nohm.setClient(nohm_redis_client);
    
    var server = express.createServer();
    
    require('./static_file_server.js').init(server);
    
    require('./socket_server.js').init(server);
    
    server.use('/REST', require(__dirname+'/rest_server.js'));
    
    server.listen(config['static'].port || 3000);
    
    console.log('server listening on '+config['static'].port || 3000);
});