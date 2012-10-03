var nohm = require('nohm').Nohm;
var xml = require('libxmljs');
var config = require(__dirname+'/../config.js').thetvdb;
var request = require('request');
var fs = require('fs');
var child_process = require('child_process');
var async = require('async');
var rimraf = require('rimraf');

var key = config.key;
var tmp_path = config.tmp_path;
var banner_path = config.banner_path;
var base = '/api/';

var mirror_url = config.mirror_fetching_url.replace('<apikey>', key);
var bitmask = {
  xmlmirrors: 0x1,
  bannermirrors: 0x2,
  zipmirrors: 0x4
};

var mirror_refresh = config.refresh_timers.mirrors*1000*60;

var readXmlFiles = function (path, callback) {
  fs.readdir(path, function (err, files) {
    if (err) {
      callback(err);
    } else {
      files = files.map(function (file) {
        return path+'/'+file;
      });
      async.map(files, fs.readFile, function (err, bodies) {
        if (err) {
          callback(err);
        } else {
          async.map(bodies, parseXML, callback);
        }
      });
    }
  });
};

var getZip = function (url, callback) {
  var name = tmp_path+(+new Date())+'-'+Math.ceil(Math.random()*100000);
  var ws = fs.createWriteStream(name+'.zip');
  var cleanup = function (error, docs) {
    rimraf(name, function (err) {
      if (err) {
        console.log(err);
      }
    });
    fs.unlink(name+'.zip');
    callback(error, docs);
  };
  ws.on('close', function () {
    fs.mkdir(name, undefined, function () {
      child_process.exec('unzip '+name+'.zip', 
        {cwd: name}, 
        function (error) {
          if (error) {
            cleanup(error);
          } else {
            readXmlFiles(name, cleanup);
          }
        }
      );
    });
  });
  request(url).pipe(ws);
};

var getXML = function (url, callback) {
  request.get(url, function (err, res, body) {
    if (err) {
      callback(err);
    } else if (res.statusCode !== 200) {
      callback('Request failed: '+res.statusCode+' '+url);
    } else if (res.headers["content-type"].indexOf('/xml') === -1) {
      callback('Request returned wrong content type:'+res.headers["content-type"]);
    } else {
      parseXML(body, callback);
    }
  });
};

var parseXML = function (body, callback) {
  if (typeof(body) !== 'string') {
    body = body.toString('utf8');
  }
  body = body.replace(/\n/g, '').replace(/>[\s]{2,}<([^\/])/g, '><$1').trim(); // hack to remove whitespace :/
  var doc;
  try {
    doc = xml.parseXmlString(body);
  } catch (e) {
    callback(e);
  }
  callback(null, doc);
};

var getText = function (node, default_text) {
  if (node) {
    return node.text();
  } else {
    return default_text || '';
  }
};

var nodeToJson = function (node) {
  var json = {};
  var property_nodes = node.childNodes();
  if (Array.isArray(property_nodes)) {
    property_nodes.forEach(function (node) {
      json[node.name()] = node.text();
    });
  }
  return json;
};

var fillShowFromDataXml = function (show, doc) {
  var data = doc.get('//Series');
  if (data.get('id')) {
    var id = getText(data.get('id'));
    show.p({
      name: getText(data.get('SeriesName'), 'Unknown series name, id: '+id),
      tvdb_id: id,
      imdb_id: getText(data.get('IMDB_ID')),
      genre: getText(data.get('Genre')),
      description: getText(data.get('Overview')),
      language: 'en'
    });
  }
  var episodes = doc.find('//Episode');
  if (Array.isArray(episodes) && episodes.length > 0) {
    var seasons = [];
    
    episodes.forEach(function (ep) {
      ep = nodeToJson(ep);
      if (seasons.indexOf(ep.SeasonNumber) === -1) {
        seasons.push(ep.SeasonNumber);
      }
      if (ep.EpisodeNumber) {
        var episode_model = nohm.factory('Episode');
        episode_model.p({
          tvdb_id: ep.id,
          imdb_id: ep.IMDB_ID,
          name: ep.EpisodeName,
          number: ep.EpisodeNumber,
          first_aired: ep.FirstAired,
          plot: ep.Overview,
          season: ep.SeasonNumber
        });
        show.link(episode_model, {
          error: function (err, errors, episode) {
            console.log('link_error', err, errors, episode.allProperties());
          }
        });
        show.link(episode_model, {
          name: 'season'+ep.SeasonNumber,
          error: function (err, errors, episode) {
            console.log('season link_error', err, errors, episode.allProperties());
          }
        });
      }
    });
    
    seasons.sort();
    show.p({
      num_seasons: seasons.length,
      seasons: seasons
    });
  }
  return show;
};

