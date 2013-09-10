var model = require('./model.base.js');

/**
 * initialize parse app
 */ 
var Users = model.parse.Object.extend("Groups");

/**
 * Find by email
 * success() and error() functions required in opts
 */ 
exports.findByUser = function(user_id, opts) {
	console.log("per_page " + opts.per_page ;
  	console.log("limit " + (opts.page - 1)*opts.per_page);

  	var query = new model.parse.Query(Users);
  	query.equalTo("user", user_id);
  	query.limit(opts.per_page).skip((opts.page - 1)*opts.per_page);
	query.find(opts);
}




 