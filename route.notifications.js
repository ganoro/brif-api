var minpubsub = require('minpubsub/minpubsub');
var $ = require('jquery').create();

var nots = {};
var model = {};
model['users'] = require('./model.users.js');
model['groups'] = require('./model.groups.js');

/**
 * @api POST /notification/notify 
 * Enables Nix to notify clients about change events 
 */
var notify = function(req, res){
	// notification params
	var email = req.body.email;
	var type = req.body.type;

	if (type == null || email == null) {
		sendUnsupportedOperation(res, "missing type and email fields");
		return;
	}

	if (type == "messages") {
		var group_id = req.body.group_id;
		var message = req.body.message;
		if (group_id == null || message == null) {
			sendUnsupportedOperation(res, "missing group_id and message fields");
			return;
		}
		notifyMessagesListsners(email, group_id, message);

	} else if (type == "groups") {
		var message = req.body.message;
		if (message == null) {
			sendUnsupportedOperation(res, "missing message field");
			return;
		}
		notifyGroupListsners(email, message);
	}

	res.send("fuck ya!");
};

var sendUnsupportedOperation = function(res, msg) {
	res.status(400).send(JSON.stringify({ error: "Unsupported operation", message : msg}));		
}

var notifyGroupListsners = function(email, msg) {
	console.log("notifyGroupListsners");

	if (typeof nots[email] === "undefined") {
		return;
	}

	console.log(nots[email].clients);
	for (var client_id in nots[email].clients) {
		var topic = groupsTopicName(client_id, email);
		console.log(topic);
		console.log(msg);
		minpubsub.publish(topic, [ msg ]);
	}
}

var notifyMessagesListsners = function(email, group_id, msg) {
	if (typeof nots[email] === "undefined") {
		return;
	}

	for (var client_id in nots[email].clients) {
		var topic = messagesTopicName(client_id, email, group_id);
		minpubsub.publish(topic, msg);
	}
}

/**
 * On Socket messages
 */
var onSocketSetup = function(socket, data) {
	console.log("connected to : " + socket.id + ", with email : " + data.email);
	setupClient(socket.id, data.email);
	model['users'].getUserId(data.email, function(objectId) {
		console.log("objectId: " + objectId);
		socket.set('userId', objectId); 
	})
}

var onSocketDisconnect = function(socket) {
	unsubscribeAllTopicsToClient(socket.id);
}

var onSocketSubscribeGroupsListener = function(socket, data) {
	console.log("onSocketSubscribeGroupsListener")
  	subscribeGroupsListener(socket.id, data.email, function(msg) {
		socket.emit('groups:change', { type : "group", data : data, message : msg });
	});
}

var onSocketUnsubscribeGroupsListener = function(socket, data) {
	console.log("onSocketUnsubscribeGroupsListener")
  	unsubscribeGroupsListener(socket.id, data.email);
}

var onSocketGroupsInsert = function(socket, data) {
	if (data.info == null) {
		// TODO internal error
	}

	groupsInsert(socket.id, data);
}

var onSocketGroupsSearch = function(socket, data) {
	console.log("onSocketGroupsSearch")
	if (data.per_page == null || data.page == null) {
		// TODO internal error
	}

	socket.get("userId", function(err, id) {
		console.log("user - " + id);
		groupsSearch(socket, id, data);
	});
}

var onSocketSubscribeMessagesListener = function(socket, data) {
	if (data.email == null || data.group_id == null) {
		// TODO internal error 
	}
  	console.log(data.email);	
  	subscribeMessagesListener(socket.id, data.email, data.group_id, function() {
		socket.emit('messages:change', { type : "message", data : data });
	});
}

var onSocketUnsubscribeMessagesListener = function(socket, data) {
	if (data.email == null) {
		// TODO internal error 
	}
  	unsubscribeMessagesListener(socket.id, data.email, data.group_id);
}

var onSocketMessagesInsert = function(socket, data) {

}

var onSocketMessagesSearch = function(socket, data) {

}

var groupsTopicName = function(client_id, email) {
	return email + "/" + client_id + "/g";
}

var messagesTopicName = function(client_id, email, group_id) {
	return email + "/" + client_id + "/" + group + "/g";
}

var registerHandler = function(email, client_id, topic, handler) {
	nots[email].clients[client_id].topics[topic] = handler;
}

var resolveHandler = function(client_id, email, topic) {
	return nots[email].clients[client_id].topics[topic];
}

var setupClient = function(client_id, email) {
	nots[email] = nots[email] || { clients : {} };
	nots[email].clients[client_id] = nots[email].clients[client_id] || { topics : [] };
}

var subscribeGroupsListener = function(client_id, email, callback) {	
	var topic = groupsTopicName(client_id, email);
	var handler = minpubsub.subscribe(topic, function(msg){
		console.log("[" + topic + "] is executing with message " + msg);
		callback(msg);
	});
	registerHandler(email, client_id, topic, handler);
}

var unsubscribeGroupsListener = function(client_id, email) {
	var topic = groupsTopicName(client_id, email);
	var handler = resolveHandler(client_id, email, topic);
	if (handler) {
		minpubsub.unsubscribe(handler);	
	}
};

var groupsInsert = function(client_id, data) {
	// TODO
}

var groupsSearch = function(socket, user_id, data) {
	var per_page = data.per_page;
	var page = data.page;

	model['groups'].findByUser(user_id, {
		per_page : per_page, 
		page : page, 
		success : function(data) {
			socket.emit('groups:fetch', { data : data });
		}
	});
}

var subscribeMessagesListener = function(client_id, email, group_id, callback) {	
	var topic = messagesTopicName(client_id, email, group_id);
	var handler = minpubsub.subscribe(topic, function(msg){
		console.log("[" + topic + "] is executing with message " + msg);
		callback(msg);
	});
	registerHandler(email, client_id, topic, handler);
}

var unsubscribeMessagesListener = function(client_id, email, group_id) {
	var topic = messagesTopicName(client_id, email, group_id);
	var handler = resolveHandler(client_id, email, topic);
	if (handler) {
		minpubsub.unsubscribe(handler);
	}
};

var messagesInsert = function(client_id, data) {
	// TODO
}

var messagesSearch = function(client_id, data) {
	// TODO
}

var unsubscribeAllTopicsToClient = function(email, client_id) {
	if (!nots[email] || !nots[email].clients) {
		console.log("client is missing in notifications array");
		return;
	}
	for (var topic in nots[email].clients[client_id].topics) {
		var handler = resolveHandler(client_id, email, topic);
		minpubsub.unsubscribe(handler);
	}

	delete nots[email].clients[client_id];
}

/**
 * Exports
 */
exports.notify = notify;

exports.onSocketSetup = onSocketSetup;
exports.onSocketDisconnect = onSocketDisconnect;

exports.onSocketSubscribeGroupsListener = onSocketSubscribeGroupsListener;
exports.onSocketUnsubscribeGroupsListener = onSocketUnsubscribeGroupsListener;
exports.onSocketGroupsInsert = onSocketGroupsInsert;
exports.onSocketGroupsSearch = onSocketGroupsSearch;

exports.onSocketSubscribeMessagesListener = onSocketSubscribeMessagesListener;
exports.onSocketUnsubscribeMessagesListener = onSocketUnsubscribeMessagesListener;
exports.onSocketMessagesInsert = onSocketMessagesInsert;
exports.onSocketMessagesSearch = onSocketMessagesSearch;
