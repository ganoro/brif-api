var express = require('express');
var config = require('./config.js');
var helper = require('./helper.js');
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

app.get('/signin', function(req, res){

	// error handling
	var error = req.query.error;
	if (error != null) {
		res.redirect('staging.brif.us/why');
		return;
	}

  	// validation check
  	var code = req.query.code;
  	if (code == null) {
		res.redirect('/?error_code=internal_error&error=' + encodeURIComponent("missing parameters - code"));
  		return; 
  	}

  	// exchange code for (a refreshable) token
  	var form = {
	    	code: code, 
	    	client_id : config.google_client_id,
	    	client_secret : config.google_client_secret,
	    	redirect_uri : config.google_redirect_uri,
	    	grant_type : 'authorization_code'
    };

    console.log(form);

  	request({
	    method: 'POST', 
	    uri: 'https://accounts.google.com/o/oauth2/token',
	    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
	    form : form
	}, function(err, res, body) {
		var data = JSON.parse(body);
		if (data.access_token != null) {
			res.send("success");
		} else {
			res.send("error");
		}
	});
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

var io = require('socket.io');
io.listen(app.listen(config.port));

console.log('Listening on port ' + config.port);
