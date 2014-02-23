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

// exports public functions
module.exports = {
  fetchForEmail : fetchForEmail,
  create : create,
  remove : remove
}
