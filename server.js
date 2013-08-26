var express = require('express');
var config = require('./config.js');
var queinit = require('./queinit.js');
var Kaiseki = require('kaiseki');
var request = require('request');
var xml2js = require('xml2js').parseString;
var aws = require('aws-sdk');
var $ = require('jquery').create();

/**
 * aws sqs
 */
var refresh_token_queue = '';
var sqs = queinit.initRefreshQue(aws, function(err, data) {
	refresh_token_queue = data.QueueUrl;
})

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
			processSignup(data);
			console.log(body);
		} else {
			sendPostMessage(res, 'google_error');
		}
	});
});

/**
 * post message to opener
 */
var sendPostMessage = function(res, message) {
	res.send("<script>window.opener.postMessage('" + message + "', '*');window.close();</script>");
}

/**
 * post message to opener
 */
var scheduleRefreshTokenQue = function(objectId) {
	var params = { 'QueueUrl' : refresh_token_queue, 'MessageBody' : objectId, 'DelaySeconds' : 20 };
	console.log(params)
	sqs.sendMessage(params, function(err, data) {
		console.log("message registered" + data.MessageId);
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
				var params = {
				  where: { email: email },
				  count: true,
				  limit: 1
				};
				parse.getObjects('Users', params, function(err, res, body, success) {
					console.log(body);
					var user_data = $.extend({}, { email : email }, user, data);
					if (body.count == 0) {
						// register new user
						parse.createObject('Users', user_data, function(err, res, body, success) {
							console.log('object created = ', body);
							console.log('object id = ', body.objectId);
							scheduleRefreshTokenQue(body.objectId);
						});
					} else {
						// update existing customer details
						console.log(body);
						console.log(body.results[0]);
						parse.updateObject('Users', body.results[0].objectId, user_data, function(err, res, body, success) {
							console.log('object updated at = ', body.updatedAt);
							scheduleRefreshTokenQue(body.objectId);
						});
					}
				});
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
