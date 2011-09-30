var config = require('./config.js');
var registry = require('./registry.js');

var nohm = require('nohm').Nohm;
var redisClient = require('redis').createClient(config.nohm.port || 6379);
nohm.setPrefix(config.nohm.prefix || 'game');

redisClient.select(config.nohm.db || 0, function (err) {
  if (err) {
    return console.log('Error: failed initialization while selecting the redis DB '+(config.nohm.db || 0));
  }
  
  nohm.setClient(redisClient);
  
  var static_server = require('./static_file_server.js');
  
  static_server.listen(config['static'].port || 3000);
  
  console.log('static server listening on '+config['static'].port || 3000);
    
  
  var socket_server = require('./socket_server.js').init(static_server);
  
  console.log('socket server listening on '+(config['static'].port || 3001));
});