var model = require('./model.base.js');

var Messages = model.parse.Object.extend("Messages");

/**
 * Find by group id
 * success() and error() functions required in opts
 * paremetrs required - group_id, user_id
 */ 
exports.findByGroupId = function(opts) {

  	console.log(opts.group_id);
  	console.log(opts.user_id);
  	console.log(opts.per_page);
  	console.log(opts.page*opts.per_page);

  	var query = new model.parse.Query(Messages);
  	query.equalTo("group_id", opts.group_id)
  		.equalTo("user_id", opts.user_id)
  		.limit(opts.per_page)
  		.skip(opts.page*opts.per_page);

	query.find(opts);
}
 