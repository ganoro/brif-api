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
var storeUserDetails = function(user_data, opts) {
	console.log("storeUserDetails");
	console.log (user_data);
	findByEmail(user_data.email, {
  		user_data : user_data,
		success: function(object) {
			debugger;
			var u = (object ? object : new Users());
			u.set(this.user_data);
			u.save(null, opts);
		},
		error: function(error) {
			console.log("Error: " + error.code + " " + error.message);
		}
	});
}

/**
 * returns the user id to callback(objectId)
 */
var getUserId = function(email, callback) {
	findByEmail(email, {
		success : function(user) {
			callback(user.id);
		}
	});
}

exports.findByEmail = findByEmail;
exports.storeUserDetails = storeUserDetails;
exports.getUserId = getUserId;
