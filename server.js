var express = require('express');
var config = require('./config.js');
var helper = require('./helper.js');
var Kaiseki = require('kaiseki');
var request = require('request');
var xml2js = require('xml2js').parseString;

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
		res.redirect('http://staging.brif.us/canceled');
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
	}, function(e, r, body) {
		console.log(body);
		var data = JSON.parse(body);
		if (data.access_token != null && data.expires_in != null && data.refresh_token != null) {
			request.get('https://www.googleapis.com/oauth2/v2/userinfo?access_token=' + data.access_token, function(e, r, body) {
				console.log(body);
				var user = JSON.parse(body);
				request.get('https://www.google.com/m8/feeds/contacts/default/full/?max-result=1&access_token=' + data.access_token, function(e, r, body) {
				console.log(body);
				// var contacts = xml2js(body, function() {
				res.send("welcome " + user.name);	
				// });
			}); 

			// 
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
