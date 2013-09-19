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
			var u = (object ? object : new Users());
			u.set(opts.user_data);
			u.save(null, opts);
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
 * returns the user id to callback(objectId)
 */
var getUserId = function(email, callback) {
	findByEmail(email, {
		success : function(user) {
			callback(user.id);
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
exports.getUserId = getUserId;
exports.getUserDetails = getUserDetails;

