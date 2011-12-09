var file_helper = require('./helpers/file.js');
var express = require('express');
var server = express.createServer();

module.exports = server;

server.use(express.bodyParser());
server.use(express.cookieParser());
server.use(express.session({ secret: "some secret this is " }));

server.use(function (req, res, next) {
  res.ok = function (data) {
    data = data || {};
    res.json({result: 'success', data: data});
  }
  next();
});
  
var controller_files = file_helper.getFiles(__dirname, '/controllers/');

controller_files.forEach(function (val) {
  var name = val.match(/^\/controllers\/([\w]*)Controller.js$/)[1];
  
  server.use('/'+name, require(__dirname+val));
});

server.use(function (err, req, res, next) {
  if (err && err instanceof Error) {
    console.log('responding with error: '+err.name);
    console.dir(err.message);
    var code = err.code || 500;
    var data = err.data || {error: {name: err.name, msg: err.message}};
    res.json({result: 'error', data: data}, code);
  } else {
    console.log('uncaught error');
    console.dir(err);
    next(err);
  }
});

server.mounted(function (parent){
  console.log('mounted REST server');
});