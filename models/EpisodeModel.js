"use strict";

var nohm = require('nohm');
module.exports = nohm.Model.extend({
  constructor: function () {
    this.modelName = 'Episode';
    this.properties = {
      number: {
        type: 'integer',
        index: true,
        validations: [
          ['min', 1]
        ]
      },
      name: {
        type: 'string'
      },
      date: {
        type: 'timestamp',
        index: true,
        validations: [
          'date'
        ]
      },
      seen: {
        type: 'bool',
        value: false,
        index: true
      }
    };
    nohm.Model.call(this);
  },
  
  loadSeason: function (season, callback) {
    if (!this.id) {
      console.log('Warning: trying Episode.loadSeason when the episode doesnt have an idea');
      callback(false);
    }
    this.getAll('Season', 'parent', function (err, ids) {
      if (!err) {
        season.load(ids[0], function (err) {
          callback(true);
        });
      } else {
        callback(false);
      }
    });
  }
});
