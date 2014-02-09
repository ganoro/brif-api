var model = require('./model.base.js');

/**
 * initialize parse app
 */ 
var Settings = model.parse.Object.extend("Settings");

/**
 * Get by user_id & key
 * success and errors should be supplied in opts
 */ 
var find = function(user_id, key, opts) {
	console.log("find()");

  	var query = new model.parse.Query(Settings);
  	query.equalTo("user_id", user_id).equalTo("key", key)  	
	query.first(opts);
}

/**
 * Set a pair (key value) in storage
 */
var store = function(user_id, key, value, opts) {
	console.log("store()");

	find(user_id, key, {
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

/**
 * Set a pair (key value) in storage
 */
var clear = function(user_id, opts) {
	console.log("clear()");

	getAllSettings(user_id, {
		success : function(r) {
			console.log(r)
			if (r != null) {
				for (var i = r.length - 1; i >= 0; i--) {
					console.log(r[i]);
					r[i].destroy();
				};
			}
			opts.success ? opts.success() : null;
		},
		error : function(r, e) {
			opts.error ? opts.error(e) : null;
		}
	});
}


var getAllSettings = function(user_id, opts) {
	console.log("getAllSettings()");

  	var query = new model.parse.Query(Settings);
  	query.equalTo("user_id", user_id);
	query.find(opts);
}

// exports public functions
module.exports = {
  find : find,
  store : store,
  clear : clear,  
  getAllSettings : getAllSettings
}
