var config = require('./config.js');
var $ = require('jquery').create();
var tasks_model = require('./model.tasks.js');
var notifications = require('./route.notifications.js');

var onSocketTasksList = function (socket, data, user) {
	console.log("onSocketTasksList");
	tasks_model.fetchForEmail({
		email : user.email,
		success : function(results) {
			return socket.emit('repositories:list', { data : results });
		},
		error : function() {
			return socket.emit('repositories:list', { error : arguments });
		}
	});
}

var onSocketTasksCreate = function (socket, data, user) {
	console.log("onSocketTasksCreate");
	tasks_model.create({
		recipients : data.recipients,
		google_file_id : data.google_file_id,
		success : function(results) {
			return socket.emit('repositories:create', { data : results });
		},
		error : function() {
			return socket.emit('repositories:create', { error : arguments });
		}
	});	
}

var onSocketTasksRemove = function (socket, data, user) {
	console.log("onSocketTasksRemove");
	tasks_model.remove({
		google_file_id : data.google_file_id,
		success : function(result) {
			console.log(result)
			socket.emit('repositories:remove', { data : result });
			$.each(result.recipients, function(i, email) {
				notifications.notifyMessagesListsners('repositories:event', email, { 
					type: 'removal', 
					google_file_id : google_file_id
				})
			});
		},
		error : function() {
			socket.emit('repositories:remove', { error : arguments });
		}
	});	
}

var onSocketTasksPermissions = function (socket, data, user) {
	console.log("onSocketTasksPermissions");
	tasks_model.permissions({
		google_file_id : data.google_file_id,
		share : data.share,
		unshare : data.unshare,
		success : function(result) {
			socket.emit('repositories:permissions', { data : result });
			$.each(result.get("recipients"), function(i, email) {
				notifications.notifyMessagesListsners('repositories:event', email, { 
					type: 'permissions:change', 
					google_file_id : result.get("google_file_id")
				})
			});
		},
		error : function() {
			socket.emit('repositories:permissions', { error : arguments });
		}
	});	
}

// exports public functions
module.exports = {
	onSocketTasksList : onSocketTasksList,
	onSocketTasksCreate : onSocketTasksCreate,
	onSocketTasksRemove : onSocketTasksRemove,
	onSocketTasksPermissions : onSocketTasksPermissions 
};
