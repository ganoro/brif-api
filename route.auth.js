var config = require('./config.js');
var request = require('request');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();

var model = {};
model['users'] = require('./model.users.js');

/**
 * Sign in route
 */
exports.signin = function(req, res){

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
};

exports.mobile_signin = function(req, res){
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
};

exports.refresh_token = function(req, res) {

	// validate params
  	var email = req.body.email;
  	if (email == null) {
		res.send(400, 'missing parameter (email)');
  	}

  	model['users'].findByEmail(email, {
  		res : res, 
		success: function(user) {
			if (user) {
				return refreshToken(user, this.res);
			} else {
				res.send(400, 'email not found ' + email);
			}	
		},
		error: function(error) {
			res.send(400, error.message);
			console.log("Error: " + error.code + " " + error.message);
		}
	})
};


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

  	model['users'].findByEmail(user_data.email, {
  		user_data : user_data,
		success: function(object) {
			var u = (object ? object : new Users());
			u.set(this.user_data);
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



