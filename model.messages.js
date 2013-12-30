var model = require('./model.base.js');
var $ = require('jquery').create();

/**
 * Find by recipients_id
 * success() and error() functions required in opts
 * paremetrs required - recipients_id, user_id
 */ 
var findByRecipientsId = function(opts) {
	console.log("findByRecipientsId()");
  console.log("recipients ", opts.recipients_id);

  var Messages = model.parse.Object.extend("Messages" + "_" + opts.user_id);
  var query = new model.parse.Query(Messages);
  query.equalTo("recipients_id", opts.recipients_id)
    .descending("sent_date")
    .limit(opts.per_page)
    .skip(opts.page*opts.per_page);

  if (opts.only_attachments) {
    query.exists("attachments");
  }

	query.find(opts);
}

/**
 * Find unread messages by user id and array of google_msg_id
 * success() and error() functions required in opts
 * paremetrs required - google_msg_id (array)
 */ 
var findByGoogleMsgId = function(opts) {
  console.log("findByGoogleMsgId()");

  if (opts.google_msg_id.length == 0) {
    return opts.success([]);
  }

  var queries = [];
  for (var i = 0; i < opts.google_msg_id.length; i++) {
    var Messages = model.parse.Object.extend("Messages_" + opts.user_id);
    var query = new model.parse.Query(Messages);
  	query.equalTo("google_msg_id", opts.google_msg_id[i]);
  	queries.push(query);
  };
  var agg = model.parse.Query.or.apply(null, queries);
  agg.find(opts);    
}

/**
 * Find messages by user id and thread id
 * success() and error() functions required in opts
 * paremetrs required - google_trd_id 
 */ 
var findByGoogleTrdId = function(opt) {
  console.log("findByGoogleTrdId()");
  console.log(opt.google_trd_id);
  console.log(opt.recipients_id);
  console.log(opt.per_page);
  console.log(opt.page);
  console.log(opt.user_id);

  var Messages = model.parse.Object.extend("Messages_" + opt.user_id);
  var query = new model.parse.Query(Messages);
  query.equalTo("google_trd_id", opt.google_trd_id)
    .equalTo("recipients_id", opt.recipients_id)
    .descending("sent_date")
    .limit(opt.per_page)
    .skip(opt.page*opt.per_page);

  query.find(opt);    
}

/**
 * Fetch all messages by user id 
 * success(), error(), unseen_length, seen_length, google_msg_id[] required in opts
 */ 
var fetchAll = function(opts) {
  console.log("fetchAll()");
  console.log(opts.user_id);

  // search latests messages in list
  var Messages = model.parse.Object.extend("Messages_" + opts.user_id);
  var query = new model.parse.Query(Messages);
   
  query.limit(40)
    .descending("sent_date");
  query.find({
    success: function(results) {
      var recipients_ids = [];
      var subset = [];

      for (var i = 0; i < results.length && subset.length < 12; i++) {
        var m = results[i];
        var rid = m.get("recipients_id");
        var idx = $.inArray(rid, recipients_ids)

        if (idx == -1) {
          recipients_ids.push(rid);
          subset.push({ 
            'recipients_id' : rid, 
            'recipients' : m.get("recipients"), 
            'recipients_names' : m.get("recipients_names"), 
            'sent_date' : m.get("sent_date")
          });
        }
      };
      opts.success(subset);
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
  findByGoogleTrdId : findByGoogleTrdId,
  findByRecipientsId : findByRecipientsId
}
