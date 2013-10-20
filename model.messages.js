var model = require('./model.base.js');
var $ = require('jquery').create();

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

  var Messages = model.parse.Object.extend("Messages" + "_" + opts.user_id);
  var query = new model.parse.Query(Messages);
  query.equalTo("original_recipients_id", opts.original_recipients_id)
    .descending("sent_date")
    .limit(opts.per_page)
    .skip(opts.page*opts.per_page);

	query.find(opts);
}

/**
 * Find unread messages by user id and array of google_msg_id
 * success() and error() functions required in opts
 * paremetrs required - google_msg_id (array)
 */ 
exports.findByGoogleMsgId = function(opts) {
	console.log("findByGoogleMsgId()");
  console.log(opts.google_msg_id);
  console.log(opts.user_id);

  var queries = [];
  for (var i = 0; i < opts.google_msg_id.length; i++) {
    var Messages = model.parse.Object.extend("Messages" + "_" + opts.user_id);
    var query = new model.parse.Query(Messages);
  	query.equalTo("google_msg_id", opts.google_msg_id[i]);
  	console.log(opts.google_msg_id[i]);
  	queries.push(query);
  };
  var agg = model.parse.Query.or.apply(null, queries);
	agg.find(opts);
}

/**
 * Find unread messages by user id and array of google_msg_id
 * success() and error() functions required in opts
 * paremetrs required - google_msg_id (array)
 */ 
exports.fetchAll = function(opts) {
  console.log("getLatests()");
  console.log(opts.unread_per_page);
  console.log(opts.read_per_page);
  console.log(opts.google_msg_id); // unread messages
  console.log(opts.user_id);

  var Messages = model.parse.Object.extend("Messages" + "_" + opts.user_id);
  var query = new model.parse.Query(Messages);
  query.limit(opts.unread_per_page + opts.unread_per_page);
  query.find({
    success: function(results) {
      for (var i = 0; i < results.length; i++) {
        var m = results[i];
          if ($.inArray()) {

          }
      };
      console.log(results);
    },

    error: function(error) {
      // error is an instance of Parse.Error.
    }
  });

}


