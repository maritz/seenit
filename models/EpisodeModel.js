var nohm = require('nohm').Nohm;

module.exports = nohm.model('Episode', {
  properties: {
    name: {
      type: 'string',
      validations: [
        'notEmpty'
      ]
    },
    tvdb_id: {
      type: 'integer',
      unique: true
    },
    imdb_id: {
      type: 'string',
      unique: true
    },
    season: {
      type: 'integer'
    },
    number: {
      type: 'integer'
    },
    first_aired: {
      type: 'timestamp'
    },
    plot: {
      type: 'string'
    }
  },
  methods: {
    
    isSelf: function (selfUser, id, callback) {
      callback(undefined, id === selfUser.id);
    }
    
  }
});
