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
      'browser client gzip': false
    }
  },
  "nohm": {
    url: 'localhost',
    port: 6379,
    db: 3,
    prefix: 'seenit'
  },
  "redis": {
    url: 'localhost',
    port: 6379,
    db: 2
  },
  "sessions": {
    secret: "super secret cat",
    db: 1
  },
  "thetvdb": {
    key: require('fs').readFileSync(__dirname+'/thetvdb.key', 'utf8').trim(),
    mirror_fetching_url: 'http://www.thetvdb.com/api/<apikey>/mirrors.xml',
    tmp_path: __dirname+'/tmp/',                                  // path where zip files are temporarily stored
    banner_path: __dirname+'/static/images/series_banners/',      // path where the banner images are stored
    refresh_timers: {                                             // every x minutes
      mirrors: 1000*60*60*24*7,                                           // these should change rarely and a refresh should also be triggered if one times out
      data: 1000*60*60*6
    }
  }
};

if (env === 'production' || env === 'staging') {
  defaults["static"].port = 3001;
}

if (env === 'staging') {
  defaults['static'].port = 3001;
}

module.exports = defaults;
