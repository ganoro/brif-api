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
 http://staging.brif.us/signin#state=signin&access_token=ya29.AHES6ZS8bRLukPLSxMFBkLsib4cKf39Yle1Dcl_oJNcn9CRNKw&token_type=Bearer&expires_in=3600&code=4/_S2L0Nmy749ZW-yhUkb1a3jJZjRI.sjJRRKwHVOsTOl05ti8ZT3YnnNJKgQI
 */ 
var parse = new Kaiseki(config.kaiseki_app_id, config.kaiseki_rest_api_key);

app.use(express.bodyParser());

app.get('/signin', function(req, res){

	// error handling
	var error = req.query.error;
  	if (error != null ) {
  		res.redirect('/?error_code=google_error&error=' + error);
  		return;
  	}

  	// validation check
  	var code = req.query.code;
  	var access_token = req.query.access_token;
  	var expires_in = req.query.expires_in;
  	if (code == null || access_token == null || expires_in == null) {
		res.redirect('/?error_code=internal_error&error=' + 
			encodeURIComponent("missing parameter - code, access token or expires_in"));
  		return; 
  	}

  	// exchange code for (a refreshable) token
  	request({
	    method: 'POST', 
	    uri: 'https://accounts.google.com/o/oauth2/token',
	    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
	    form : {
	    	code: code, 
	    	client_id : config.google_client_id,
	    	client_secret : config.google_client_secret,
	    	redirect_uri : config.google_redirect_uri,
	    	grant_type : 'authorization_code'
	    },
	    body: body}).pipe(res);
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

var io = require('socket.io');
io.listen(app.listen(config.port));

console.log('Listening on port ' + config.port);
