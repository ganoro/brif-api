var model = require('./model.base.js');

/**
 * initialize parse app
 */ 
var Users = model.parse.Object.extend("Users");

/**
 * Find by email
 * success() and error() functions required in opts
 */ 
var findByEmail = function(email, opts) {
  	var query = new model.parse.Query(Users);
  	query.equalTo("email", email);
	query.first(opts);
}

/**
 * Create new user
 * success() and error() functions required in opts
 */ 
var storeUserDetails = function(opts) {
	console.log("storeUserDetails");
	findByEmail(opts.user_data.email, {
		success: function(object) {
			var u = null;
			console.log("storeUserDetails1");

			if (object) {
				console.log("storeUserDetails2");

				u = object;
			} else {
				console.log("storeUserDetails3");

				u = new Users();
				opts.new_user_callback ? opts.new_user_callback(opts.user_data.email, opts.user_data.given_name) : null;
					console.log("storeUserDetails4");

			}
				console.log("storeUserDetails5");

			u.set(opts.user_data);
			u.save(null, opts);
	console.log("storeUserDetails6");

		},
		error: function(error) {
			console.log("Error: " + error.code + " " + error.message);
			if (opts.error) {
				opts.error(error);	
			}
		}
	});
}

/**
 * fins the details of the user given in opts.objectId, and runs opts.success() or opts.error()
 */
var getUserDetails = function(opts) {
  	var query = new model.parse.Query(Users);
  	query.get(opts.object_id, opts);
}

exports.findByEmail = findByEmail;
exports.storeUserDetails = storeUserDetails;
exports.getUserDetails = getUserDetails;

