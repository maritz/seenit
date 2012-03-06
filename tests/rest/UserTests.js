var request = require('request');
var h = require(__dirname+'/test_helper.js');
var Nohm = require('nohm').Nohm;
var config = require(__dirname+'/../../config.js');
var async = require('async');
var redis;

var json = request.defaults({json: true});
var url = json.base_url = 'http://localhost:3003/REST';
var pw = 'test_pw';

h.setJson(json);

Nohm.setPrefix(config.nohm.prefix);

module.exports = {
  setUp: function (callback) {

    redis = require('redis').createClient(config.nohm.port);
    Nohm.setClient(redis);
    redis.select(config.nohm.db || 0, function (err) {
      if (err) {
        console.log('problem selecting the redis db');
        process.exit(1);
      }
      Nohm.purgeDb(callback);
    });
  },
  tearDown: function (callback) {
    redis.end();
    callback();
  },
  "User": {
    "GET / unauthorized": function (t) {
      t.expect(2);
      
      json.get(url+'/User/', function (err, res, body) {
        t.notEqual(res, null, 'Did not receive any data');
        h.needsLogin(t, body);
        t.done();
      });
    },
    "POST / csrf missing": function (t) {
      t.expect(1);
      
      json.post({
          uri: url+'/User/',
          body: JSON.stringify({})
        }, function (err, res, body) {
        t.same(body, 'Forbidden', 'Submitting with missing CSRF did not return "Forbidden"');
        t.done();
      });
    },
    "POST / csrf wrong": function (t) {
      t.expect(1);
      
      json.get(url+'/Util/csrf', function () {
        json.post({
            uri: url+'/User/',
            body: JSON.stringify({
              "csrf-token": 'asd asd'
              })
          }, function (err, res, body) {
        t.same(body, 'Forbidden', 'Submitting with wrong CSRF did not return "Forbidden"');
          t.done();
        });
      });
    },
    "POST / data wrong": function (t) {
      t.expect(1);
      
      h.post(json, '/User/', {}, function (err, res, body) {
        h.testNohmError(t, body, { 
          name: [ 'notEmpty', 'length' ],
          email: [],
          password: [ 'notEmpty', 'length' ],
          acl: [],
          admin: []
        });
        t.done();
      });
    },
    "POST / data correct": function (t) {
      t.expect(2);
      
      h.post(json, '/User/', {
        name: 'test_user',
        password: pw
      }, function (err, res, body) {
        t.equal(body.result, 'success', 'Saving a user did not succeed');
        t.equal(body.data.id, 1, 'Saving a user did not return the correct id.');
        t.done();
      });
    },
    "users created": {
      setUp: function (callback) {
        h.createDummies(json, pw,  callback);
      },
      "POST /login": function (t) {
        t.expect(1);
        
        h.login(function (err, res, body) {
          t.equal(body.result, 'success', 'Unable to log in');
          t.done();
        });
      },
      "GET / privilieges_low": function (t) {
        t.expect(1);
        
        h.login(function () {
          json.get(url+'/User/', function (err, res, body) {
            h.testError(t, body, 'AuthError', 'privileges_low');
            t.done();
          });
        });
      },
      "GET / authorized": function (t) {
        t.expect(1);
        
        h.login(['User', 'list'], function () {
          json.get(url+'/User/', function (err, res, body) {
            // can't really check more right now because the data that is returned fluctuates too much.
            t.deepEqual(body.data.length, 10, 'Did not receive correct user list.');
            t.done();
          });
        });
      },
      "POST / data duplicate": function (t) {
        t.expect(1);
        
        h.post(json, '/User/', {
          name: 'test_user1',
          password: pw
        }, function (err, res, body) {
          h.testNohmError(t, body, { 
            name: [ 'notUnique' ],
            email: [],
            password: [],
            acl: [],
            admin: []
          });
          t.done();
        });
      },
      "PUT /10 no login": function (t) {
        t.expect(2);
        
        h.logout(function () {
          h.put(json, '/User/10', {
            name: 'test_user10_2',
            password: pw
          }, function (err, res, body) {
            t.equal(body.result, 'error', 'Updating a user without login worked.');
            t.equal(body.data.error.msg, 'need_login', 'Updating a user without login did not return the correct error.');
            t.done();
          });
        });
      },
      "PUT /10 data": function (t) {
        t.expect(4);
        
        h.put(json, '/User/10', {
          name: 'test_user10_2'
        }, function (err, res, body) {
          t.equal(body.result, 'success', 'Updating a user did not succeed');
          t.notEqual(body.data, undefined, 'Updating a user did not return the correct id.');
          t.equal(body.data.id, 10, 'Updating a user did not return the correct id.');
          t.equal(body.data.name, 'test_user10_2', 'Updating a user did not return the correct name.');
          t.done();
        });
      },
      "DEL /10 no login": function (t) {
        t.expect(2);
        
        h.logout(function () {
          h.del(json, '/User/10', {}, function (err, res, body) {
            t.equal(body.result, 'error', 'Removing a user without login worked.');
            t.equal(body.data.error.msg, 'need_login', 'Removing a user without login did not return the correct error.');
            t.done();
          });
        });
      },
      "DEL /9 not self": function (t) {
        t.expect(2);
        
        h.del(json, '/User/9', {}, function (err, res, body) {
          t.equal(body.result, 'error', 'Removing a different user worked.');
          t.equal(body.data.error.msg, 'privileges_low', 'Removing a different user did not return the correct error.');
            t.done();
        });
      },
      "DEL /15 other and not in db": function (t) {
        t.expect(2);
        
        h.login(['User', 'delete'], function () {
          h.del(json, '/User/15', {}, function (err, res, body) {
            t.equal(body.result, 'error', 'Removing inexistant user didn\'t fail.');
            t.equal(body.data.error.msg, 'not_found', 'Removing a non-existant user did not return the correct error.');
            t.done();
          });
        });
      },
      "DEL /10": function (t) {
        t.expect(1);
        
        h.del(json, '/User/10', {}, function (err, res, body) {
          t.equal(body.result, 'success', 'Removing user failed.');
          t.done();
        });
      }
    },
    "server didn't crash": function (t) {
      json.get(url+'/User/', function (err, res) {
        t.notEqual(res, null, 'Did not receive any data');
        t.done();
      });
    }
  }
};