"use strict";

var nohm = require('nohm'),
fs = require('fs'),
redis = require('redis').createClient();


var models = fs.readdirSync('models'),
realModels = {};
for (var i = 0, len = models.length; i < len; i = i + 1) {
  if (models[i].match(/Model\.js$/i)) {
    var name = models[i].replace(/Model\.js$/i, '');
    realModels[name] = require('./models/' + name + 'Model');
  }
}

var date_parser = function (timestamp) {
  function pad (n) {
    return n < 10 ? '0' + n : n;
  }
  var date = new Date(timestamp);
  return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate());
}

seasons = new realModels.Season();
seasons.find(function (err, ids) {
  if (ids && Array.isArray(ids)) {
    ids.forEach(function (id) {
      var season = new realModels.Season();
      season.id = id;
      var key = season.relationKey('Episode', 'child'),
      episode = new realModels.Episode(),
      hashWeightKey = episode.getHashKey('') + '*->number',
      episodes = [];
      season.load(id, function (err) {
        if (err) {
          console.dir(err);
        }
        
        redis.sort(key, 'BY', hashWeightKey, function (err, ids) {
          if (err) {
            console.dir(err);
          }
          var i = 0,
          len = ids.length,
          countdown = len,
          loadCallback = function (err) {
            if (err) {
              console.dir(err);
            }
            
            countdown--;
            if (!countdown) {
              firsttime = 0;
              offset = 0;
              change_countdown = len;
              for (i = 0; i < len; i = i + 1) {
                console.log(' Episode ' + i + ' date: ' + episodes[i].p('date'));
                time = episodes[i].p('date');
                if (i === 0) {
                  firsttime = time;
                } else if (i === 1 && time-firsttime >= season.p('interval') * 86400000) {
                  console.log('times seem correct, breaking');
                  break;
                } else {
                  offset += season.p('interval') * 86400000;
                  console.log('changing time to ' + date_parser(firsttime + offset));
                  episodes[i].p('date', firsttime+offset);
                  episodes[i].save(function (err) {
                    if (err) {
                      console.dir(err);
                    }
                    change_countdown--;
                    if (!change_countdown) {
                      console.log('done');
                      process.exit();
                    }
                  });
                }
              }
            }
          };
          for (; i < len; i = i + 1) {
            episodes[i] = new realModels.Episode();
            episodes[i].load(ids[i], loadCallback);
          }  
        });
      });
    });
  }
});