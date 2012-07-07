var Cookie = require('request/vendor/cookie/index.js');
var async = require('async');
var json;

module.exports.setJson = function (new_json) {
  json = new_json;
};

var createDummies = module.exports.createDummies = function (json, password, callback) {
  var creates = [];
  var creator = function (name) {
    return function (next) {
      logout(function () {
        post(json, '/User/', {
          name: name,
          password: password
        }, function (err, res, body) {
          var error;
          if (body.result !== 'success') {
            console.log(body);
            error = new Error('failed to create dummy user');
          }
          next(error);
        });
      });
    };
  };
  
  for (var i = 1, len = 10; i <= len; i++) {
    creates.push(creator('test_user'+i));
  }
  
  async.series(creates, callback);
};


var getCookie = module.exports.getCookie = function (res, searched) {
  var cookies = res.headers['set-cookie'];
  var cookie;
  
  for (var i = 0, len = cookies.length; i < len; i++) {
    cookie = cookies[i];
    var key_value = cookie.split(';')[0];
    var first_equal = key_value.indexOf('=');
    var key = key_value.substr(0, first_equal);
    if (searched === key) {
      return key_value.substr(first_equal+1);
    }
  }
};

var getCsrf = module.exports.getCsrf  = function (json, callback) {
  json.get(json.base_url+'/Util/csrf', function (err, res, body) {
    var token = getCookie(res, body.data);
    callback(token);
  });
};

var putPostDel = function (method, json, uri, data, callback) {
  getCsrf(json, function(token) {
    data._csrf = token;
    json[method]({
        uri: json.base_url+uri,
        body: JSON.stringify(data)
      }, callback);
  });
};

var post = module.exports.post = function (json, uri, data, callback) {
  putPostDel('post', json, uri, data, callback);
};

var put = module.exports.put = function (json, uri, data, callback) {
  putPostDel('put', json, uri, data, callback);
};

var del = module.exports.del = function (json, uri, data, callback) {
  putPostDel('del', json, uri, data, callback);
};

var testError = module.exports.testError = function (t, result, name, msg) {
  var should = {
    result: "error",
    data: {
      error: {
        name: name,
        msg: msg
      }
    }
  };
  t.deepEqual(result, should, 'Error was incorrect');
};

module.exports.needsLogin = function (t, result) {
  testError(t, result, 'AuthError', 'need_login');
};

module.exports.privsLow = function (t, result) {
  testError(t, result, 'AuthError', 'privileges_low');
};

module.exports.notFound = function (t, result) {
  testError(t, result, 'Error', 'Resource not available with given METHOD and URL.');
};

module.exports.testNohmError = function (t, result, errors) {
  var should = {
    result: "error",
    data: {
      error: 'invalid',
      fields: errors
    }
  };
  t.deepEqual(result, should, 'Error was incorrect');
};

var testSuccess = module.exports.testSuccess = function (t, result, data) {
  var should = {
    result: "success",
    data: data
  };
  t.deepEqual(result, should, 'Successful request was incorrect');
};



var login = module.exports.login = function (name, pw, callback) {
  var _login = function (err, result) {
    logout(function () {
      post(json, '/User/login', {
         name: name,
         password: pw
        }, function (err, res, body) {
        if (body.result !== 'success') {
          console.log('login failed', body);
          process.exit();
        }
        callback(err, res, body);
      });
    })
  };
  
  if (typeof(name) === 'function') {
    callback = name;
    name = 'test_user1';
    pw = 'test_pw';
    _login();
  } else if (typeof(pw) === 'function' && Array.isArray(name) && name[0] !== 'admin') {
    callback = pw;
    var rights = name;
    name = 'test_user2';
    pw = 'test_pw';
    async.series([
      async.apply(json.get, json.base_url+'/User/logout'),
      async.apply(post, json, '/User/login', {
        name: name,
        password: pw
      }),
      async.apply(json.get, json.base_url+'/User/give/me/admin'),
      async.apply(put, json, '/User/allow/'+2, {
        subject: rights[0],
        action: rights[1] || '*'
      }),
      async.apply(json.get, json.base_url+'/User/take/me/admin')
    ], function (err, results) {
      callback(err, results);
    });
  } else if (name[0] === 'admin') {
    callback = pw;
    var rights = name;
    name = 'test_user2';
    pw = 'test_pw';
    async.series([
      async.apply(json.get, json.base_url+'/User/logout'),
      async.apply(post, json, '/User/login', {
        name: name,
        password: pw
      }),
      async.apply(json.get, json.base_url+'/User/give/me/admin')
    ], function (err, results) {
      callback(function (cb) {
        json.get(json.base_url+'/User/take/me/admin', cb);
      });
    });
  } else {
    _login();
  }
};

var logout = module.exports.logout = function (callback) {
  json.get(json.base_url+'/User/logout', function (err, res, body) {
    if (body.result !== 'success') {
      console.log(body);
      process.exit();
    }
    callback();
  });
};

