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
app.get('/auth/signin', function(req, res){

	// error handling
	var error = req.query.error;
	if (error != null) {
		sendPostMessage(res, 'cancel')
		return;
	} 

  	// validation check
  	var code = req.query.code;
  	var origin = req.query.state;
  	if (code == null || origin == null) {
		// TODO internal error 404?
		sendPostMessage(res, 'internal_error')
  		return; 
  	}

  	// exchange code for (a refreshable) token
  	var google_config = eval("config.google_config_" + origin);
  	var form = {
		code: code, 
		client_id : google_config.client_id,
		client_secret : google_config.client_secret,
		redirect_uri : google_config.redirect_uris[0],
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
			data.origin = origin;
			processSignup(data);
		} else {
			sendPostMessage(res, 'google_error' +  data.error);
		}
	});
});

app.post('/auth/mobile-signin', function(req, res){
  	// validation check
  	var access_token = req.body.access_token;
  	if (access_token == null) {
		// TODO internal error 404?
		res.send(400, 'missing parameters (access_token, ...)');
  		return; 
  	}

	var data = { 
		access_token : req.body.access_token,
		refresh_token : req.body.refresh_token,
		token_type : req.body.token_type,
		expires_in : parseInt(req.body.expires_in),
		id_token : req.body.id_token,
		origin : 'ios'
	};

	processSignup(data);
	res.send(JSON.stringify( { message : "user authenticated successfully", data : data } ));
});

app.post('/auth/refresh-token', function() {

	// validate params
  	var email = req.body.email;
  	if (email) {
		res.send(400, 'missing parameter (email)');
  	}

  	var query = new parse.Query(Users);
  	query.equalsTo("email", email);
	query.first({
		success: function(user) {
			if (user) {
				return refreshToken(user, res);
			} else {
				res.send(400, 'email not found ' + email);
			}	
		},
		error: function(error) {
			res.send(400, error.message);
			console.log("Error: " + error.code + " " + error.message);
		}
	});
});

/**
 * post message to opener
 */
 var refreshToken = function(user, res) {
	var origin = user.get("origin");
	var refresh_token = user.get("refresh_token");
	var google_config = eval("config.google_config_" + origin);

	var form = {
		refresh_token : refresh_token,
		client_id : google_config.client_id,
		client_secret : google_config.client_secret,
		grant_type : 'refresh_token',
	};
	request({
	    method: 'POST', 
	    uri: 'https://accounts.google.com/o/oauth2/token',
	    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
	    form : form
	}).pipe(res);
}

/**
 * post message to opener
 */
var sendPostMessage = function(res, message) {
	res.send("<script>window.opener.postMessage('" + message + "', '*');window.close();</script>"); 
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
				console.log(result);
				var email = result.feed.id[0];
				var token_refresh_time = new Date();
				token_refresh_time.setSeconds(token_refresh_time.getSeconds() + 3600);
				var user_data = $.extend({}, { 
					email : email }, 
					user, 
					data, 
					{ 'token_refresh_time' : token_refresh_time 
				});
				storeUserData(user_data);
			});
		});
	}); 
}

/**
 * store user data in parse
 */
var storeUserData = function(user_data) {
	delete user_data.id;
	console.log(user_data);

	var query = new parse.Query(Users);
	query.equalTo("email", user_data.email);
	console.log("new user: " + user_data.email);
	query.first({
		success: function(object) {
			var u = (object ? object : new Users());
			u.set(user_data);
			u.save(null, {
				success : function(o) {
					console.log("user attributes saved!");
				},
				error : function(o, e) {
					console.log("Error: " + error.code + " " + error.message);
				} 
			});
		},
		error: function(error) {
			console.log("Error: " + error.code + " " + error.message);
		}
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
var io = require('socket.io').listen(app.listen(config.port));

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});


console.log('Listening on port ' + config.port);
