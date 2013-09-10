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

// returns the user id to callback(objectId)
var getUserId = function(email, callback) {
	findByEmail(email, {
		success : function(user) {
			callback(user.id);
		}
	});
}

exports.findByEmail = findByEmail;
exports.getUserId = getUserId;
