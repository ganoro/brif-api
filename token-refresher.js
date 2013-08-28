var config = require('./config.js');
var parse = require('parse').Parse;
var request = require('request');

parse.initialize(config.parse_app_id, config.parse_javascript_api_key);
var Users = parse.Object.extend("Users");
var query = new parse.Query(Users);

var withinHour = new Date();
withinHour.setSeconds(withinHour.getSeconds() + 60 * 15);
query.lessThan("token_refresh_time", withinHour);
query.find({
	success: function(results) {
		for (var i = results.length - 1; i >= 0; i--) {
			refreshToken(results[i]);
			console.log('-----');
		};
	},
	error: function(error) {
		console.log("Error: " + error.code + " " + error.message);
	}
});

// refresh token
var refreshToken = function(user) {
	var origin = user.get("origin");
	var refresh_token = user.get("refresh_token");
	var google_config = eval("config.google_config_" + origin);

	console.log(refresh_token);
	console.log(google_config.client_id);
	console.log(google_config.client_secret);

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
	}, function(e, r, body) {
		var data = JSON.parse(body);
		if (data.access_token != null) {
			console.log(body)
		} else {
			console.log(body);
			console.log('google_error' +  data);
		}
	});
}










