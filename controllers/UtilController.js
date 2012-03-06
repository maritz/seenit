var app = require('express').createServer();
var crypto = require('crypto');

function createKey() {
  var hash = crypto.createHash('sha512');
  hash.update(""+new Date());
  return hash.digest('hex').substring(0,7);
}

app.get('/csrf', function (req, res) {
  var key = req.session._csrf_key;
  if (!key) {
    key = req.session._csrf_key = createKey();
  }
  
  res.cookie(key, req.session._csrf, {path: '/', maxAge: 1000*3600*25});
  res.ok(key);
});


module.exports = app;
