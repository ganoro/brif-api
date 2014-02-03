var model = require('./model.base.js');

/**
 * initialize parse app
 */ 
var Settings = model.parse.Object.extend("Settings");

/**
 * Get by user_id
 * success and errors should be supplied in opts
 */ 
var findByKey = function(user_id, key, opts) {
	console.log("findByKey()");

  	var query = new model.parse.Query(Settings);
  	query.equalTo("user_id", user_id).equalTo("key", key);
	query.first(opts);
}

var store = function(user_id, key, value, opts) {
	console.log("storeByKeyValue()");

	findByKey(user_id, key, {
		success : function(r) {
			if (r == null) {
				r = new Settings();
				r.set("user_id", user_id);
				r.set("key", key);
			}
			r.set("value", value);
			r.save(null, opts);
		},
		error : function(r, e) {
			opts.error ? opts.error(e) : null;
		}
	});
}

// exports public functions
module.exports = {
  findByKey : findByKey,
  store : store
}
