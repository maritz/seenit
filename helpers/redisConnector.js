var config = require(__dirname+'/../config.js');
var registry = require(__dirname+'/../registry.js');
var nohm = require('nohm').Nohm;
var redis = require('redis');
var async = require('async');

exports.connect = function (cb) {
  
  var nohm_redis_client = redis.createClient(config.nohm.port, config.nohm.host, { no_ready_check: true });
  nohm_redis_client.on('error', function () {
    console.log('nohm redis error: ', arguments);
  });
  
  registry.redis_sessions = redis.createClient(config.redis.port, config.redis.host, { no_ready_check: true });
  registry.redis_sessions.on('error', function () {
    console.log('redis error: ', arguments);
  });
  
  registry.redis = redis.createClient(config.redis.port, config.redis.host, { no_ready_check: true });
  registry.redis.on('error', function () {
    console.log('redis error: ', arguments);
  });
  registry.redis_pub = redis.createClient(config.redis.port, config.redis.host, { no_ready_check: true });
  registry.redis_pub.on('error', function () {
    console.log('redis error: ', arguments);
  });
  registry.redis_sub = redis.createClient(config.redis.port, config.redis.host, { no_ready_check: true });
  registry.redis_sub.on('error', function () {
    console.log('redis error: ', arguments);
  });
  
  var noop = function () {};
  
  var authAndSelect = function (client, db, pw) {
    return function (cb) {
      if (pw) {
        client.auth(pw, function (err) {
          if (err) {
            cb(err)
          } else {
            client.select(db || 0, cb);
          }
          cb = noop;
        });
      } else {
        client.select(db || 0, cb);
        cb = noop;
      }
    }
  }
  
  async.series([
    authAndSelect(registry.redis_sessions, config.sessions.db, config.redis.pw),
    authAndSelect(registry.redis, config.redis.db, config.redis.pw),
    authAndSelect(registry.redis_pub, config.redis.db, config.redis.pw),
    authAndSelect(registry.redis_sub, config.redis.db, config.redis.pw),
    authAndSelect(nohm_redis_client, config.nohm.db, config.nohm.pw)
    ],
    function (err) {
      if (err) {
        return console.log('Error: failed initialization while authing/selecting a redis DB ', err);
      }
      
      nohm.setClient(nohm_redis_client);
      nohm.setPrefix(config.nohm.prefix);
      
      cb();
    }
  );
  
};