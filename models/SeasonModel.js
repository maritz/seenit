"use strict";

var nohm = require('nohm');
module.exports = nohm.Model.extend({
  constructor: function () {
    this.modelName = 'Season';
    this.properties = {
      number: {
        type: 'number',
        validations: [
          'number'
        ]
      },
      name: {
        type: 'string'
      },
      num_episodes: {
        type: 'integer',
        value: 22,
        validations: [
          ['min', 0]
        ]
      },
      start: {
        type: 'timestamp',
        index: true,
        validations: [
          'date'
        ]
      },
      end: {
        type: 'timestamp',
        index: true,
        value: (+ new Date()),
        validations: [
          ['date', 'optional']
        ]
      },
      interval: {
        type: 'integer',
        value: 7,
        validations: [
          ['min', 0]
        ]
      },
      seen: {
        type: 'bool',
        value: false
      }
    };
    nohm.Model.call(this);
  }
});
