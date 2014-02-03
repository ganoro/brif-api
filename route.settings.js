var config = require('./config.js');
var $ = require('jquery').create();
var model = require('./model.settings.js');

var onSocketSettingsSet = function (socket, data, user) {
	console.log("onSocketSettingsSet");
	if (data.key == null) {
		// TODO internal error
	}
	settingsSet(socket, data, user);
}

var onSocketSettingsGet = function (socket, data, user) {
	console.log("onSocketSettingsGet");
	if (data.key == null) {
		// TODO internal error
	}
	settingsGet(socket, data, user);
}

var settingsSet = function(socket, data, user) {
	model.store(user.objectId, data.key, data.value, {
		success : function(r) {
			socket.emit('settings:set', {data : {key : data.key, value : data.value}});
		}, 
		error : function(r, e) {
			socket.emit('settings:set', { error  : e });
		}
	})
}

var settingsGet = function(socket, data, user) {
	model.findByKey(user.objectId, data.key, {
		success : function(r) {
			var v = r ? r.get("value") : data.default ? data.default : null;
			socket.emit('settings:get', {data : {key : data.key, value : v}});		
		},
		error : function(r, e) {
			socket.emit('settings:get', {error : e });
		}
	})
}

// exports public functions
module.exports = {
	onSocketSettingsSet : onSocketSettingsSet,
	onSocketSettingsGet : onSocketSettingsGet
};
