"use strict";

var nohm = require('nohm'),
fs = require('fs'),
redis = require('redis').createClient();


var episodeModel = require('./models/EpisodeModel');

var episodes = new episodeModel();
episodes.find(function (err, ids) {
  if (ids && Array.isArray(ids)) {
    var countdown = ids.length;
    saveCallback = function (err) {
      if (err) {
        console.dir(err);
      }
      countdown--;
      if (!countdown) {
        console.log('done');
        process.exit();
      }
    }
    ids.forEach(function (id) {
      var episode = new episodeModel();
      episode.load(id, function (err) {
        for (p in episode.properties) {
          if (episode.properties.hasOwnProperty(p)) {
            episode.properties[p].__updated = true;
          }
        }
        episode.save(saveCallback);
      });
    });
  }
});