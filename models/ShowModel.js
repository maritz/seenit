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
    },
    tvdb_id: {
      type: 'string',
      unique: true
    },
    imdb_id: {
      type: 'string',
      unique: true
    },
    genre: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    num_seasons: {
      type: 'integer'
    },
    seasons: {
      type: 'json',
      defaultValue: []
    },
    banner: {
      type: 'string'
    }
  },
  methods: {
    
    isSelf: function (selfUser, id, callback) {
      callback(undefined, id === selfUser.id);
    }
    
  }
});