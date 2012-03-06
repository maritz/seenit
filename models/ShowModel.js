var nohm = require('nohm').Nohm;

module.exports = nohm.model('Show', {
  properties: {
    name: {
      type: 'string',
      unique: true,
      validations: [
        'notEmpty',
        ['length', {
          min: 2
        }]
      ]
    }
  },
  methods: {
    
    isSelf: function (selfUser, id, callback) {
      callback(undefined, id === selfUser.id);
    }
    
  }
});
