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
  if (opts.recipients_id == "0") {
    query.exists("unsubscribe");
  } else {
    query.equalTo("recipients_id", opts.recipients_id);  
  }
  
  query.descending("sent_date")
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
    if (opts.is_only_promotions) {
      query.exists("unsubscribe");
    }
    if (opts.is_select_special) {
      query.select("google_msg_id", "google_trd_id", "recipients", "recipients_names", "recipients_id", "message_id", "sent_date");
    }
    if (opts.is_select_timeline) {
      query.select('google_trd_id', 'recipients_id', 'recipients', 'recipients_names', 'sent_date', 'intro', 'subject', 'message_id');
    }
  	query.equalTo("google_msg_id", opts.google_msg_id[i].toString());
  	queries.push(query);
  };
  var agg = model.parse.Query.or.apply(null, queries);
  if (opts.is_select_special) {
    agg.select("google_msg_id", "google_trd_id", "recipients", "recipients_names", "recipients_id", "message_id", "sent_date");
  }
  agg.find(opts);       
}

/**
 * Fetch messages by user id and given message id. Returns the latest messages
 * success() and error() functions required in opts
 * paremetrs required - google_msg_id
 */ 
var fetchAfterMsgId = function(opts) {
  console.log("fetchAfterMsgId()");
  if (!opts.message_id) {
    return opts.success([]);
  }
  
  var Messages = model.parse.Object.extend("Messages_" + opts.user_id);
  var query = new model.parse.Query(Messages);
  query.greaterThan("message_id", opts.message_id);
  query.limit(20);
  query.find(opts);    
}

/**
 * Find messages by user id and thread id
 * success() and error() functions required in opts
 * paremetrs required - google_trd_id 
 */ 
var findByGoogleTrdId = function(opt) {
  console.log("findByGoogleTrdId()");

  var Messages = model.parse.Object.extend("Messages_" + opt.user_id);
  var query = new model.parse.Query(Messages);
  query.equalTo("google_trd_id", opt.google_trd_id)
    .descending("sent_date")
    .limit(opt.per_page)
    .select("google_msg_id", "message_id", "sent_date", "content", "intro", "attachments", "sender_name", "sender_email", "recipients_names", "unsubscribe")
    .skip(opt.page*opt.per_page);
  if (!opt.retry) {
    query.equalTo("recipients_id", opt.recipients_id);
  }  
  query.find(opt);
}

/**
 * Find messages of the first page by user id and thread id
 * success() and error() functions required in opts
 * paremetrs required - google_trd_id 
 */ 
var findFirstPageByGoogleTrdId = function(opt) {
  console.log("findFirstPageByGoogleTrdId()");

  var Messages = model.parse.Object.extend("Messages_" + opt.user_id);
  var query = new model.parse.Query(Messages);
  query.equalTo("google_trd_id", opt.google_trd_id)
    .descending("sent_date")
    .limit(20)
    .select("google_msg_id", "message_id", "sent_date", "content", "intro", "attachments", "sender_name", "sender_email", "recipients_names", "unsubscribe");
  if (!opt.retry) {
    query.equalTo("recipients_id", opt.recipients_id);
  }  
  query.find(opt);    
}


/**
 * Find messages of the first page by user id and thread id
 * success() and error() functions required in opts
 * paremetrs required - google_trd_id 
 */ 
var findPreviousThreads = function(opt) {
  console.log("findPreviousThreads()");

  var Messages = model.parse.Object.extend("Messages_" + opt.user_id);
  var query = new model.parse.Query(Messages);
  query.notContainedIn("google_trd_id", opt.google_trd_id)
    .equalTo("recipients_id", opt.recipients_id)
    .descending("sent_date")
    .select('google_trd_id', 'recipients_id', 'recipients', 'recipients_names', 'sent_date', 'intro', 'subject')
    .limit(30);
  query.find(opt);    
}

/**
 * Find messages near a given google message id
 * success() and error() functions required in opts
 * paremetrs required - google_msg_id  and limit
 */ 
