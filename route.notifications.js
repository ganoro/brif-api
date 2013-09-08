var minpubsub = require('minpubsub/minpubsub');
var $ = require('jquery').create();

var nots = {};

/**
 * Notify events
 */
var notify = function(req, res){
	// notification params
	var email = req.body.email;
	var type = req.body.type;
	var params = req.body.params;

	if (type == null || email == null || params == null) {
		res.status(400).send("unsupported event");
	}

	var opts = JSON.parse(params);
	if (type == "messages") {
		notifyMessagesListsners(email, opts.group_id, opts.message);
	} else {
		notifyGroupListsners(email, opts.message);
	}

	res.send("fuck ya!");
};

var setupClient = function(email, client_id) {
	nots[email] = nots[email] || { clients : {} };
	nots[email].clients[client_id] = nots[email].clients[client_id] || { topics : [] };
}

var groupsTopicName = function(client_id, email) {
	return email + "/" + client_id + "/g";
}

var messagesTopicName = function(client_id, email, group_id) {
	return email + "/" + client_id + "/" + group + "/g";
}

var registerHandler = function(email, client_id, topic, handler) {
	setupClient(email, client_id);
	nots[email].clients[client_id].topics[topic] = handler;
}

var resolveHandler = function(email, client_id, topic) {
	return nots[email].clients[client_id].topics[topic];
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
	minpubsub.unsubscribe(handler);
};

var subscribeMessageListener = function(client_id, email, group_id, callback) {	
	var topic = messagesTopicName(client_id, email, group_id);
	var handler = minpubsub.subscribe(topic, function(msg){
		console.log("[" + topic + "] is executing with message " + msg);
		callback(msg);
	});
	registerHandler(email, client_id, topic, handler);
}

var unsubscribeMessageListener = function(client_id, email, group_id) {
	var topic = messagesTopicName(client_id, email, group_id);
	var handler = resolveHandler(client_id, email, topic);
	minpubsub.unsubscribe(handler);
};

var unsubscribeAllTopicsToClient = function(email, client_id) {
	for (var topic in nots[email].clients[client_id].topics) {
		var handler = resolveHandler(client_id, email, topic);
		minpubsub.unsubscribe(handler);
	}

	delete nots[email].clients[client_id];
}

var notifyGroupListsners = function(email, msg) {
	for (var client_id in nots[email].clients) {
		var topic = groupsTopicName(client_id, email);
		minpubsub.publish(topic, msg);
	}
}

var notifyMessagesListsners = function(email, group_id, msg) {
	for (var client_id in nots[email].clients) {
		var topic = messagesTopicName(client_id, email, group_id);
		minpubsub.publish(topic, msg);
	}
}


/**
 * Exports
 */
exports.unsubscribeGroupsListener = unsubscribeGroupsListener;
exports.subscribeGroupsListener = subscribeGroupsListener;
exports.unsubscribeMessageListener = unsubscribeMessageListener;
exports.subscribeMessageListener = subscribeMessageListener;
exports.unsubscribeAllTopicsToClient = unsubscribeAllTopicsToClient;
exports.notify = notify;

