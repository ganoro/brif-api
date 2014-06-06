var model = require('./model.base.js');
var $ = require('jquery').create();

/**
 * initialize parse app
 */
var Tasks = model.parse.Object.extend("TaskLists");

/**
 * fetch all task files for a given Email
 * success() and error() functions required in opts
 * paremetrs required - email
 */ 
var fetchForEmail = function(opts) {
  console.log("fetchForEmail()");
  var query = new model.parse.Query(Tasks);
  query.select(['google_file_id', 'recipients']);
  query.equalTo("recipients", opts.email);
  query.find(opts);
}

/**
 * Create a new task document
 * success() and error() functions required in opts
 * paremetrs required - google_file_id, recipients
 */ 
var create = function(opts) {
  console.log("create()");
  var task = new Tasks();
  task.set({
    recipients : opts.recipients,
    google_file_id : opts.google_file_id
  });
  task.save(null, opts);
}

/**
 * Remove an exisiting task document
 * success() and error() functions required in opts
 * paremetrs required - recipients
 */ 
var remove = function(opts) {
  console.log("remove()");

  var query = new model.parse.Query(Tasks);
  query.equalTo("google_file_id", opts.google_file_id);
  query.first({
    opts : opts,
    success : function(object) {
      object.destroy(opts);
    },
    error: opts.error
  });

}


/**
 * Update a given repository with permissions
 * success() and error() functions required in opts
 * paremetrs required - share or unshare
 */ 
var permissions = function(opts) {
  console.log("permissions()");

  var isShare = (opts.share != null);
  var id = opts.share || opts.unshare;
  var email = opt.email;

  var query = new model.parse.Query(Tasks);
  query.equalTo("google_file_id", opts.google_file_id);
  query.first({
    opts : opts,
    success : function(object) {
      var updated = object.get('recipients');
      var updated_ids = object.get('google_recipients_ids');
      var index = $.inArray(email, updated);
      if (isShare) {
        if (index==-1) {
          updated.push(email);
          updated_ids.push(id);
        }
      } else {
        if (index>=0) {
          updated.splice(index, 1);
          updated_ids.splice(index, 1);
        } 
      }
      object.set('recipients', updated);
      object.set('google_recipients_ids', updated_ids);
      object.save(null, opts);
    },
    error: opts.error
  });
}

// exports public functions
module.exports = {
  fetchForEmail : fetchForEmail,
  create : create,
  remove : remove,
  permissions : permissions
}
