var nohm = require('nohm').Nohm;
var xml = require('libxmljs');
var config = require(__dirname+'/../config.js').thetvdb;
var request = require('request');

var key = config.key;
var base = '/api/';

var mirror_url = config.mirror_fetching_url.replace('<apikey>', key);
var bitmask = {
  xmlmirrors: 0x1,
  bannermirrors: 0x2,
  zipmirrors: 0x4
}

var mirror_refresh = config.refresh_timers.mirrors*1000*60;

var getXML = function (url, callback) {
  request.get(url, function (err, res, body) {
    if (err) {
      callback(err);
    } else if (res.statusCode !== 200 || res.headers["content-type"].indexOf('/xml') === -1) {
      callback('Request failed: ', res.statusCode);
    } else {
      var body = body.replace(/\n/g, '').replace(/>[\s]{2,}<([^\/])/g, '><$1').trim(); // hack to remove whitespace :/
      var doc = xml.parseXmlString(body);
      callback(err, doc, body);
    }
  });
};

var getText = function (node, default_text) {
  if (node) {
    return node.text();
  } else {
    return default_text || '';
  }
};

module.exports = nohm.model('tvdb', {
  
  idGenerator: 'increment',
  
  properties: {
    mirrors: {
      type: 'json'
    },
    last_mirror_refresh: {
      type: 'integer',
      defaultValue: 0
    },
    last_data_refresh: {
      type: 'integer',
      defaultValue: 0
    }
  },
  
  methods: {
    
    getMirrors: function (callback) {
      var self = this;
      var last_refresh = self.p('last_mirror_refresh');
      
      if (typeof(callback) !== 'function') {
        callback = function () {}; 
      }
      if (this.id !== 1) {
        return callback('only one instance of tvdb allowed, check that you loaded id 1');
      }
      
      if (last_refresh !== 0 && last_refresh+mirror_refresh > +new Date()) {
        callback(null, this.p('mirrors'));
      } else {
        console.log('Fetching new TVDB api mirrors');
        getXML(mirror_url, function (err, doc) {
          if (err) {
            callback(err);
          } else {
            var mirrors_xml = doc.find('//Mirror');
            var mirrors = {
              xmlmirrors: [], 
              bannermirrors: [], 
              zipmirrors: []
            };
            
            mirrors_xml.forEach(function (mirror) {
              var type = +mirror.get('//typemask').text();
              var url = mirror.get('//mirrorpath').text();
              if (type & bitmask.xmlmirrors) {
                mirrors.xmlmirrors.push(url);
              }
              if (type & bitmask.bannermirrors) {
                mirrors.bannermirrors.push(url);
              }
              if (type & bitmask.zipmirrors) {
                mirrors.zipmirrors.push(url);
              }
            });
            
            self.p('last_mirror_refresh', +new Date());
            self.p('mirrors', mirrors);
            self.save(function () {
              callback(null, self.p('mirrors'));
            });
          }
        });
      }
    },
    
    selectMirror: function (type, callback) {
      this.getMirrors(function (err, mirrors) {
        if (err) {
          callback(err);
        } else {
          var arr = mirrors[type+"mirrors"];
          var url = arr[Math.floor(Math.random()*arr.length)];
          callback(null, url+base);
        }
      });
    },
    
    _tvdbRequest: function (specific_url, type, callback) {
      var self = this;
      if (typeof(type) === 'function') {
        callback = type;
        type = 'xml';
      }
      this.selectMirror(type, function (err, url) {
        if (err) {
          callback(err);
        } else {
          getXML(url+specific_url, function (err, doc) {
            if (err) {
              callback(err);
            } else {
              callback(null, doc);
            }
          });
        }
      });
    },
    
    _getTime: function (callback) {
      this._tvdbRequest('/Updates.php?type=none', function (err, doc) {
        if (err) {
          callback(err);
        } else {
          var time = doc.find('//Time').text();
          callback(null, time);
        }
      });
    },
    
    searchSeries: function (name, callback) {
      this._tvdbRequest('/GetSeries.php?seriesname='+name, function (err, doc) {
        if (err) {
          callback(err);
        } else {
          var arr = doc.find('//Series').map(function (serie) {
            return {
              name: getText(serie.get('SeriesName')),
              description: getText(serie.get('Overview')),
              id: getText(serie.get('seriesid')),
              first_aired: getText(serie.get('FirstAired'))
            };
          });
          callback(null, arr);
        }
      });
    }

  }
});