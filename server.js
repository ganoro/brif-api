var express = require('express');
var config = require('./config.js');
var Kaiseki = require('kaiseki');

var app = express();
var parse = new Kaiseki(kaiseki_app_id, kaiseki_rest_api_key);

app.use(express.bodyParser());

app.post('/signin', function(req, res){
  	var email = req.body.email;
  	res.send(name);
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

var io = require('socket.io');
io.listen(app.listen(config.port));

console.log('Listening on port 80');
