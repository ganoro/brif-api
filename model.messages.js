var model = require('./model.base.js');
var $ = require('jquery').create();

/**
 * Find by original_recipients_id
 * success() and error() functions required in opts
 * paremetrs required - original_recipients_id, user_id
 */ 
var findByOriginalRecipientsId = function(opts) {
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
var findByGoogleMsgId = function(opts) {
	console.log("findByGoogleMsgId()");
  console.log(opts.google_msg_id);
  console.log(opts.user_id);

  var queries = [];
  for (var i = 0; i < opts.google_msg_id.length; i++) {
    var Messages = model.parse.Object.extend("Messages_" + opts.user_id);
    var query = new model.parse.Query(Messages);
  	query.equalTo("google_msg_id", opts.google_msg_id[i]);
  	console.log(opts.google_msg_id[i]);
  	queries.push(query);
  };
  var agg = model.parse.Query.or.apply(null, queries);
	agg.find(opts);
}

/**
 * Fetch all messages by user id and array of unread messages 
 * success(), error(), unseen_length, seen_length, google_msg_id[] required in opts
 */ 
var fetchAll = function(opts) {
  console.log("getLatests()");
  console.log(opts.unseen_length);
  console.log(opts.seen_length);
  console.log(opts.google_msg_id); // unread messages
  console.log(opts.user_id);

  // search latests messages in list
  var Messages = model.parse.Object.extend("Messages_" + opts.user_id);
  var query = new model.parse.Query(Messages);
   
  query.limit(opts.unseen_length + opts.seen_length)
    .descending("sent_date");
  query.find({
    success: function(results) {
      for (var i = 0; i < results.length; i++) {
        var m = results[i];
        var idx = $.inArray(m.get("google_msg_id"), opts.google_msg_id)
        if (idx != -1) {
          opts.google_msg_id.splice(idx, 1);
          m.set("unseen", true);
        } else {
          m.set("unseen", false);
        }
      };
      findByGoogleMsgId({ 
        google_msg_id : opts.google_msg_id,
        user_id : opts.user_id,
        success : function(unread) {
          for (var i = unread.length - 1; i >= 0; i--) {
            unread[i].set("unseen", true)
          };
          opts.success($.merge(results, unread));
        }, 
        error : opts.error
      });
    },

    error: function(error) {
      opts.error(error);
    }
  });

}

// exports public functions
module.exports = {
  fetchAll : fetchAll,
  findByGoogleMsgId : findByGoogleMsgId,
  findByOriginalRecipientsId : findByOriginalRecipientsId
}
