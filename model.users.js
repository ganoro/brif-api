var model = require('./model.base.js');

/**
 * initialize parse app
 */ 
var Users = model.parse.Object.extend("Users");

/**
 * Find by email
 * success() and error() functions required in opts
 */ 
exports.findByEmail = function(opts) {
  	var query = new model.parse.Query(Users);
  	query.equalTo("email", email);
	query.first(opts);
}




 