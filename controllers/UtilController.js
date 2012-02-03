var app = require('express').createServer();
var hashlib = require('hashlib');

app.get('/csrf', function (req, res) {
  var key = req.session._csrf_key;
  if (!key) {
    key = req.session._csrf_key = hashlib.sha1(+ new Date()).substring(0,7);
  }
  
  res.cookie(key, req.session._csrf, {path: '/', maxAge: 1000*3600*25});
  res.ok(key);
});


module.exports = app;
