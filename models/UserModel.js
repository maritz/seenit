"use strict";

var hashing = require('hashlib'),
seed = 'pAUFBPIBAPSONkplanfpoinf0938fp93noNNFW)§(NWP)NPognOISNMPG=)WNGPOASNGMPA)§NMNp98n3wnnPN9nf89wP()fnWP)NFWfn9',
nohm = require('nohm');
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
    pw = pw.substr(pw.length / 2 + 1, pw.length) + seed + pw.substr(0, pw.length / 2);
    return hashing.sha512(pw);
  }
});
