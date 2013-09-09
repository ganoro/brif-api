var minpubsub = require('minpubsub/minpubsub');
var $ = require('jquery').create();

var nots = {};

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

var onSocketSetup = function(socket, data) {
	console.log("connected to : " + socket.id);
	console.log("email : " + data.email);
	setupClient(socket.id, data.email);
}

var onSocketSubscribeGroupsListener = function(socket, data) {
	console.log("onSocketSubscribeGroupsListener")
	if (data.email == null) {
		// TODO internal error
	}
  	subscribeGroupsListener(socket.id, data.email, function() {
		socket.emit('groups:change', { type : "group", data : data });
	});
}

var onSocketUnsubscribeGroupsListener = function(socket, data) {
	console.log("onSocketUnsubscribeGroupsListener")
  	console.log(data.email);
  	console.log(socket.id);

	if (data.email == null) {
		// TODO internal error 
	}
  	unsubscribeGroupsListener(socket.id, data.email);
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
  	console.log(data.email);
  	console.log(socket.id);	
  	unsubscribeMessagesListener(socket.id, data.email, data.group_id);
}

var onSocketDisconnect = function(socket) {
	unsubscribeAllTopicsToClient(socket.id);
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

var unsubscribeAllTopicsToClient = function(email, client_id) {
	for (var topic in nots[email].clients[client_id].topics) {
		var handler = resolveHandler(client_id, email, topic);
		minpubsub.unsubscribe(handler);
	}

	delete nots[email].clients[client_id];
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
 * Exports
 */
exports.notify = notify;
exports.onSocketSetup = onSocketSetup;
exports.onSocketSubscribeGroupsListener = onSocketSubscribeGroupsListener;
exports.onSocketUnsubscribeGroupsListener = onSocketUnsubscribeGroupsListener;
exports.onSocketSubscribeMessagesListener = onSocketSubscribeMessagesListener;
exports.onSocketUnsubscribeMessagesListener = onSocketUnsubscribeMessagesListener;
exports.onSocketDisconnect = onSocketDisconnect;
