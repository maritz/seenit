module.exports = {
  "static": {
    port: 3003
  },
  "socket": {
    options: {
      origins: '*:*',
      log: true,
      heartbeats: false,
      authorization: false,
      transports: [
        'websocket',
        'flashsocket',
        'htmlfile',
        'xhr-polling',
        'jsonp-polling'
      ],
      'log level': 3,
      'close timeout': 1000,
      'heartbeat timeout': 2,
      'heartbeat interval': 5,
      'polling duration': 20,
      'flash policy server': true,
      'flash policy port': 3013,
      'destroy upgrade': true,
      'browser client': true,
      'browser client minification': true,
      'browser client etag': true,
      'browser client handler': false,
      'client store expiration': 15
    }
  },
  "nohm": {
    port: 6379,
    db: 5,
    prefix: 'game'
  },
  "redis": {
    port: 6379,
    db: 4
  }
};