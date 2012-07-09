var nohm = require('nohm').Nohm,
    crypto = require('crypto');

var hasher = function hasher (password, salt) {
  var hash = crypto.createHash('sha512');
  hash.update(password);
  hash.update(salt);
  return hash.digest('base64');
};

// thanks to senchalabs for this uid snippet
var uid = function uid () {
  return ((Date.now() & 0x7fff).toString(32) + (0x100000000 * Math.random()).toString(32));
};

var password_minlength = 6;
var default_acl = ['view', 'list', 'create', 'edit', 'delete'];

module.exports = nohm.model('User', {
  idGenerator: 'increment',
  properties: {
    name: {
      type: 'string',
      unique: true,
      validations: [
        'notEmpty',
        ['length', {
          min: 4
        }]
      ]
    },
    email: {
      type: 'string',
      unique: true,
      validations: [
        ['email', {
          optional: true
        }]
      ]
    },
    password: {
      load_pure: true, // this ensures that there is no typecasting when loading from the db.
      type: function (value, key, old) {
        var pwd, salt,
            valueDefined = value && typeof(value.length) !== 'undefined';
        if ( valueDefined && value.length >= password_minlength) {
          if (pwd !== old) {
            // if the password was changed, we change the salt as well, just to be sure.
            salt = uid();
            this.p('salt', salt);
            pwd = hasher(value, salt);
          } else {
            pwd = hasher(value, this.p('salt'));
          }
          return pwd;
        } else {
          return value;
        }
      },
      validations: [
        'notEmpty',
        ['length', {
          min: password_minlength
        }]
      ]
    },
    salt: {
      // DO NOT CHANGE THE SALTING METHOD, IT WILL INVALIDATE STORED PASSWORDS!
    },
    acl: {
      type: 'json',
      defaultValue: {
        User: ['self', 'create']
      }
    },
    admin: {
      type: 'bool',
      defaultValue: false
    }
  },
  methods: {
    
    allow: function (action, subject) {
      var testInstance = nohm.factory(subject);
      if (!testInstance) {
        return false;
      } else {
        var acl = this.p('acl');
        if ( ! acl.hasOwnProperty(subject) || ! Array.isArray(acl[subject])) {
          acl[subject] = [];
        }
        if (Array.isArray(action)) {
          acl[subject] = action;
        } else {
          if (action === '*') {
            acl[subject] = default_acl;
          } else if (acl[subject].indexOf(action) === -1) {
            acl[subject].push(action);
          }
        }
        this.p('acl', acl);
        return acl;
      }
    },
    
    may: function (action, subject, id, callback) {
      if (this.p('admin') === true) {
        return callback(undefined, true);
      }
      var acl = this.p('acl');
      if (acl.hasOwnProperty(subject) && Array.isArray(acl[subject])) {
        if (action !== 'self' && acl[subject].indexOf(action) !== -1) {
          return callback(undefined, true);
        } else if (action !== 'grant' && acl[subject].indexOf('self') !== -1) {
          var subject_instance = nohm.factory(subject);
          
          if (subject_instance.hasOwnProperty('isSelf') && typeof(subject_instance.isSelf) === 'function') {
            return subject_instance.isSelf(this, id, callback);
          }
        }
      }
      
      // did not find the proper role
      callback(undefined, false);
    },
    
    deny: function (action, subject) {
      var self = this;
      var testInstance = nohm.factory(subject);
      if (!testInstance) {
        return false;
      } else {
        var acl = this.p('acl');
        if ( ! acl.hasOwnProperty(subject)) {
          return acl;
        }
        if (Array.isArray(action)) {
          return action.forEach(function (item) {
            self.deny(item, subject);
          });
        } else {
          if (action === '*') {
            delete acl[subject];
          } else {
            var index = acl[subject].indexOf(action);
            if (index !== -1) {
              acl[subject].splice(index, 1);
            }
          }
        }
        this.p('acl', acl);
        return acl;
      }
    },
    
    isSelf: function (selfUser, id, callback) {
      callback(undefined, parseInt(id, 10) === parseInt(selfUser.id, 10));
    },
    
    
    login: function (name, password, callback) {
      var self = this;
      if (!name || name === '' || !password || password === '') {
        callback(false);
        return;
      }
      this.find({name: name}, function (err, ids) {
        if (err || ids.length === 0) {
          callback(false);
        } else {
          self.load(ids[0], function (err) {
            if (!err && self.p('password') === hasher(password, self.p('salt'))) {
              callback(true);
            } else {
              callback(false);
            }
          });
        }
      });
    },
    
    fill: function (data, fieldCheck) {
      var props = {},
          self = this,
          doFieldCheck = typeof(fieldCheck) === 'function',
          fields = Object.keys(data);
      
      fields.forEach(function (i) {
        var fieldCheckResult;
        
        if (! self.properties.hasOwnProperty(i))
          return;
          
        if (doFieldCheck)
          fieldCheckResult = fieldCheck(i, data[i]);
          
        if (doFieldCheck && fieldCheckResult === false)
          return;
        else if (doFieldCheck && typeof (fieldCheckResult) !== 'undefined' &&
                fieldCheckResult !== true)
          return (props[i] = fieldCheckResult);
          
        
        props[i] = data[i];
      });
     
      this.p(props);
      return props;
    },
    
    store: function (data, callback) {
      var self = this;
      
      this.fill(data, function (field, data) {
        switch (field) {
          case 'salt':
          case 'admin':
          case 'acl':
            return false; // make sure these aren't set via store. use the special methods or .p() directly.
          case 'password':
            if( self.id && ! data) {
              return false; // creating a user without a password is not allowed
            }
        }
      });
      this.save(function () {
        delete self.errors.salt;
        callback.apply(self, Array.prototype.slice.call(arguments, 0));
      });
    },
    
    // makes sure there is no accidental exposure of the password/salt through allProperties
    allProperties: function (show_privates, stringify) {
      var props = this._super_allProperties.call(this);
      if ( ! show_privates) {
        delete props.email;
        delete props.acl;
      }
      delete props.password;
      delete props.salt;
      return stringify ? JSON.stringify(props) : props;
    }
  }
});
