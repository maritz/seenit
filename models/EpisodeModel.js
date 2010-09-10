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
        validations: [
          'date'
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
