var model = require('./model.base.js');

/**
 * initialize parse app
 */ 
var Groups = model.parse.Object.extend("Groups");

/**
 * Find a list of groups by user_id
 * success() and error() functions required in opts
 */ 
exports.findByUser = function(user_id, opts) {
  	var query = new model.parse.Query(Groups);
  	query.equalTo("user_id", user_id);
  	query.limit(opts.per_page).skip(opts.page*opts.per_page);
	query.find(opts);
}
 
/**
 * Find a the data of a specific group
 * success() and error() functions required in opts
 */ 
exports.findByGroupId = function(opts) {
  	var query = new model.parse.Query(Groups);
	query.get(opts.object_id, opts);
}
 
