var file_helper = require('./helpers/file.js');
var config = require('./config.js');
var express = require('express');
var server = express.createServer();

module.exports = server;

server.use(express.bodyParser());
server.use(express.cookieParser());
server.use(express.session({ secret: "some secret this is " }));
  
var controller_files = file_helper.getFiles(__dirname, '/controllers/');

controller_files.forEach(function (val) {
  var name = val.match(/^\/controllers\/([\w]*)Controller.js$/)[1];
  
  server.use('/'+name, require(__dirname+val));
});


server.mounted(function (parent){
  console.log('mounted REST server');
});