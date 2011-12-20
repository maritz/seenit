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
    "POST / empty": function (t) {
      t.expect(1);
      
      json.post(url+'/User/', function (err, res, body) {
        h.testError(t, body, 'SyntaxError', 'Unexpected end of input');
        t.done();
      });
    },
    "POST / csrf missing": function (t) {
      t.expect(1);
      
      json.post({
          uri: url+'/User/',
          body: JSON.stringify({})
        }, function (err, res, body) {
        h.testError(t, body, 'Error', 'crsf failure (request token first)');
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
          h.testError(t, body, 'Error', 'crsf failure');
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
          password: [ 'notEmpty', 'length' ] 
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
      "GET / authorized": function (t) {
        t.expect(1);
        var expected = [ 
          { name: 'test_user1', email: '', id: 1 },
          { name: 'test_user2', email: '', id: 2 },
          { name: 'test_user3', email: '', id: 3 },
          { name: 'test_user4', email: '', id: 4 },
          { name: 'test_user5', email: '', id: 5 },
          { name: 'test_user6', email: '', id: 6 },
          { name: 'test_user7', email: '', id: 7 },
          { name: 'test_user8', email: '', id: 8 },
          { name: 'test_user9', email: '', id: 9 },
          { name: 'test_user10', email: '', id: 10 } 
        ];
        
        h.login(function () {
          json.get(url+'/User/', function (err, res, body) {
            t.deepEqual(body.data, expected, 'Did not receive correct user list.');
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
            password: [] 
          });
          t.done();
        });
      },
      "PUT /10 data": function (t) {
        t.expect(4);
        
        h.put(json, '/User/10', {
          name: 'test_user10_2',
          password: pw
        }, function (err, res, body) {
          t.equal(body.result, 'success', 'Updating a user did not succeed');
          t.notEqual(body.data, undefined, 'Updating a user did not return the correct id.');
          t.equal(body.data.id, 10, 'Updating a user did not return the correct id.');
          t.equal(body.data.name, 'test_user10_2', 'Updating a user did not return the correct name.');
          t.done();
        });
      }
    },
    "server didn't crash": function (t) {
      json.get(url+'/User/', function (err, res, body) {
        t.notEqual(res, null, 'Did not receive any data');
        t.done();
      });
    }
  }
};