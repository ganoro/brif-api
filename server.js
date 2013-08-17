var express = require('express');
var app = express();
var config = require('./config.js');

app.get('/hello', function(req, res){
  var body = 'Hello World';
  res.setHeader('Content-Length', body.length);
  res.send(body);
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

var io = require('socket.io');
io.listen(app.listen(config.port));

console.log('Listening on port 80');
