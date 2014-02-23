var config = require('./config.js');
var $ = require('jquery').create();
var tasks_model = require('./model.tasks.js');

var onSocketTasksList = function (socket, data, user) {
	console.log("onSocketTasksList");
	tasks_model.fetchForEmail({
		email : user.email,
		success : function(results) {
			return socket.emit('tasks:list', { data : results });
		},
		error : function() {
			return socket.emit('tasks:list', { error : arguments });
		}
	});
}

var onSocketTasksCreate = function (socket, data, user) {
	console.log("onSocketTasksCreate");
	tasks_model.create({
		recipients : data.recipients,
		google_file_id : data.google_file_id,
		success : function(results) {
			return socket.emit('tasks:create', { data : results });
		},
		error : function() {
			return socket.emit('tasks:create', { error : arguments });
		}
	});	
}

var onSocketTasksRemove = function (socket, data, user) {
	console.log("onSocketTasksRemove");
	tasks_model.remove({
		google_file_id : data.google_file_id,
		success : function(results) {
			return socket.emit('tasks:remove', { data : results });
		},
		error : function() {
			return socket.emit('tasks:remove', { error : arguments });
		}
	});	
}

// exports public functions
module.exports = {
	onSocketTasksList : onSocketTasksList,
	onSocketTasksCreate : onSocketTasksCreate,
	onSocketTasksRemove : onSocketTasksRemove
};
