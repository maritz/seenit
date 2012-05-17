var env = process.env.NODE_ENV || 'development';

var defaults = {
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
      'log level': 1,
      'flash policy server': true,
      'flash policy port': 3013,
      'destroy upgrade': true,
      'browser client': true,
      'browser client minification': true,
      'browser client etag': true,
      'browser client gzip': true
    }
  },
  "nohm": {
    url: 'localhost',
    port: 6379,
    db: 5,
    prefix: 'game'
  },
  "redis": {
    url: 'localhost',
    port: 6379,
    db: 4
  },
  "sessions": {
    secret: "super secret cat",
    db: 1
  }
};

if (env === 'production' || env === 'staging') {
  defaults["static"].port = 80;
  defaults.nohm = {
    host: 'carp.redistogo.com',
    port: 9391,
    pw: '3a8d7880bf3757d5a7af2b4029d93f17',
    db: 0,
    prefix: 'stack'
  };
  defaults.redis = {
    host: 'carp.redistogo.com',
    port: 9391,
    pw: '3a8d7880bf3757d5a7af2b4029d93f17',
    db: 0
  };
  defaults.socket.options["log level"] = 1;
}

if (env === 'staging') {
  defaults['static'].port = 3004;
}

module.exports = defaults;
