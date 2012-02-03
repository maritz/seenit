var app = require('express').createServer();
var hashlib = require('hashlib');

app.get('/csrf', function (req, res) {
  if (typeof(req.session.csrf_tokens) === 'undefined') {
    req.session.csrf_tokens = [];
  }
  var tokens = req.session.csrf_tokens;
  if (tokens.length > 30) {
    tokens.shift();
  }
  var new_token = hashlib.sha1(Math.random()*(Math.random()*1000000));
  var new_key = hashlib.sha1(+ new Date()).substring(0,7);
  tokens.push(new_token);
  
  // we set a cookie for 30 seconds. 
  // the client has to read it with the provided key and store it in a variable or use it directly
  res.cookie(new_key, new_token, {path: '/', maxAge: 120000});
  res.ok(new_key);
});


module.exports = app;
