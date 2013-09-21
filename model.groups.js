var model = require('./model.base.js');

/**
 * initialize parse app
 */ 
var Groups = model.parse.Object.extend("Groups");

/**
 * Find a list of groups by user_id
 * success() and error() functions required in opts
 */ 
exports.findByUser = function(user_id, opts) {
  	var query = new model.parse.Query(Groups);
  	query.equalTo("user_id", user_id);
  	query.limit(opts.per_page).skip(opts.page*opts.per_page).descending("updatedBy");
	query.find(opts);
}
 
/**
 * Find a the data of a specific group
 * success() and error() functions required in opts
 */ 
exports.findByGroupId = function(opts) {
  	var query = new model.parse.Query(Groups);
	query.get(opts.object_id, opts);
}

/**
 * Updates a group unseen field
 */
exports.updateGroup = function(group_id, unseen, user_id, callback) {
	var ops = {
		object_id : group_id,
		unseen : unseen,
		user_id : user_id,
		callback: callback,
		success: function(group) {
		  	if (group.get("user_id") == user_id) {
		  		group.set("unseen", unseen);
		  		group.save(null, {
					success: function(group) {
						callback(group);  	
					},
					error: function(group, error) {
						// TODO
					}
				});
		  	} else {
		  		// TODO
		  	}
		},
		error: function(group, error) {
			// TODO
			
		}
	};
	findByGroupId(opts);
}
