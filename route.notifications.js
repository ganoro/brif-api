var minpubsub = require('minpubsub/minpubsub');
var $ = require('jquery').create();

var nots = {};
var model = {};
model['users'] = require('./model.users.js');
model['groups'] = require('./model.groups.js');
model['messages'] = require('./model.messages.js');

/**
 * @api POST /notification/notify 
 * Enables Nix to notify sockets about change events 
 */
var notify = function(req, res){
	// notification params
	var data = req.body.data;
	var email = req.body.email;
	var entity = req.body.entity;
	var type = req.body.type;	
	if (entity == null || email == null) {
		sendUnsupportedOperation(res, "missing entity and email fields");
		return;
	}

	res.send("sending..."); // TODO send before execute?

	if (entity == "messages") {
		notifyMessagesListsners(email, data);
	}
};

var sendUnsupportedOperation = function(res, msg) {
	res.status(400).send(JSON.stringify({ error: "Unsupported operation", message : msg}));		
}

var notifyMessagesListsners = function(email, data) {
	console.log("notifyMessagesListsners");

	if (typeof nots[email] === "undefined") {
		return;
	}

	for (var client_id in nots[email].sockets) {
		var topic = messagesTopicName(client_id, email);
		minpubsub.publish(topic, [ data ]);
	}
}

/**
 * On Socket messages
 */
var onSocketSetup = function(socket, data, user) {
	console.log("connected to : " + socket.id + ", with email : " + data.email);
	setupClient(socket.id, data.email);
	model['users'].getUserId(data.email, function(objectId) {
		console.log("objectId: " + objectId);
		socket.set('user', JSON.stringify({ "objectId" : objectId, "email" : data.email }), function() {
			socket.emit('setup:completed');
		}); 
	})
}

var onSocketDisconnect = function(socket) {
	unsubscribeAllTopicsToClient(socket.id);
}

var onSocketSubscribeMessagesListener = function(socket, data, user) {
	console.log("onSocketSubscribeMessagesListener")
  	subscribeMessagesListener(socket.id, user.email, function(message) {
		socket.emit('messages:event', message);
	});
}

var onSocketUnsubscribeMessagesListener = function(socket, data, user) {
	console.log("onSocketUnsubscribeMessagesListener")
  	unsubscribeMessagesListener(socket.id, user.email);
}

var onSocketMessagesMarkAs = function(socket, data, user) {
	var messages_id = data.messages_id;
	var unseen = data.unseen;
	if (!messages_id || !unseen) {
		// TODO internal error
	}

	messagesMarkAs(socket, messages_id, unseen, user);
}

var onSocketMessagesFetch = function(socket, data, user) {
	console.log("onSocketMessagesFetch")
	if (data.per_page == null || data.page == null || data.original_recipients_id == null) {
		// TODO internal error
	}
	messagesFetch(socket, user.objectId, data);
}

var onSocketMessagesUnread = function(socket, data, user) {
	console.log("onSocketMessagesUnread()")
	if (data.per_page == null || data.page == null) {
		// TODO internal error
	}
	messagesUnread(socket, user.objectId, data);
}

var messagesTopicName = function(client_id, email) {
	return email + "/" + client_id + "/m";
}

var registerHandler = function(email, client_id, topic, handler) {
	nots[email].sockets[client_id].topics[topic] = handler;
}

var resolveHandler = function(client_id, email, topic) {
	if (nots[email]) {
		return nots[email].sockets[client_id].topics[topic];	
	} else {
		return null;
	}
}

var setupClient = function(client_id, email) {
	console.log(client_id + " " + email)
	nots[email] = nots[email] || { sockets : {} };
	nots[email].sockets[client_id] = nots[email].sockets[client_id] || { topics : [] };
}

var subscribeMessagesListener = function(client_id, email, callback) {	
	var topic = messagesTopicName(client_id, email);
	var handler = minpubsub.subscribe(topic, function(msg){
		console.log("[" + topic + "] is executing with message " + msg);
		callback(msg);
	});
	registerHandler(email, client_id, topic, handler);
}

var unsubscribeMessagesListener = function(client_id, email) {
	var topic = messagesTopicName(client_id, email);
	var handler = resolveHandler(client_id, email, topic);
	if (handler) {
		minpubsub.unsubscribe(handler);	
	}
};

var messagesFetch = function(socket, user_id, data) {
	var per_page = data.per_page;
	var page = data.page;
	var original_recipients_id = data.original_recipients_id;	

	var opts = {
		per_page : per_page, 
		page : page, 
		original_recipients_id : original_recipients_id, 
		user_id : user_id, 
		success : function(data) {
			console.log(opts);
			console.log(data);
			console.log('messages:fetch:' + opts.original_recipients_id);
			socket.emit('messages:fetch:' + opts.original_recipients_id , { data : data });
		}
	};
	model['messages'].findByOriginalRecipientsId(opts);
}

var messagesUnread = function(socket, user_id, data) {
	var per_page = data.per_page;
	var page = data.page;

	var opts = {
		per_page : per_page, 
		page : page, 
		user_id : user_id, 
		success : function(data) {
			console.log(opts);
			console.log(data);
			socket.emit('messages:unread', { data : data });
		}
	};
	model['messages'].findUnreadByUserId(opts);
}


var unsubscribeAllTopicsToClient = function(email, client_id) {
	if (!nots[email] || !nots[email].sockets) {
		console.log("client is missing in notifications array");
		return;
	}
	for (var topic in nots[email].sockets[client_id].topics) {
		var handler = resolveHandler(client_id, email, topic);
		minpubsub.unsubscribe(handler);
	}

	delete nots[email].sockets[client_id];
}

// exports public functions
module.exports = {
	notify : notify,
	onSocketSetup : onSocketSetup,
	onSocketDisconnect : onSocketDisconnect,
	onSocketSubscribeMessagesListener : onSocketSubscribeMessagesListener,
	onSocketUnsubscribeMessagesListener : onSocketUnsubscribeMessagesListener,
	onSocketMessagesFetch : onSocketMessagesFetch,
	onSocketMessagesUnread : onSocketMessagesUnread
};
