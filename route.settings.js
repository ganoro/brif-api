var config = require('./config.js');
var $ = require('jquery').create();
var model = require('./model.settings.js');
var notifications = require('./route.notifications.js');

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

var onSocketSettingsClear = function (socket, data, user) {
	console.log("onSocketSettingsClear");
	settingsClear(socket, data, user);
}

var settingsSet = function(socket, data, user) {
	model.store(user.objectId, data.key, data.value, {
		success : function(r) {
			var event = {};
			event[data.key] = data.value;
			socket.emit('settings:set', { data  : event });
			notifications.notifyMessagesListsners('settings:event', user.email, { data : event })
		}, 
		error : function(r, e) {
			socket.emit('settings:set', { error  : e });
		}
	})
}

var settingsClear = function(socket, data, user) {
	model.clear(user.objectId, {
		success : function(r) {
			socket.emit('settings:clear', { data  : {} });
		}, 
		error : function(r, e) {
			socket.emit('settings:clear', { error  : e });
		}
	})
}

var settingsGet = function(socket, data, user) {
	model.find(user.objectId, data.key, {
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
	onSocketSettingsGet : onSocketSettingsGet,
	onSocketSettingsClear : onSocketSettingsClear	
};
