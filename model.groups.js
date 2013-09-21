var model = require('./model.base.js');

/**
 * initialize parse app
 */ 
var Groups = model.parse.Object.extend("Groups");

/**
 * Find a list of groups by user_id
 * success() and error() functions required in opts
 */ 
var findByUser = function(user_id, opts) {
  	var query = new model.parse.Query(Groups);
  	query.equalTo("user_id", user_id);
  	query.limit(opts.per_page).skip(opts.page*opts.per_page).descending("updatedBy");
	query.find(opts);
}
 
/**
 * Find a the data of a specific group
 * success() and error() functions required in opts
 */ 
var findByGroupId = function(opts) {
  	var query = new model.parse.Query(Groups);
	query.get(opts.object_id, opts);
}

/**
 * Updates a group unseen field
 */
var updateGroup = function(group_id, unseen, user_id, callback) {
	console.log("updateGroup()")
	var opts = {
		object_id : group_id,
		unseen : unseen,
		user_id : user_id,
		callback: callback,
		success: function(group) {
			console.log(group.get("user_id"));
			console.log(user_id);
			console.log(callback);
			console.log(unseen);
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
		  		console.log()
		  		// TODO
		  	}
		},
		error: function(group, error) {
			// TODO
			
		}
	};
	findByGroupId(opts);
}

module.exports = {
	findByUser : findByUser,
	findByGroupId : findByGroupId,
	updateGroup : updateGroup
}
