var express = require('express');
var config = require('./config.js');
var Kaiseki = require('kaiseki');
var request = require('request');

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

  	var body = ['code=' + code , 'client_id=' + config.google_client_id, 
  		'client_secret=' + config.google_client_secret, 'redirect_uri=' + config.google_redirect_uri, 
  		'grant_type=authorization_code'].join('&')


  		debugger;
  		
  	request({
	    method: 'POST', 
	    uri: 'https://accounts.google.com/o/oauth2/token',
	    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
	    body: body}).pipe(res);
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

var io = require('socket.io');
io.listen(app.listen(config.port));

console.log('Listening on port ' + config.port);
