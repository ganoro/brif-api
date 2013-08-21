var express = require('express');
var config = require('./config.js');
var Kaiseki = require('kaiseki');

/**
 * initialize express app
 */ 
var app = express();

/**
 * initialize parse app
 */ 
var parse = new Kaiseki(config.kaiseki_app_id, config.kaiseki_rest_api_key);

app.use(express.bodyParser());

app.post('/signin', function(req, res){
  	var email = req.body.email;
  	var name = req.body.name;
  	var code = req.body.code;

  	if (email == null || name == null || code == null) {
  		res.send(400, "Bad Request, missing parameter (email, name or code)");
  		return; 
  	}

  	res.send(email);
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

var io = require('socket.io');
io.listen(app.listen(config.port));

console.log('Listening on port 80');
