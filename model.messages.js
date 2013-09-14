var model = require('./model.base.js');

var Messages = model.parse.Object.extend("Messages");

/**
 * Find by group id
 * success() and error() functions required in opts
 * paremetrs required - group_id, user_id
 */ 
exports.findByGroupId = function(opts) {
  	var query1 = new model.parse.Query(Messages);
  	query1.equalTo("thread", opts.group_id);

  	var query2 = new model.parse.Query(Messages);
  	query2.equalTo("user", opts.user_id);

	var query = model.parse.Query.and(query1, query2);
  	query.limit(opts.per_page).skip(opts.page*opts.per_page);

	query.find(opts);
}
 