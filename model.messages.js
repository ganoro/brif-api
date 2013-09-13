var model = require('./model.base.js');

var Messages = model.parse.Object.extend("Messages");

/**
 * Find by group id
 * success() and error() functions required in opts
 * paremetrs required - group_id, user_id
 */ 
exports.findByGroupId = function(opts) {
  	var query = new model.parse.Query(Messages);
  	query.equalTo("thread", opts.group_id);
  	query.equalTo("user", opts.user_id);
  	query.limit(opts.per_page).skip(opts.page*opts.per_page);
	query.find(opts);
}
 