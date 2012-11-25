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

var mirror_refresh = config.refresh_timers.mirrors;

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


var fillShowFromDataXml = function (show, doc, no_episodes) {
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
  if ( ! no_episodes && Array.isArray(episodes) && episodes.length > 0) {
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
          console.log('Fetching '+type+':', url+specific_url);
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
    
    updateSeries: function (id, episode_ids, callback) {
      var self = this;
      var show = null;
      
      async.waterfall([
        function (next) {
          show = nohm.factory('Show', id, next);
        },
        function (props, next) {
          self._tvdbRequest('/series/'+props.tvdb_id+'/all/'+props.language+'.zip', 'zip', next);
        },
        function (documents, next) {
          documents.forEach(function (doc) {
            if (doc.root().name() === 'Data') {
              
              fillShowFromDataXml(show, doc, true);
              
              var seasons = show.p('seasons');
              
              async.forEach(doc.find('//Episode'), function (node, done) {
                var episode = nodeToJson(node);
                var episode_id = parseInt(episode.id, 10);
                
                
                var episode_model = nohm.factory('Episode');
                episode_model.find({
                  tvdb_id: episode_id
                }, function (err, ids) {
                  if (err) {
                    return done(err);
                  }
                  var setProperties = function () {
                    episode_model.p({
                      tvdb_id: episode.id,
                      imdb_id: episode.IMDB_ID,
                      name: episode.EpisodeName,
                      number: episode.EpisodeNumber,
                      first_aired: episode.FirstAired,
                      plot: episode.Overview,
                      season: episode.SeasonNumber
                    });
                  }
                  
                  var printname = 'S'+String('0'+episode.SeasonNumber).slice(-2)+'E'+String('0'+episode.EpisodeNumber).slice(-2);
                  
                  if (ids.length === 0) {
                    console.log('Adding', show.p('name'), printname);
                    
                    setProperties();
                    
                    if (seasons.indexOf(episode.SeasonNumber) === -1) {
                      seasons.push(episode.SeasonNumber);
                    }
                    show.link(episode_model, {
                      error: function (err, errors, episode) {
                        console.log('link_error', err, errors, episode.allProperties());
                      }
                    });
                    show.link(episode_model, {
                      name: 'season'+episode.SeasonNumber,
                      error: function (err, errors, episode) {
                        console.log('season link_error', err, errors, episode.allProperties());
                      }
                    });
                    done();
                  } else if (episode_ids.indexOf(episode_id) !== -1) {
                    console.log('Updating', show.p('name'), printname);
                    episode_model.load(ids[0], function () {
                      setProperties();
                      episode_model.save(function (err) {
                        if (err) {
                          console.log('ERROR: Updating', show.p('name'), printname, err, episode_model.errors);
                        }
                        done(err);
                      });
                    });
                  } else {
                    done();
                  }
                });
              
              }, function (err) {
                if (err) {
                  next(err);
                } else {
                  show.p('seasons', seasons);
                  console.log('Updating', show.p('name'));
                  show.save(function (err) {
                    if (err) {
                      console.log('ERROR: Updating', show.p('name'), err, show.errors);
                    }
                    next(err);
                  });
                }
              });
            }
          });
        }
      ], function (err) {
        callback(err, show);
      });
    },
    
    refreshData: function (callback) {
      var self = this;
      
      var update_range = 'day';
      var last_refresh = self.p('last_data_refresh');
      var day = 24*60*60*1000;
      var week = day*7;
      var month = day*30; // this is how thetvdb defines a month worth of updates
      var now = + new Date();
      
      console.log('Last refresh was', new Date(last_refresh));
      
      if (last_refresh < now-day) {
        update_range = 'week';
        if (last_refresh < now-week) {
          update_range = 'month';
          if (last_refresh < now-month) {
            console.log('Data was not updated in more than 30 days. This is not good and needs to be handled manually.');
          } else {
            console.log('Data was not updated in more than 7 days!');
          }
        }
      }
      
      this._tvdbRequest('/updates/updates_'+update_range+'.zip', 'zip', function (err, documents) {
        if (err) {
          callback(err);
        } else {
          var update_release = documents[0].root().attr('time').value()*1000;
          if (last_refresh >= update_release) {
            console.log('Already up-to-date.');
            return callback();
          } else {
            
            var checkTime = function (node) {
              var time = node.get('time').text();
              return time*1000 > last_refresh;
            };
            
            async.waterfall([
              
              // get ids of episodes
              function (done) {
                var episode_updates = documents[0].find('/Data/Episode').filter(checkTime);
                var episode_ids = episode_updates.map(function (node) {
                  return parseInt(node.get('id').text(), 10);
                });
                done(null, episode_ids);
                return true;
                async.filter(episode_ids, function (id, cb) {
                  nohm.factory('Episode').find({
                    tvdb_id: id
                  }, function (err, ids) {
                    if (err) {
                      throw err;
                    }
                    cb(ids.length !== 0);
                  });
                }, function (ids) {
                  done(null, ids);
                });
              },
              
              // update series
              function (episode_ids, done) {
                async.forEachLimit(documents[0].find('/Data/Series'), 10, function (node, cb) {
                  if ( ! checkTime(node)) {
                    cb();
                  } else {
                    nohm.factory('Show').find({
                      tvdb_id: ''+node.get('id').text()
                    }, function (err, ids) {
                      if (ids.length === 0) {
                        cb();
                      } else if (err) {
                        cb(err);
                      } else {
                        self.updateSeries(ids[0], episode_ids, cb);
                      }
                    });
                  }
                }, done);
              },
              
              // set datarefresh timestamp
              function (done) {
                self.p('last_data_refresh', now);
                self.save(done);
              }
              
            ], function (err) {
              callback(err);
            });
            
          }
        }
      });
    }
  }
});