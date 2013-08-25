var express = require('express');
var config = require('./config.js');
var helper = require('./helper.js');
var Kaiseki = require('kaiseki');
var request = require('request');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();

/**
 * initialize express app
 */ 
var app = express();

/**
 * initialize parse app
 */ 
var parse = new Kaiseki(config.kaiseki_app_id, config.kaiseki_rest_api_key);

/**
 * configuration
 */ 
app.use(express.bodyParser());

/**
 * routes
 */ 
app.get('/signin', function(req, res){

	// error handling
	var error = req.query.error;
	if (error != null) {
		res.send("<script>window.opener.postMessage('cancel', '*');window.close();</script>");
		return;
	} 

  	// validation check
  	var code = req.query.code;
  	var sender = req.query.state;
  	console.log(sender);
  	var google_config = eval("config.google_config_" + sender);
  	var base_url = google_config.web.javascript_origins[0];


  	if (code == null) {
		// TODO internal error 404?
		res.send("<script>window.opener.postMessage('internal_error', '*');window.close();</script>");
  		return; 
  	}

  	// exchange code for (a refreshable) token
  	var form = {
	    	code: code, 
	    	client_id : google_config.web.client_id,
	    	client_secret : google_config.web.client_secret,
	    	redirect_uri : google_config.web.redirect_uris[0],
	    	grant_type : 'authorization_code'
    };

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
				// TODO error handling
				console.log(body);
				var user = JSON.parse(body);
				request.get('https://www.google.com/m8/feeds/contacts/default/full/?max-results=1&access_token=' + data.access_token, function(e, r, body) {
					xml2js(body, function(error, result) {
						var email = result.feed.id[0];
						var params = {
						  where: { email: email }
						};
						parse.getObjects('Users', params, function(err, res, body, success) {
							console.log('is registered = ', body.count > 0);
							var user_data = $.extend({}, { email : email }, user, data);
							console.log(user_data);
							// if (body.count == 0) {
							// 	// register new user
							// 	parse.createObject('Users', user, function(err, res, body, success) {
							// 		console.log('object created = ', body);
							// 		console.log('object id = ', body.objectId);
							// 	});
							// } else {
							// // update existing customer details

							// }
						});
						// res.send("<script>window.opener.postMessage('accept', '*');window.close();</script>");
						res.send("<script>window.opener.postMessage('accept', '*');</script>");
					});
				});
			}); 
		} else {
			res.send("<script>window.opener.postMessage('google_error', '*');window.close();</script>");
		}
	});
});

/**
 * error handling
 */ 
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

/**
 * socket io
 */ 
var io = require('socket.io');
io.listen(app.listen(config.port));

console.log('Listening on port ' + config.port);