var getBannerFromDataXml = function (show, doc, id, language, tvdb) {
  var data = doc.find('//Banner');
  if (Array.isArray(data)) {
    var banners = {
      graphical: [],
      text: [],
      blank: []
    };
    data.forEach(function (banner) {
      banner = nodeToJson(banner);
      if (banner.BannerType === 'series' && banner.Language === language) {
        banners[banner.BannerType2].push(banner);
      }
    });
    var type;
    if (banners.graphical.length > 0) {
      type = 'graphical';
    } else if (banners.text.length > 0) {
      type = 'text';
    } else if (banners.blank.length > 0) {
      type = 'blank';
    } else {
      return false;
    }
    var chosen = banners[type][0];
    var extension = chosen.BannerPath.substr(chosen.BannerPath.lastIndexOf('.'));
    var file_name = banner_path+id+extension;
    show.p('banner', id+extension);
    tvdb.selectMirror.call(tvdb, 'banner', function (err, url) {
      if ( ! err && url) {
        var ws = fs.createWriteStream(file_name);
        console.log('TVDB: downloading banner from', url+'/banners/'+chosen.BannerPath);
        request(url+'/banners/'+chosen.BannerPath).pipe(ws);
      }
    });
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
      defaultValue: +new Date()
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
          if (type !== 'banner') {
            url += base; // default += '/api/'
          }
          callback(null, url);
        }
      });
    },
    
    _tvdbRequest: function (specific_url, type, callback) {
      if (typeof(type) === 'function') {
        callback = type;
        type = 'xml';
      }
      this.selectMirror(type, function (err, url) {
        if (err) {
          callback(err);
        } else {
          if (specific_url.indexOf('php') === -1) {
            url += key;
          }
          switch (type) {
            case 'xml':
              getXML(url+specific_url, callback);
              break;
            case 'zip':
              getZip(url+specific_url, callback);
          }
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
      var self = this;
      var set_key = 'temp_tvdb_cache:getseries:'+name;
      var redis = require(__dirname+'/../registry.js').redis;
      redis.lrange(set_key, 0, -1, function (err, series) {
        if (err || series.length === 0) {
          self._tvdbRequest('/GetSeries.php?seriesname='+encodeURIComponent(name), function (err, doc) {
            if (err) {
              callback(err);
            } else {
              var multi = redis.multi();
              var arr = doc.find('//Series').map(function (serie) {
                var values = {
                  name: getText(serie.get('SeriesName')),
                  description: getText(serie.get('Overview')),
                  id: getText(serie.get('seriesid')),
                  first_aired: getText(serie.get('FirstAired'))
                };
                multi.rpush(set_key, JSON.stringify(values));
                return values;
              });
              multi.expire(set_key, 60*60); // expire in one hour
              multi.exec();
              callback(null, arr);
            }
          });
        } else {
          callback(null, series.map(function (item) {
            try {
              return JSON.parse(item);
            } catch (e) {
            }
          }));
        }
      });
    }, 
    
    importSeries: function (id, language, callback) {
      var self = this;
      var show = nohm.factory('Show');
      if (typeof (language) === 'function') {
        callback = language;
        language = 'en';
      }
      id = parseInt(id, 10);
      if (id > 0) {
        show.find({
          tvdb_id: ''+id
        }, function (err, ids) {
          if ( ! err && ids.length === 0) {
            self._tvdbRequest('/series/'+id+'/all/'+language+'.zip', 'zip', function (err, documents) {
              if (err) {
                callback(err, show);
              } else {
                documents.forEach(function (doc) {
                  var name = doc.root().name();
                  switch (name) {
                    case 'Data':
                      fillShowFromDataXml(show, doc);
                      break;
                    case 'Banners':
                      getBannerFromDataXml(show, doc, id, language, self);
                      break;
                  }
                });
                show.save({
                  continue_on_link_error: true
                }, function (err, linkage_error, link_name) {
                  if (err && linkage_error) {
                    console.log('TVDB Error: while importing the linking of an episode failed for this relation:', link_name);
                  }
                  callback(err, show);
                });
              }
            });
          } else if (err) {
            callback(err, show);
          } else {
            show.load(ids[0], function (err) {
              callback(err, show);
            });
          }
        });
      } else {
        console.log('Called tvdbModel.importSeries with invalid id', arguments[0]);
        return callback('invalid id');
      }
    },
    
    refreshData: function () {
      var self = this;
      // TODO: update last_data_refresh and throw if something goes wrong.
      async.waterfall([
        async.apply(this.selectMirror, 'xml'),
        function (mirror, next) {
          var update_url = mirror+'Updates.php?type=all&time='+self.p('last_data_refresh')/1000;
          getXML(update_url, next);
        }
      ], function (err, results) {
        if (err) {
          console.log('ERROR', 'Refreshing data from TheTVDB failed. Error message:', err);
        } else {
          
          // Update raw Show data
          results.find('//Series').forEach(function (node) {
            var tvdb_id = getText(node);
            async.auto({
              id: function (done) {
                nohm.factory('Show').find({
                  tvdb_id: tvdb_id
                }, done);
              },
              show: ['id', function (done, results) {
                if (results.id.length > 0) {
                  var show = nohm.factory('Show', results.id[0], function (err) {
                    done(err, show);
                  });
                } else {
                  done('not found');
                }
              }],
              xml: ['show', function (done, results) {
                self._tvdbRequest('/series/'+tvdb_id+'/'+results.show.p('language')+'.xml', done);
              }],
              update: ['show', 'xml', function (done, results) {
                var show = results.show;
                fillShowFromDataXml(show, results.xml);
                show.save(done);
              }]
            }, function (err, results) {
              if (err && err !== 'not found') {
                console.log('ERROR', 'Refreshing data from TheTVDB failed (2). Error message:', err);
              }
            });
          });
          
          // Update/Add Episodes
          results.find('//Episode').forEach(function (node) {
            var tvdb_id = getText(node);
            var episode = nohm.factory('Episode');
            var show = nohm.factory('Show');
            async.waterfall([
              function (done) {
                episode.find({
                  tvdb_id: tvdb_id
                }, done); 
              }, 
              function (ids, done) {
                if (ids.length > 0) {
                  
                  // Update existing episode
                  episode.load(ids[0], function () {
                    episode.getAll('Show', 'defaultForeign', done);
                  });
                  
                } else {
                  
                  // Add new episode IF it's from a show we track
                  self._tvdbRequest('/episodes/'+tvdb_id+'/en.xml', function (err, doc) {
                    if (err) {
                      done(err);
                    } else {
                      var show_tvdb_id = getText(doc.get('//seriesid'));
                      show.find({
                        tvdb_id: show_tvdb_id
                      }, done);
                    }
                  });
                }
              },
              function (ids, done) {
                if (!ids[0]) {
                  done('not found');
                } else {
                  show.load(ids[0], done);
                }
              },
              function (props, done) {
                self._tvdbRequest('/episodes/'+tvdb_id+'/'+show.p('language')+'.xml', done);
              }, function (docs, done) {
                var ep = nodeToJson(docs.get('//Episode'));
                if (ep.EpisodeNumber) {
                  show.addSeason(ep.seasonNumber);
                  episode.p({
                    tvdb_id: ep.id,
                    imdb_id: ep.IMDB_ID,
                    name: ep.EpisodeName,
                    number: ep.EpisodeNumber,
                    first_aired: ep.FirstAired,
                    plot: ep.Overview,
                    season: ep.SeasonNumber
                  });
                  if ( ! episode.inDB) {
                    show.link(episode, {
                      error: function (err, errors, episode) {
                        console.log('link_error', err, errors, episode.allProperties());
                      }
                    });
                    show.link(episode, {
                      name: 'season'+ep.SeasonNumber,
                      error: function (err, errors, episode) {
                        console.log('season link_error', err, errors, episode.allProperties());
                      }
                    });
                  }
                  episode.save(done);
                }
              },
              function (nothing, done) {
                show.save(done);
              }
            ], function (err) {
              if (err && err !== 'not found') {
                console.log('ERROR', 'Refreshing data from TheTVDB failed (3). Error message:', err);
              }
            });
          });
        }
      });
      
    }
  }
});