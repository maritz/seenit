var soda = require('soda')
  , assert = require('assert');

var browser = soda.createClient({
    host: 'localhost'
  , port: 4444
  , url: 'http://localhost:3003'
  , browser: 'firefox'
});

browser.on('command', function(cmd, args){
  console.log(' \x1b[33m%s\x1b[0m: %s', cmd, args.join(', '));
});

browser
  .chain
  .session()
  .open('/')
  .assertTitle('CHANGE ME')
  .end(function(err){
    browser.testComplete(function() {
      console.log('done');
      if(err) throw err;
    });
  });