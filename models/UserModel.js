"use strict";

var crypto = require('crypto')
, hasher = function hasher (password, salt) {
  var hash = crypto.createHash('sha512');
  hash.update(password);
  hash.update(salt);
  return hash.digest('base64');
}
, seed = 'pAUFBPIBAPSONkplanfpoinf0938fp93noNNFW)§(NWP)NPognOISNMPG=)WNGPOASNGMPA)§NMNp98n3wnnPN9nf89wP()fnWP)NFWfn9'
, nohm = require('nohm');

module.exports = nohm.Model.extend({
  constructor: function () {
    this.modelName = 'User';
    this.properties = {
      name: {
        type: 'string',
        unique: true,
        validations: [
          'notEmpty'
        ]
      },
      password: {
        type: 'string',
        index: true,
        validations: [
          'notEmpty'
        ]
      }
    };
    nohm.Model.call(this);
  },
  passwordHash: function (pw) {
    return hasher(pw, seed);
  }
});