var findNear = function(opt) {
  console.log("findNear()");

  var Messages = model.parse.Object.extend("Messages_" + opt.user_id);
  var query = new model.parse.Query(Messages);
  query.greaterThanOrEqualTo("google_msg_id", opt.google_msg_id)
    .ascending("google_msg_id")
    .equalTo("recipients_id", opt.recipients_id)
    .limit(opt.limit);
  query.find({
    success : function(resultGreater) {
      var query = new model.parse.Query(Messages);
      query.lessThan("google_msg_id", opt.google_msg_id)
        .descending("google_msg_id")
        .equalTo("recipients_id", opt.recipients_id)
        .limit(opt.limit);
        query.find({
          success : function(resultLess) {
            opt.success ? opt.success(resultLess.concat(resultGreater)) : null;
          }, 
          error : function() {
            opt.error ? opt.error(arguments) : null;
          }
        });
    },
    error : function() {
      opt.error ? opt.error(arguments) : null;
    }
  });    
}

var findLatest = function(opts) {
  console.log("findLatest()");
  console.log('opts.contacts: ', opts.contacts);
  if (!opts.contacts || opts.contacts.length == 0) {
    return opts.success([]);
  }

  // search latests messages in list
  var Messages = model.parse.Object.extend("Messages_" + opts.user_id);
  var query = new model.parse.Query(Messages);

  // latest week
  var now = new Date();
  var weeksAgo = new Date(now.setDate(now.getDate() - 60));
  query.greaterThan('sent_date', {"__type":"Date", "iso": weeksAgo.toISOString()})

  // containing contacts
  var pattern = '.*(' + opts.contacts.join('|').replace(/\@/g, '\\@').replace(/\./g, '\\.') + ').*';
  query.matches('recipients', '.*' + pattern + '.*');
  query.descending('sent_date').limit(opts.limit);
  query.find(opts)
}

/**
 * Fetch all messages by user id, omit all promotional messages 
 * success(), error(), unseen_length, seen_length, google_msg_id[] required in opts
 */ 
var fetchAll = function(opts) {
  console.log("fetchAll()");

  // search latests messages in list
  var Messages = model.parse.Object.extend("Messages_" + opts.user_id);
  var query = new model.parse.Query(Messages);
  if (opts.sooner_than) {
    query.lessThan("message_id", opts.sooner_than);
  }
   
  query.limit(60).doesNotExist("unsubscribe")
    .descending("sent_date").select('google_trd_id', 'recipients_id', 'recipients', 'recipients_names', 'sent_date', 'intro', 'subject', 'message_id');
  query.find({
    success: function(results) {
      var recipients_ids = [];
      var subset = opts.aggreagated;
      for (var i = 0; i < subset.length; i++) {
        recipients_ids.push(subset[i].get("recipients_id"));
      };

      for (var i = 0; i < results.length && recipients_ids.length < 15; i++) {
        var m = results[i];
        var rid = m.get("recipients_id");
        var idx = $.inArray(rid, recipients_ids)

        if (idx == -1) {
          recipients_ids.push(rid);
          m.set("threads", [ { google_trd_id : m.get("google_trd_id"), subject : m.get("subject") } ]);
          subset.push(m);
        } else {
          var group = subset[idx];
          var threads = group.get('threads');
          var found = false, j = threads.length;
          while (!found && j > 0){
            found = threads[--j].google_trd_id == m.get("google_trd_id");
          }
          if (!found) {
            threads.push({ google_trd_id : m.get("google_trd_id"), subject : m.get("subject") } );
          }
        }
      };
      var oldest_id = results[results.length - 1].get("message_id");
      opts.success(subset, oldest_id);
    },

    error: function(error) {
      opts.error(error);
    }
  });
}

deleteThread = function(opt) {
  console.log("deleteThread");
  var Messages = model.parse.Object.extend("Messages_" + opt.user_id);
  var query = new model.parse.Query(Messages);
  query.equalTo("google_trd_id", opt.google_trd_id)
    .descending("sent_date")
    .limit(200)
    .select("message_id");

  query.find({
    success: function(messages) {
      for (var i = messages.length - 1; i >= 0; i--) {
        messages[i].destroy({});
      };
      opt.success(messages);
    },
    error: opt.error
  });    
}

// exports public functions
module.exports = {
  fetchAll : fetchAll,
  findByGoogleMsgId : findByGoogleMsgId,
  findByGoogleTrdId : findByGoogleTrdId,
  findFirstPageByGoogleTrdId : findFirstPageByGoogleTrdId,
  findLatest : findLatest,
  findNear : findNear,
  findByRecipientsId : findByRecipientsId,
  fetchAfterMsgId : fetchAfterMsgId,
  findPreviousThreads : findPreviousThreads,
  deleteThread: deleteThread
}
