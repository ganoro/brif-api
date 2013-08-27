var express = require('express');
var config = require('./config.js');
var request = require('request');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();
var parse = require('parse').Parse;

/**
 * initialize express app
 */ 
var app = express();

/**
 * initialize parse app
 */ 
parse.initialize(config.parse_app_id, config.parse_javascript_api_key);
var Users = parse.Object.extend("Users");

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
		sendPostMessage(res, 'cancel')
		return;
	} 

  	// validation check
  	var code = req.query.code;
  	var sender = req.query.state;
  	if (code == null || sender == null) {
		// TODO internal error 404?
		sendPostMessage(res, 'internal_error')
  		return; 
  	}

  	// exchange code for (a refreshable) token
  	var google_config = eval("config.google_config_" + sender);
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
		var data = JSON.parse(body);
		if (data.access_token != null && data.expires_in != null && data.refresh_token != null) {
			sendPostMessage(res, 'accept');
			console.log(body);
			processSignup(data);
		} else {
			sendPostMessage(res, 'google_error');
		}
	});
});

/**
 * post message to opener
 */
var sendPostMessage = function(res, message) {
	// res.send("<script>window.opener.postMessage('" + message + "', '*');window.close();</script>");
}

var storeUserData = function(user_data) {
	var query = new parse.Query(Users);
		query.equalTo("email", user_data.email);
		console.log("new user: " + user_data.email);
		query.first({
			success: function(object) {				
				console.log(object);
				var u = null;
				if (object) {
					u = object;
					u.set(user_data);
				} else {
					u = new Users(user_data);
				}
				u.save(null, {
					success : function(o) {
						console.log("success");
					},
					error : function(e, o) {
						console.log('error');
						console.log(e);
					} 
				});
			},
			error: function(error) {
				console.log("Error: " + error.code + " " + error.message);
			}
	});
}

/**
 * completes signup
 */
var processSignup = function(data) {
	request.get('https://www.googleapis.com/oauth2/v2/userinfo?access_token=' + data.access_token, function(e, r, body) {
		console.log(body);
		var user = JSON.parse(body);
		request.get('https://www.google.com/m8/feeds/contacts/default/full/?max-results=1&access_token=' + data.access_token, function(e, r, body) {
			xml2js(body, function(error, result) {
				var email = result.feed.id[0];
				var user_data = $.extend({}, { email : email }, user, data, { 'token_refresh_time' : new Date() } );
				console.log(user_data);
				storeUserData(user_data);
			});
		});
	}); 
}

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
