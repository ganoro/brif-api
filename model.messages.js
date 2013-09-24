var model = require('./model.base.js');

var Messages = model.parse.Object.extend("Messages");

/**
 * Find by original_recipients_id
 * success() and error() functions required in opts
 * paremetrs required - original_recipients_id, user_id
 */ 
exports.findByOriginalRecipientsId = function(opts) {
	console.log("findByOriginalRecipientsId()");
  	console.log(opts.original_recipients_id);
  	console.log(opts.user_id);
  	console.log(opts.per_page);
  	console.log(opts.page*opts.per_page);

  	var query = new model.parse.Query(Messages);
  	query.equalTo("original_recipients_id", opts.original_recipients_id)
  		.equalTo("user_id", opts.user_id)
  		.limit(opts.per_page)
  		.skip(opts.page*opts.per_page);

	query.find(opts);
}

/**
 * Find unread messages by user id
 * success() and error() functions required in opts
 * paremetrs required - user_id
 */ 
exports.findUnreadByUserId = function(opts) {
	console.log("findUnreadByUserId()");
  	console.log(opts.user_id);
  	console.log(opts.per_page);
  	console.log(opts.page*opts.per_page);

  	var query = new model.parse.Query(Messages);
  	query.equalTo("seen", false)
  		.equalTo("user_id", opts.user_id)
  		.limit(opts.per_page)
  		.skip(opts.page*opts.per_page);

	query.find(opts);
}



 