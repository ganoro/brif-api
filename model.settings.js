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


// exports public functions
module.exports = {
  findByKey : findByKey
}
